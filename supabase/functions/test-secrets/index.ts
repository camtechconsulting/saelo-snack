const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Dev utility — check which secrets are configured
  const secrets = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DEEPGRAM_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NOTION_CLIENT_ID",
    "NOTION_CLIENT_SECRET",
    "SLACK_CLIENT_ID",
    "SLACK_CLIENT_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
  ];

  const status: Record<string, boolean> = {};
  for (const key of secrets) {
    const val = Deno.env.get(key);
    status[key] = !!val && val.length > 0;
  }

  return new Response(
    JSON.stringify({ secrets: status }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
