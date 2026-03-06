import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  shouldProcess, parseBooking, stripHtml, decodeBase64, type ParsedBooking,
} from "../_shared/gmailParsing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API = "https://www.googleapis.com/gmail/v1/users/me";
// Approved senders + subject keywords — matches src/lib/gmailParsing.ts
const GMAIL_QUERY =
  "newer_than:7d (from:team@info.classpass.com OR from:hello@barrysbootcamp.sg OR subject:reservation OR subject:booking)";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (!payload.sub) throw new Error("no sub");
      userId = payload.sub as string;
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Gmail tokens
    const { data: integration, error: intErr } = await supabase
      .from("integrations")
      .select("access_token, refresh_token, metadata")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .maybeSingle();

    if (intErr || !integration?.access_token) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if expired (or proactively)
    const accessToken = await getValidAccessToken(integration, userId, supabase);

    // Fetch messages matching our query
    const listRes = await gmailFetch(accessToken, `/messages?q=${encodeURIComponent(GMAIL_QUERY)}&maxResults=50`);
    if (!listRes.ok) {
      const body = await listRes.text();
      console.error("Gmail list error:", listRes.status, body);
      if (listRes.status === 401) {
        return new Response(JSON.stringify({ error: "Gmail token expired, please reconnect" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to fetch Gmail messages");
    }

    const { messages = [] } = await listRes.json();

    // Load existing gmail_sync fingerprints to deduplicate
    const { data: existingWorkouts } = await supabase
      .from("workouts")
      .select("exercises")
      .eq("user_id", userId)
      .eq("source", "gmail_sync");

    const existingFingerprints = new Set(
      (existingWorkouts || [])
        .map((w: any) => w.exercises?.fingerprint)
        .filter(Boolean)
    );

    // Process each message
    const bookings: ParsedBooking[] = [];
    const seenFingerprints = new Set<string>(existingFingerprints);

    for (const { id } of messages) {
      try {
        const msgRes = await gmailFetch(accessToken, `/messages/${id}?format=full`);
        if (!msgRes.ok) continue;
        const msg = await msgRes.json();

        const headers: Record<string, string> = {};
        for (const h of msg.payload?.headers || []) {
          headers[h.name.toLowerCase()] = h.value;
        }

        const from = headers["from"] || "";
        const subject = headers["subject"] || "";

        if (!shouldProcess(from, subject)) continue;

        // Skip cancellation emails
        if (/cancel/i.test(subject)) continue;

        const bodyText = extractBody(msg.payload);
        if (!bodyText) continue;

        const booking = parseBooking(from, subject, bodyText);
        if (!booking) continue;

        // Deduplication by fingerprint
        if (seenFingerprints.has(booking.fingerprint)) continue;
        seenFingerprints.add(booking.fingerprint);
        bookings.push(booking);
      } catch (e) {
        console.error("Error processing message:", id, e);
      }
    }

    // Insert new workouts
    if (bookings.length > 0) {
      const rows = bookings.map((b) => ({
        user_id: userId,
        name: b.className,
        workout_type: b.workoutType,
        duration: b.durationMinutes,
        calories_burned: b.caloriesBurned,
        completed_at: `${b.date}T${b.startTime}:00`,
        source: "gmail_sync",
        exercises: {
          fingerprint: b.fingerprint,
          studio: b.studio,
          start_time: b.startTime,
          end_time: b.endTime,
        },
      }));

      const { error: insertError } = await supabase.from("workouts").insert(rows);
      if (insertError) throw insertError;
    }

    // Update last_sync_at
    await supabase
      .from("integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "gmail");

    return new Response(
      JSON.stringify({ imported: bookings.length, total_processed: messages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gmail-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function gmailFetch(accessToken: string, path: string) {
  return fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getValidAccessToken(
  integration: { access_token: string; refresh_token: string | null; metadata: any },
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const expiresAt = integration.metadata?.expires_at;
  const isExpired = !expiresAt || new Date(expiresAt) <= new Date(Date.now() + 60_000);

  if (!isExpired) return integration.access_token;
  if (!integration.refresh_token) return integration.access_token;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return integration.access_token;

    const { access_token, expires_in } = await res.json();
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    await supabase
      .from("integrations")
      .update({
        access_token,
        metadata: { ...integration.metadata, expires_at: newExpiresAt },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "gmail");

    return access_token;
  } catch {
    return integration.access_token;
  }
}

function extractBody(payload: any): string {
  if (!payload) return "";

  // Direct body
  if (payload.body?.data) {
    const raw = decodeBase64(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(raw) : raw;
  }

  // Multipart: prefer text/plain, fallback to text/html
  if (payload.parts) {
    let htmlPart = "";
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (!text) continue;
      if (part.mimeType === "text/plain") return text;
      if (part.mimeType === "text/html") htmlPart = stripHtml(text);
      if (part.mimeType?.startsWith("multipart/")) return text;
    }
    return htmlPart;
  }

  return "";
}
