import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, origin, returnTo = "/" } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
    if (!CLIENT_ID) throw new Error("STRAVA_CLIENT_ID is not configured");

    const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/strava-callback`;
    const state = btoa(JSON.stringify({ userId, origin, returnTo }));

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      approval_prompt: "force",
      scope: "activity:read_all",
      state,
    });

    const url = `https://www.strava.com/oauth/authorize?${params}`;
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("strava-auth error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
