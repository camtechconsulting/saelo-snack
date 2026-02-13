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
    const clientId = Deno.env.get("SLACK_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET")!;

    // Build the callback URL (must match what was sent in the authorize request)
    const callbackUrl = `${supabaseUrl}/functions/v1/slack-oauth-callback`;

    // Exchange authorization code for access token
    // Slack uses client_id + client_secret in POST body
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error("Slack token exchange failed:", tokenData.error);
      return Response.redirect(redirectUrl, 302);
    }

    // Slack v2 OAuth returns authed_user for user tokens (when using user_scope)
    const authedUser = tokenData.authed_user;
    const accessToken = authedUser?.access_token;
    const userScopes = authedUser?.scope || "";
    const slackUserId = authedUser?.id || null;

    const teamId = tokenData.team?.id || null;
    const teamName = tokenData.team?.name || null;

    if (!accessToken) {
      console.error("No user access token in Slack response:", tokenData);
      return Response.redirect(redirectUrl, 302);
    }

    // Use service role key to bypass RLS for upsert
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a Slack integration row already exists for this user
    const { data: existing } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "slack")
      .maybeSingle();

    const integrationData = {
      access_token: accessToken,
      refresh_token: null, // Slack user tokens don't use refresh tokens
      token_expires_at: null, // Slack user tokens don't expire
      provider_email: slackUserId, // Store Slack user ID for reference
      scopes: JSON.stringify({ team_id: teamId, team_name: teamName, user_scopes: userScopes }),
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      sync_status: "idle",
      sync_error: null,
    };

    if (existing) {
      await supabase
        .from("user_integrations")
        .update(integrationData)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("user_integrations")
        .insert({
          user_id: userId,
          provider: "slack",
          ...integrationData,
        });
    }

    // Redirect back to the app
    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("Slack OAuth callback error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
