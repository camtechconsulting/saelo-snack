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
    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
    const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;

    // Build the callback URL (must match what was sent in the authorize request)
    const callbackUrl = `${supabaseUrl}/functions/v1/microsoft-oauth-callback`;

    // Exchange authorization code for tokens
    // Microsoft uses client_id + client_secret in POST body (like Slack)
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Microsoft token exchange failed:", tokenData.error, tokenData.error_description);
      return Response.redirect(redirectUrl, 302);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || 3600;
    const scopes = tokenData.scope || "";

    if (!accessToken) {
      console.error("No access token in Microsoft response:", tokenData);
      return Response.redirect(redirectUrl, 302);
    }

    // Fetch user profile from Microsoft Graph to get email
    let providerEmail: string | null = null;
    try {
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileRes.json();
      providerEmail = profileData.mail || profileData.userPrincipalName || null;
    } catch (profileErr) {
      console.error("Failed to fetch Microsoft profile:", profileErr);
    }

    // Use service role key to bypass RLS for upsert
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate token expiry time
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Check if a Microsoft integration row already exists for this user
    const { data: existing } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "microsoft")
      .maybeSingle();

    const integrationData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      provider_email: providerEmail,
      scopes: JSON.stringify({ granted_scopes: scopes }),
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
          provider: "microsoft",
          ...integrationData,
        });
    }

    // Redirect back to the app
    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("Microsoft OAuth callback error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
