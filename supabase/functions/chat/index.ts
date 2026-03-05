import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ");
  }
  return "";
}

function hasImages(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  return content.some((c: any) => c.type === "image_url");
}

function getImageUrls(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  return content.filter((c: any) => c.type === "image_url").map((c: any) => c.image_url?.url).filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const [goalsRes, prefsRes, mealsRes, workoutsRes, memoryRes, profileRes] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", userId).eq("is_active", true).limit(5),
      supabase.from("preferences").select("*").eq("user_id", userId).limit(1),
      supabase.from("meals").select("*").eq("user_id", userId).gte("meal_time", new Date(Date.now() - 86400000).toISOString()).order("meal_time", { ascending: false }).limit(10),
      supabase.from("workouts").select("*").eq("user_id", userId).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(10),
      supabase.from("agent_memory").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("display_name").eq("user_id", userId).limit(1),
    ]);

    const goals = goalsRes.data || [];
    const prefs = prefsRes.data?.[0] || null;
    const todayMeals = mealsRes.data || [];
    const recentWorkouts = workoutsRes.data || [];
    const memories = memoryRes.data || [];
    const displayName = profileRes.data?.[0]?.display_name || "User";

    const todayTotals = todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fats: acc.fats + (m.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const systemPrompt = `You are an adaptive wellness coach for ${displayName}. You provide personalized health guidance based on the user's data. You are NOT a medical professional — never give medical advice, diagnose conditions, or recommend medications.

Your personality: warm, encouraging, knowledgeable, concise. Use markdown formatting for clarity. Keep responses focused and actionable.

## User Context

**Goals:** ${goals.length > 0 ? goals.map((g) => `${g.goal_type} (calories: ${g.target_calories || "—"}, protein: ${g.target_protein || "—"}g, carbs: ${g.target_carbs || "—"}g, fats: ${g.target_fats || "—"}g)`).join("; ") : "No goals set yet."}

**Preferences:** ${prefs ? `Diet: ${(prefs.dietary_preferences || []).join(", ") || "none set"} | Workout: ${(prefs.workout_preferences || []).join(", ") || "none set"} | Units: ${prefs.units || "metric"}` : "No preferences set."}

**Today's Nutrition (so far):** ${todayMeals.length > 0 ? `${todayTotals.calories} cal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fats}g fats from ${todayMeals.length} meal(s): ${todayMeals.map((m) => m.name).join(", ")}` : "No meals logged today."}

**Recent Workouts (7 days):** ${recentWorkouts.length > 0 ? recentWorkouts.map((w) => `${w.name} (${w.workout_type || "general"}, ${w.duration || "?"}min, ${w.calories_burned || "?"}cal)`).join("; ") : "No recent workouts."}

**Known Facts About User:** ${memories.length > 0 ? memories.map((m) => m.fact).join("; ") : "No stored preferences yet."}

## Guidelines
- Reference their actual data when answering questions about nutrition, activity, or progress.
- When the user shares a food photo, carefully analyze the image to identify ALL visible food items, estimate portions, and provide a detailed macro breakdown.
- For restaurant menus, identify items and provide nutritional estimates.
- For fridge or pantry photos, suggest meals based on visible ingredients with estimated macros.
- When a user tells you about food they ate (text or image), confirm you've logged it for them.
- When a user tells you about a workout or activity they completed (e.g. "I just ran 5k", "did 30 min yoga", "went for a swim"), confirm you've logged it for them and provide encouraging feedback.
- When generating workout plans, provide structured exercises with sets, reps, and rest periods.
- When data is missing, suggest they log meals or workouts.
- For workout generation, ask about available time, equipment, and location if not specified.
- Be encouraging but honest about gaps in their routine.
- Keep responses under 300 words unless the user asks for detail.`;

    const lastUserMsg = messages[messages.length - 1];
    const lastUserText = getTextContent(lastUserMsg?.content || "");
    const lastUserImages = getImageUrls(lastUserMsg?.content || "");
    const messageHasImages = lastUserImages.length > 0;

    // Fire extraction in parallel (non-blocking) — handles both meals and workouts
    const extractionPromise = extractAndLogActivity(
      lastUserText,
      lastUserImages,
      userId,
      supabase,
      LOVABLE_API_KEY
    );

    const model = messageHasImages ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      await extractionPromise.catch(() => {});

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      try {
        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await extractionPromise.catch((e) => console.error("Extraction error:", e));
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function extractAndLogActivity(
  userText: string,
  imageUrls: string[],
  userId: string,
  supabase: ReturnType<typeof createClient>,
  apiKey: string
) {
  if (!userText && imageUrls.length === 0) return;

  try {
    const extractionContent: any[] = [];

    const promptText = imageUrls.length > 0
      ? `Analyze the image(s) and the user's message. Determine if they are describing:
1. Food they ate/are eating — extract meal details
2. A workout or physical activity they completed — extract workout details
3. Neither — return {"type": "none"}

User message: "${userText || "(no text, just the image)"}"

Return ONLY valid JSON (no markdown) in one of these formats:

For meals:
{"type": "meal", "name": "descriptive meal name", "calories": number, "protein": number, "carbs": number, "fats": number}

For workouts/activities:
{"type": "workout", "name": "workout name", "workout_type": "cardio|strength|flexibility|sports|hiit|other", "duration": number_in_minutes, "calories_burned": number_estimate}

If neither food nor exercise:
{"type": "none"}`
      : `Analyze the user's message. Determine if they are describing:
1. Food they ate or are eating (e.g. "I had pasta", "just ate a sandwich")
2. A workout or physical activity they completed (e.g. "I ran 5k", "did 30 min yoga", "went swimming for an hour", "just finished a HIIT session", "walked 10,000 steps")
3. Neither

User message: "${userText}"

Return ONLY valid JSON (no markdown) in one of these formats:

For meals:
{"type": "meal", "name": "descriptive meal name", "calories": number, "protein": number, "carbs": number, "fats": number}

For workouts/activities:
{"type": "workout", "name": "workout name", "workout_type": "cardio|strength|flexibility|sports|hiit|other", "duration": number_in_minutes, "calories_burned": number_estimate}

If neither food nor exercise:
{"type": "none"}`;

    extractionContent.push({ type: "text", text: promptText });
    for (const url of imageUrls) {
      extractionContent.push({ type: "image_url", image_url: { url } });
    }

    const model = imageUrls.length > 0 ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite";

    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: imageUrls.length > 0 ? extractionContent : promptText,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!extractionResponse.ok) {
      console.error("Extraction API error:", extractionResponse.status);
      return;
    }

    const extractionData = await extractionResponse.json();
    const content = extractionData.choices?.[0]?.message?.content?.trim();
    if (!content) return;

    const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch {
      console.error("Failed to parse extraction JSON:", cleanedContent);
      return;
    }

    if (parsed.type === "meal") {
      const { error } = await supabase.from("meals").insert({
        user_id: userId,
        name: parsed.name || "Unnamed meal",
        calories: parsed.calories || null,
        protein: parsed.protein || null,
        carbs: parsed.carbs || null,
        fats: parsed.fats || null,
        source: "ai_estimate",
        meal_time: new Date().toISOString(),
      });
      if (error) console.error("Failed to insert meal:", error);
      else console.log("Auto-logged meal:", parsed.name);
    } else if (parsed.type === "workout") {
      const { error } = await supabase.from("workouts").insert({
        user_id: userId,
        name: parsed.name || "Unnamed workout",
        workout_type: parsed.workout_type || "other",
        duration: parsed.duration || null,
        calories_burned: parsed.calories_burned || null,
        source: "ai_estimate",
        completed_at: new Date().toISOString(),
      });
      if (error) console.error("Failed to insert workout:", error);
      else console.log("Auto-logged workout:", parsed.name);
    }
  } catch (e) {
    console.error("Extraction error:", e);
  }
}
