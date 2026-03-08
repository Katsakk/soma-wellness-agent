import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  let origin = "http://localhost:8080";
  let returnTo = "/activity";

  try {
    if (state) {
      const decoded = JSON.parse(atob(state));
      origin = decoded.origin || origin;
      returnTo = decoded.returnTo || returnTo;
    }
  } catch { /* use defaults */ }

  const errorRedirect = (msg: string) =>
    Response.redirect(`${origin}${returnTo}?strava=error&message=${encodeURIComponent(msg)}`);

  if (oauthError || !code || !state) {
    return errorRedirect(oauthError || "missing_params");
  }

  try {
    const { userId } = JSON.parse(atob(state));
    if (!userId) return errorRedirect("missing_user");

    const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
    const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Strava token exchange failed:", tokenRes.status, body);
      return errorRedirect("token_exchange_failed");
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_at, athlete } = tokenData;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "strava")
      .maybeSingle();

    const payload = {
      user_id: userId,
      provider: "strava",
      access_token,
      refresh_token,
      status: "connected",
      metadata: {
        expires_at: expires_at, // unix timestamp from Strava
        athlete_id: athlete?.id,
        athlete_name: `${athlete?.firstname || ""} ${athlete?.lastname || ""}`.trim(),
      },
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("integrations").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("integrations").insert(payload);
    }

    return Response.redirect(`${origin}${returnTo}?strava=connected`);
  } catch (e) {
    console.error("strava-callback error:", e);
    return errorRedirect("server_error");
  }
});
