import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// n8n webhook base URL
const N8N_WEBHOOK_BASE = "https://camtech-consulting.app.n8n.cloud/webhook";

// Category → n8n workflow path mapping for QUERY intents
const QUERY_WORKFLOW_MAP: Record<string, string> = {
  calendar: "saelo-calendar-query",
  event: "saelo-calendar-query",
  finance: "saelo-finance-query",
  expense: "saelo-finance-query",
  income: "saelo-finance-query",
  contact: "saelo-contacts-query",
  task: "saelo-tasks-query",
  general: "saelo-generic-query",
};

// Category → n8n workflow path mapping for ACT external actions
const ACT_WORKFLOW_MAP: Record<string, string> = {
  email: "saelo-send-email",
  event: "saelo-create-event",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { intent } = await req.json();

    if (!intent) {
      return new Response(
        JSON.stringify({ error: "No intent provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's JWT from the Authorization header
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

    // Create Supabase client with user's token for RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const intentType = (intent.type || intent.intentType || "").toLowerCase();

    // ===== LOG INTENT: Direct DB writes =====
    if (intentType === "log") {
      const result = await handleLogIntent(supabase, user.id, intent);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== QUERY INTENT: Route to n8n webhook =====
    if (intentType === "query") {
      const result = await handleQueryIntent(user.id, token, intent);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACT INTENT: Split routing (internal DB + external n8n) =====
    if (intentType === "act") {
      const result = await handleActIntent(supabase, user.id, token, intent);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown intent type: ${intentType}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== LOG Handler =====
async function handleLogIntent(
  supabase: any,
  userId: string,
  intent: any
): Promise<any> {
  const category = (intent.category || "").toLowerCase();
  const entities = intent.entities || {};

  switch (category) {
    case "expense":
    case "income": {
      let amount = Number(entities.amount) || 0;
      const txnCategory =
        category === "income"
          ? "Income"
          : entities.businessExpense
          ? "Business Expenses"
          : "Personal Expenses";
      // Auto-negate expenses
      if (txnCategory !== "Income" && amount > 0) amount = -amount;
      if (txnCategory === "Income" && amount < 0) amount = -amount;

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          date: entities.date || new Date().toLocaleDateString(),
          store: entities.store || entities.description || intent.title || "",
          amount,
          category: txnCategory,
          status: "Pending",
          summary: intent.detail || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    case "contact": {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          name: entities.person || entities.name || intent.title || "",
          role: entities.role || null,
          company: entities.company || null,
          phone: entities.phone || null,
          where_met: entities.whereMet || null,
          why: entities.why || intent.detail || null,
          when_met: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          status: "New Connection",
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    case "event": {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          user_id: userId,
          title: entities.title || intent.title || "",
          date: entities.date || new Date().toISOString().split("T")[0],
          time: entities.time || null,
          duration: entities.duration || null,
          location: entities.location || null,
          category: entities.category || "Personal",
          color: entities.category === "Work" ? "#4285F4" : "#34A853",
          is_all_day: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    default:
      return { error: `Unknown LOG category: ${category}` };
  }
}

// ===== QUERY Handler =====
async function handleQueryIntent(
  userId: string,
  userToken: string,
  intent: any
): Promise<any> {
  const category = (intent.category || "general").toLowerCase();
  const query = intent.detail || intent.title || "";

  // Map category to n8n workflow
  const workflowPath = QUERY_WORKFLOW_MAP[category] || "saelo-generic-query";
  const webhookUrl = `${N8N_WEBHOOK_BASE}/${workflowPath}`;

  // Get Gemini API key from environment
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        user_token: userToken,
        query,
        category,
        gemini_key: geminiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      response: data.response || "No response from workflow",
    };
  } catch (err) {
    return { error: `Query failed: ${err.message}` };
  }
}

// ===== ACT Handler (split routing) =====
async function handleActIntent(
  supabase: any,
  userId: string,
  userToken: string,
  intent: any
): Promise<any> {
  const category = (intent.category || "").toLowerCase();
  const entities = intent.entities || {};

  // External actions → n8n webhooks (with per-user Google token)
  if (ACT_WORKFLOW_MAP[category]) {
    return handleActExternal(supabase, userId, intent, category);
  }

  // Internal actions → direct Supabase writes
  switch (category) {
    case "todo": {
      // Get user's first workspace (default)
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      const workspaceId = workspaces?.[0]?.id || null;

      const { data, error } = await supabase
        .from("project_todos")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          text: entities.title || intent.title || "",
          due_date: entities.due_date || null,
          priority: entities.priority || "medium",
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    case "workspace": {
      const validTypes = ["Business", "Personal", "Admin", "Creative"];
      const wsType = validTypes.includes(entities.type) ? entities.type : "Personal";
      const colorMap: Record<string, string> = {
        Business: "#D4AF37",
        Personal: "#6B8E4E",
        Admin: "#584738",
        Creative: "#5B7B9A",
      };

      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          user_id: userId,
          title: entities.title || intent.title || "",
          type: wsType,
          color: colorMap[wsType] || "#D4AF37",
          document_count: 0,
          last_modified: "Just now",
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    case "contact": {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          name: entities.name || entities.person || intent.title || "",
          role: entities.role || null,
          company: entities.company || null,
          phone: entities.phone || null,
          where_met: entities.whereMet || null,
          why: entities.why || intent.detail || null,
          when_met: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          status: "New Connection",
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    case "transaction": {
      let amount = Number(entities.amount) || 0;
      const txnCategory =
        entities.category === "Income"
          ? "Income"
          : entities.category === "Business Expenses"
          ? "Business Expenses"
          : "Personal Expenses";
      // Auto-negate expenses
      if (txnCategory !== "Income" && amount > 0) amount = -amount;
      if (txnCategory === "Income" && amount < 0) amount = -amount;

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          date: entities.date || new Date().toLocaleDateString(),
          store: entities.store || entities.description || intent.title || "",
          amount,
          category: txnCategory,
          status: "Pending",
          summary: intent.detail || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    case "draft": {
      const { data, error } = await supabase
        .from("drafts")
        .insert({
          user_id: userId,
          type: "email",
          title: entities.subject || intent.title || "",
          detail: entities.body || intent.detail || "",
          target_account: entities.to || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, result: data };
    }

    default:
      return { error: `Unknown ACT category: ${category}` };
  }
}

// ===== ACT External Handler (n8n webhooks) =====
async function handleActExternal(
  supabase: any,
  userId: string,
  intent: any,
  category: string
): Promise<any> {
  const entities = intent.entities || {};
  const workflowPath = ACT_WORKFLOW_MAP[category];
  const webhookUrl = `${N8N_WEBHOOK_BASE}/${workflowPath}`;

  // Fetch user's Google access token for external actions
  const googleToken = await getGoogleAccessToken(supabase, userId);
  if (!googleToken) {
    return {
      error: "Google not connected. Please connect Google in Account settings to send emails and create events.",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        google_access_token: googleToken,
        category,
        entities,
        title: intent.title || "",
        detail: intent.detail || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result || data,
    };
  } catch (err) {
    return { error: `ACT action failed: ${err.message}` };
  }
}

// ===== Google Token Helper =====
async function getGoogleAccessToken(
  supabase: any,
  userId: string
): Promise<string | null> {
  // Fetch user's Google integration record
  const { data: integration, error } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
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
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Google token refresh failed: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  const newAccessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Update stored token
  await supabase
    .from("user_integrations")
    .update({
      access_token: newAccessToken,
      token_expires_at: newExpiresAt,
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return newAccessToken;
}
