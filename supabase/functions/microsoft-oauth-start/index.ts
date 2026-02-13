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

    const { redirectUrl } = await req.json();
    if (!redirectUrl) {
      return new Response(
        JSON.stringify({ error: "No redirectUrl provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
    if (!clientId) {
      throw new Error("MICROSOFT_CLIENT_ID not configured");
    }

    // Build the callback URL — our microsoft-oauth-callback Edge Function
    const callbackUrl = `${supabaseUrl}/functions/v1/microsoft-oauth-callback`;

    // Build state parameter (encode user info + redirect for the callback)
    const state = btoa(JSON.stringify({
      userId: user.id,
      redirectUrl,
    }));

    // Build Microsoft OAuth consent URL using /common for personal + work accounts
    // Scopes: Mail read/send + OneDrive files + profile info + offline refresh
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: callbackUrl,
      response_mode: "query",
      scope: "openid email profile Mail.Read Mail.Send Files.Read Files.ReadWrite offline_access",
      state,
    });

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return new Response(
      JSON.stringify({ url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
