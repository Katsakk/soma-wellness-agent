import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Fallback origin if state parsing fails
  let origin = "http://localhost:8080";
  let returnTo = "/profile";

  try {
    if (state) {
      const decoded = JSON.parse(atob(state));
      origin = decoded.origin || origin;
      returnTo = decoded.returnTo || returnTo;
    }
  } catch { /* use defaults */ }

  const errorRedirect = (msg: string) =>
    Response.redirect(`${origin}${returnTo}?gmail=error&message=${encodeURIComponent(msg)}`);

  if (oauthError || !code || !state) {
    return errorRedirect(oauthError || "missing_params");
  }

  try {
    const { userId } = JSON.parse(atob(state));
    if (!userId) return errorRedirect("missing_user");

    const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-callback`;
    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Token exchange failed:", tokenRes.status, body);
      return errorRedirect("token_exchange_failed");
    }

    const { access_token, refresh_token, expires_in } = await tokenRes.json();
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Use service role to write on behalf of the user (no user JWT available here)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .maybeSingle();

    const payload = {
      user_id: userId,
      provider: "gmail",
      access_token,
      refresh_token,
      status: "connected",
      metadata: { expires_at: expiresAt },
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("integrations").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("integrations").insert(payload);
    }

    return Response.redirect(`${origin}${returnTo}?gmail=connected`);
  } catch (e) {
    console.error("gmail-callback error:", e);
    return errorRedirect("server_error");
  }
});
