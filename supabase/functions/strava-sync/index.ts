import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Strava sport_type / type to our workout_type
function mapStravaType(sportType: string): string {
  const t = (sportType || "").toLowerCase();
  if (["run", "trailrun", "virtualrun"].some((x) => t.includes(x))) return "cardio";
  if (["ride", "gravelride", "ebikeride", "virtualride", "handcycle"].some((x) => t.includes(x))) return "cardio";
  if (t.includes("swim")) return "cardio";
  if (t.includes("walk") || t.includes("hike")) return "cardio";
  if (t.includes("weighttraining") || t.includes("weight")) return "strength";
  if (t.includes("yoga") || t.includes("pilates") || t.includes("stretch")) return "flexibility";
  if (t.includes("hiit") || t.includes("interval")) return "hiit";
  if (t.includes("crossfit") || t.includes("workout")) return "full_body";
  if (["soccer", "tennis", "basketball", "football", "volleyball", "boxing", "martial", "skiing", "snowboard"].some((x) => t.includes(x))) return "sports";
  return "other";
}

// Refresh a Strava access token using the refresh token
async function refreshStravaToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    console.error("Strava token refresh failed:", await res.text());
    return null;
  }
  const data = await res.json();
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const userId: string = body.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the stored integration
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "strava")
      .eq("status", "connected")
      .maybeSingle();

    if (intError || !integration) {
      return new Response(JSON.stringify({ error: "Strava not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken: string = integration.access_token;
    const meta = integration.metadata as any;

    // Refresh if expired (Strava expires_at is a unix timestamp)
    const nowUnix = Math.floor(Date.now() / 1000);
    if (meta?.expires_at && nowUnix >= meta.expires_at - 300) {
      console.log("Strava token expired, refreshing…");
      const refreshed = await refreshStravaToken(integration.refresh_token);
      if (!refreshed) {
        return new Response(JSON.stringify({ error: "Failed to refresh Strava token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshed.access_token;
      await supabase.from("integrations").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        metadata: { ...meta, expires_at: refreshed.expires_at },
        updated_at: new Date().toISOString(),
      }).eq("id", integration.id);
    }

    // Determine sync window: since last sync or 30 days ago
    const lastSync = integration.last_sync_at
      ? Math.floor(new Date(integration.last_sync_at).getTime() / 1000)
      : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    // Fetch activities from Strava (up to 200 at a time)
    const activitiesUrl = new URL("https://www.strava.com/api/v3/athlete/activities");
    activitiesUrl.searchParams.set("after", lastSync.toString());
    activitiesUrl.searchParams.set("per_page", "200");

    const activitiesRes = await fetch(activitiesUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!activitiesRes.ok) {
      const body = await activitiesRes.text();
      console.error("Strava activities fetch failed:", activitiesRes.status, body);
      return new Response(JSON.stringify({ error: "Failed to fetch Strava activities" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activities = await activitiesRes.json();
    console.log(`Fetched ${activities.length} Strava activities since ${new Date(lastSync * 1000).toISOString()}`);

    if (!activities.length) {
      await supabase.from("integrations")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", integration.id);
      return new Response(JSON.stringify({ imported: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing Strava workout external_ids to avoid duplicates
    const stravaIds = activities.map((a: any) => `strava_${a.id}`);
    const { data: existing } = await supabase
      .from("workouts")
      .select("notes")
      .eq("user_id", userId)
      .eq("source", "strava")
      .in("notes", stravaIds);

    const existingIds = new Set((existing || []).map((r: any) => r.notes));

    const toInsert = activities
      .filter((a: any) => !existingIds.has(`strava_${a.id}`))
      .map((a: any) => ({
        user_id: userId,
        name: a.name || a.sport_type || "Strava Workout",
        workout_type: mapStravaType(a.sport_type || a.type || ""),
        duration: a.moving_time ? Math.round(a.moving_time / 60) : null, // seconds → minutes
        calories_burned: a.calories || null,
        source: "strava",
        notes: `strava_${a.id}`,
        completed_at: a.start_date || new Date().toISOString(),
        created_at: a.start_date || new Date().toISOString(),
        exercises: {
          strava_id: a.id,
          sport_type: a.sport_type || a.type,
          distance_m: a.distance || null,
          elevation_gain_m: a.total_elevation_gain || null,
          avg_heartrate: a.average_heartrate || null,
          max_heartrate: a.max_heartrate || null,
          kudos_count: a.kudos_count || 0,
        },
      }));

    console.log(`Inserting ${toInsert.length} new Strava workouts`);

    let imported = 0;
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("workouts").insert(toInsert);
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to insert workouts: ${insertError.message}`);
      }
      imported = toInsert.length;
    }

    await supabase.from("integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integration.id);

    return new Response(JSON.stringify({ imported }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("strava-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
