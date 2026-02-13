import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Decode state to get userId and redirectUrl
    let userId: string;
    let redirectUrl: string;
    try {
      const state = JSON.parse(atob(stateParam || ""));
      userId = state.userId;
      redirectUrl = state.redirectUrl;
    } catch {
      return new Response("Invalid state parameter", { status: 400 });
    }

    // If user denied access or there was an error
    if (error || !code) {
      return Response.redirect(redirectUrl, 302);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("NOTION_CLIENT_ID")!;
    const clientSecret = Deno.env.get("NOTION_CLIENT_SECRET")!;

    // Build the callback URL (must match what was sent in the authorize request)
    const callbackUrl = `${supabaseUrl}/functions/v1/notion-oauth-callback`;

    // Exchange authorization code for access token
    // Notion uses Basic Auth: base64(client_id:client_secret)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Notion token exchange failed:", errText);
      return Response.redirect(redirectUrl, 302);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const workspaceId = tokenData.workspace_id || null;
    const workspaceName = tokenData.workspace_name || null;
    const botId = tokenData.bot_id || null;

    // Extract user email if available
    const ownerEmail = tokenData.owner?.user?.person?.email || null;

    // Use service role key to bypass RLS for upsert
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a Notion integration row already exists for this user
    const { data: existing } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "notion")
      .maybeSingle();

    if (existing) {
      // Update existing row (reconnecting)
      await supabase
        .from("user_integrations")
        .update({
          access_token: accessToken,
          refresh_token: botId, // Store bot_id for reference
          token_expires_at: null, // Notion tokens don't expire
          provider_email: ownerEmail,
          scopes: JSON.stringify({ workspace_id: workspaceId, workspace_name: workspaceName }),
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          sync_status: "idle",
          sync_error: null,
        })
        .eq("id", existing.id);
    } else {
      // Insert new row
      await supabase
        .from("user_integrations")
        .insert({
          user_id: userId,
          provider: "notion",
          access_token: accessToken,
          refresh_token: botId,
          token_expires_at: null,
          provider_email: ownerEmail,
          scopes: JSON.stringify({ workspace_id: workspaceId, workspace_name: workspaceName }),
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          sync_status: "idle",
          sync_error: null,
        });
    }

    // Redirect back to the app
    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("Notion OAuth callback error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
