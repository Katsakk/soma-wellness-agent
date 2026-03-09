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

// MET values by Strava sport_type (metabolic equivalent of task)
// Calories = MET × 70kg × (duration_hours)
const SPORT_MET: Record<string, number> = {
  run: 9.8, trailrun: 10.5, virtualrun: 9.0,
  ride: 7.5, gravelride: 8.5, ebikeride: 5.0, virtualride: 6.5, handcycle: 5.5,
  swim: 7.0,
  walk: 3.8, hike: 5.3,
  weighttraining: 5.0,
  yoga: 3.0, pilates: 3.5, stretching: 2.5,
  hiit: 10.0, crossfit: 8.5, workout: 6.0,
  soccer: 8.0, tennis: 7.3, basketball: 8.0, football: 8.0,
  boxing: 9.0, skiing: 6.8, snowboarding: 6.0, rowing: 7.0,
  other: 5.5,
};

function estimateCaloriesFromActivity(a: any): number {
  const sportKey = (a.sport_type || a.type || "other").toLowerCase();
  const met = SPORT_MET[sportKey] ?? SPORT_MET.other;
  const durationHours = (a.moving_time || 0) / 3600;
  const weightKg = 70; // default body weight
  return Math.round(met * weightKg * durationHours);
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
        calories_burned: a.calories || estimateCaloriesFromActivity(a) || null,
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

    // Backfill ALL existing Strava workouts that are missing calories
    // (uses stored workout_type + duration so no Strava API re-fetch needed)
    const MET_BY_TYPE: Record<string, number> = {
      cardio: 8.5, strength: 5.0, hiit: 10.0, flexibility: 3.0,
      full_body: 6.5, upper_body: 5.5, lower_body: 5.5, sports: 7.5, other: 5.5,
    };
    const { data: nullCalWorkouts } = await supabase
      .from("workouts")
      .select("id, workout_type, duration")
      .eq("user_id", userId)
      .eq("source", "strava")
      .is("calories_burned", null);

    if (nullCalWorkouts && nullCalWorkouts.length > 0) {
      for (const w of nullCalWorkouts) {
        const met = MET_BY_TYPE[w.workout_type || "other"] ?? MET_BY_TYPE.other;
        const durationHours = (w.duration || 0) / 60;
        const estimated = Math.round(met * 70 * durationHours);
        if (estimated > 0) {
          await supabase.from("workouts")
            .update({ calories_burned: estimated })
            .eq("id", w.id);
        }
      }
      console.log(`Backfilled calories for ${nullCalWorkouts.length} existing Strava workouts`);
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
