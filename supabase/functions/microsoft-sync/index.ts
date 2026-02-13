import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Microsoft access token (with refresh if expired)
    const msToken = await getMicrosoftAccessToken(supabase, user.id);
    if (!msToken) {
      return new Response(
        JSON.stringify({ error: "Microsoft not connected. Please connect Microsoft first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the user's Microsoft email for provider_account_email
    let msEmail: string | null = null;
    try {
      const { data: integration } = await supabase
        .from("user_integrations")
        .select("provider_email")
        .eq("user_id", user.id)
        .eq("provider", "microsoft")
        .is("disconnected_at", null)
        .maybeSingle();
      msEmail = integration?.provider_email || null;
    } catch (_) {}

    // Update sync status
    await supabase
      .from("user_integrations")
      .update({ sync_status: "syncing", sync_error: null })
      .eq("user_id", user.id)
      .eq("provider", "microsoft");

    let emailCount = 0;
    let eventCount = 0;

    // ===== Sync Outlook Mail =====
    try {
      const mailRes = await fetch(
        "https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime desc&$select=id,from,subject,bodyPreview,receivedDateTime,isRead",
        { headers: { Authorization: `Bearer ${msToken}` } }
      );

      if (mailRes.ok) {
        const mailData = await mailRes.json();
        const messages = mailData.value || [];

        // Collect all email data first
        const emailBatch: any[] = [];
        for (const msg of messages) {
          emailBatch.push({
            external_id: msg.id,
            sender: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || "Unknown",
            subject: msg.subject || "(No subject)",
            preview: msg.bodyPreview || "",
            timestamp: msg.receivedDateTime ? new Date(msg.receivedDateTime).toISOString() : new Date().toISOString(),
            is_read: msg.isRead ?? true,
          });
        }

        // Batch classify with Gemini
        const labels = await classifyEmails(emailBatch);

        // Upsert with AI labels
        for (let i = 0; i < emailBatch.length; i++) {
          const e = emailBatch[i];
          const { error: upsertError } = await supabase
            .from("emails")
            .upsert(
              {
                user_id: user.id,
                external_id: e.external_id,
                provider: "outlook",
                sender: e.sender,
                subject: e.subject,
                preview: e.preview,
                timestamp: e.timestamp,
                is_read: e.is_read,
                label: labels[i] || "Uncategorized",
                provider_account_email: msEmail,
              },
              { onConflict: "user_id,provider,external_id" }
            );

          if (!upsertError) emailCount++;
        }
      } else {
        const errText = await mailRes.text();
        console.error("Outlook mail fetch failed:", mailRes.status, errText);
      }
    } catch (mailErr) {
      console.error("Outlook mail sync error:", mailErr);
    }

    // ===== Sync Outlook Calendar =====
    try {
      const now = new Date().toISOString();
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const calRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now}&endDateTime=${futureDate}&$top=50&$orderby=start/dateTime&$select=id,subject,start,end,location,isAllDay`,
        { headers: { Authorization: `Bearer ${msToken}`, Prefer: 'outlook.timezone="UTC"' } }
      );

      if (calRes.ok) {
        const calData = await calRes.json();
        const events = calData.value || [];

        for (const event of events) {
          const startDt = event.start?.dateTime || "";
          const endDt = event.end?.dateTime || "";
          const isAllDay = event.isAllDay || false;

          // Extract date and time
          const dateStr = startDt.split("T")[0];
          const timeStr = isAllDay ? null : startDt.split("T")[1]?.substring(0, 5) || null;
          const endTime = isAllDay ? null : endDt.split("T")[1]?.substring(0, 5) || null;

          const locationStr =
            typeof event.location === "object"
              ? event.location?.displayName || null
              : event.location || null;

          const { error: upsertError } = await supabase
            .from("calendar_events")
            .upsert(
              {
                user_id: user.id,
                external_id: event.id,
                provider: "outlook",
                title: event.subject || "Untitled",
                date: dateStr,
                time: timeStr,
                duration: endTime,
                location: locationStr,
                category: "Work",
                color: "#0078D4",
                is_all_day: isAllDay,
              },
              { onConflict: "user_id,provider,external_id" }
            );

          if (!upsertError) eventCount++;
        }
      } else {
        const errText = await calRes.text();
        console.error("Outlook calendar fetch failed:", calRes.status, errText);
      }
    } catch (calErr) {
      console.error("Outlook calendar sync error:", calErr);
    }

    // Update sync status to complete
    await supabase
      .from("user_integrations")
      .update({
        sync_status: "idle",
        last_sync_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "microsoft");

    return new Response(
      JSON.stringify({
        success: true,
        emails_synced: emailCount,
        events_synced: eventCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== Microsoft Token Helper (refresh if expired) =====
async function getMicrosoftAccessToken(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data: integration, error } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "microsoft")
    .is("disconnected_at", null)
    .maybeSingle();

  if (error || !integration?.refresh_token) {
    return null;
  }

  // Check if access token is still valid (with 5-minute buffer)
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;
  const now = Date.now();

  if (integration.access_token && expiresAt > now + 5 * 60 * 1000) {
    return integration.access_token;
  }

  // Token expired — refresh it
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials not configured");
  }

  const tokenResponse = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Microsoft token refresh failed: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  const newAccessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Update stored tokens (Microsoft may issue a new refresh_token too)
  const updateData: any = {
    access_token: newAccessToken,
    token_expires_at: newExpiresAt,
  };
  if (tokenData.refresh_token) {
    updateData.refresh_token = tokenData.refresh_token;
  }

  await supabase
    .from("user_integrations")
    .update(updateData)
    .eq("user_id", userId)
    .eq("provider", "microsoft");

  return newAccessToken;
}

// ===== Gemini Batch Email Classification =====
const VALID_LABELS = ["Work", "Personal", "School", "Business", "Invoices", "Newsletters", "Uncategorized"];

async function classifyEmails(
  emails: { sender: string; subject: string; preview: string }[]
): Promise<string[]> {
  if (emails.length === 0) return [];

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return emails.map(() => "Uncategorized");

  try {
    const emailList = emails
      .map((e, i) => `${i + 1}. From: ${e.sender.slice(0, 60)} | Subject: ${e.subject.slice(0, 80)} | Preview: ${e.preview.slice(0, 100)}`)
      .join("\n");

    const prompt = `Classify each email into exactly one category: Work, Personal, School, Business, Invoices, Newsletters, Uncategorized.

Emails:
${emailList}

Respond with ONLY a JSON array of labels in order, e.g. ["Work","Personal","Invoices"]. No other text.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 256 },
        }),
      }
    );

    if (!res.ok) return emails.map(() => "Uncategorized");

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return emails.map(() => "Uncategorized");

    const labels: string[] = JSON.parse(match[0]);

    if (labels.length !== emails.length) return emails.map(() => "Uncategorized");

    return labels.map((l) => VALID_LABELS.includes(l) ? l : "Uncategorized");
  } catch (err) {
    console.error("Gemini classification error:", err);
    return emails.map(() => "Uncategorized");
  }
}
