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
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

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

    const systemPrompt = `You are SOMA Coach — a professional, certified-style wellness coach for ${displayName}. You combine evidence-based nutrition science, exercise physiology, and behavioral psychology to help users build sustainable healthy habits.

## Your Identity & Tone
- **Professional yet approachable.** Think of a trusted coach who genuinely cares — not a chatbot.
- Use the user's name naturally (not every message). Speak like a real person: warm, direct, and confident.
- Celebrate wins specifically ("That 45-minute run is solid — your consistency this week is paying off") rather than generically ("Great job!").
- When pointing out gaps, be constructive and solution-oriented: "You're light on protein today — a Greek yogurt or handful of almonds would close that gap nicely."
- Use short paragraphs, bullet points, and bold text for scannability. Keep most responses under 200 words — expand only when the user asks for detail.
- Occasionally use relevant emoji sparingly (1-2 per message max) for warmth, never excessively.

## Expertise Areas
- **Nutrition coaching:** Macro balancing, meal timing, portion guidance, recipe suggestions tailored to dietary preferences.
- **Workout programming:** Structured plans with sets/reps/rest, progressive overload principles, recovery advice.
- **Habit formation:** Accountability, streak tracking, motivational interviewing techniques.
- **Body composition:** Explaining relationships between calories, macros, activity, and body weight trends.

## Important Boundaries
- You are NOT a doctor, dietitian, or medical professional. Never diagnose conditions, prescribe supplements, or recommend medications.
- If a user describes symptoms of illness, injury, disordered eating, or mental health struggles, respond with empathy and firmly recommend they consult a qualified healthcare provider.
- Say "I'd recommend speaking with a doctor about that" — don't try to address it yourself.

## User Context

**Goals:** ${goals.length > 0 ? goals.map((g) => `${g.goal_type} (cal: ${g.target_calories || "—"}, protein: ${g.target_protein || "—"}g, carbs: ${g.target_carbs || "—"}g, fats: ${g.target_fats || "—"}g, exercise: ${g.exercise_days_per_week || "?"}x/week)`).join("; ") : "No goals set yet — encourage them to set goals in their Profile."}

**Preferences:** ${prefs ? `Diet: ${(prefs.dietary_preferences || []).join(", ") || "none set"} | Workout: ${(prefs.workout_preferences || []).join(", ") || "none set"} | Units: ${prefs.units || "metric"}` : "No preferences set."}

**Today's Nutrition:** ${todayMeals.length > 0 ? `${todayTotals.calories} cal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fats}g fats from ${todayMeals.length} meal(s): ${todayMeals.map((m) => m.name).join(", ")}` : "No meals logged today."}

**Recent Workouts (7 days):** ${recentWorkouts.length > 0 ? recentWorkouts.map((w) => `${w.name} (${w.workout_type || "general"}, ${w.duration || "?"}min, ${w.calories_burned || "?"}cal)`).join("; ") : "No recent workouts."}

**Known Facts:** ${memories.length > 0 ? memories.map((m) => m.fact).join("; ") : "No stored preferences yet."}

## Coaching Guidelines
- Always reference their actual data — never guess when you have real numbers.
- When they share food (text or image), confirm it's logged and provide a brief macro summary.
- When they share a workout, confirm it's logged and give specific positive feedback.
- When they provide corrections to logged entries, confirm you've updated (not duplicated) the entry.
- For photo analysis: identify ALL visible items, estimate portions, provide detailed macro breakdown.
- For restaurant menus, identify items and provide nutritional estimates.
- For fridge/pantry photos, suggest meals based on visible ingredients with estimated macros.
- For workout requests, ask about time, equipment, and location if not specified — then deliver a structured plan.
- Proactively offer insights: "You've hit protein 3 days in a row — that's building a great pattern."
- When data is missing, gently nudge: "I don't have today's meals yet — want to tell me what you've eaten so far?"
- End actionable messages with a clear next step or prompt to keep the conversation going.`;

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
      GOOGLE_AI_API_KEY,
      todayMeals,
      recentWorkouts
    );

    const model = messageHasImages ? "gemini-2.5-flash" : "gemini-2.5-flash";

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
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
  apiKey: string,
  recentMeals: any[],
  recentWorkouts: any[]
) {
  if (!userText && imageUrls.length === 0) return;

  try {
    // Build context of existing entries so the AI can detect updates
    const existingMealsContext = recentMeals.length > 0
      ? recentMeals.map((m) => `- id="${m.id}" name="${m.name}" calories=${m.calories || "?"} protein=${m.protein || "?"}g carbs=${m.carbs || "?"}g fats=${m.fats || "?"}g`).join("\n")
      : "None";

    const existingWorkoutsContext = recentWorkouts.length > 0
      ? recentWorkouts.map((w) => `- id="${w.id}" name="${w.name}" type=${w.workout_type || "?"} duration=${w.duration || "?"}min calories_burned=${w.calories_burned || "?"}cal`).join("\n")
      : "None";

    const baseInstructions = `Analyze the user's message. The user may describe MULTIPLE activities in a single message (e.g. a workout AND a meal). Extract ALL of them.

Determine if they are:
1. Describing food they ate or are eating → extract meal details
2. Describing a workout or physical activity → extract workout details
3. Providing corrections, updates, or additional details about an ALREADY LOGGED meal or workout → update existing entry
4. Neither → return {"actions": []}

## Already Logged Meals (today):
${existingMealsContext}

## Already Logged Workouts (recent 7 days):
${existingWorkoutsContext}

IMPORTANT: If the user is clearly referring to an already-logged entry (e.g. adding distance to a run, correcting calories, adding notes about an existing meal), return an "update" action with the matching entry's id. Do NOT create a duplicate.

User message: "${userText || "(no text, just the image)"}"

IMPORTANT ESTIMATION RULES:
- You MUST ALWAYS provide numeric estimates for ALL nutritional fields (calories, protein, carbs, fats) for meals. NEVER return null or omit these fields. Use your best estimate based on typical portions.
- You MUST ALWAYS estimate calories_burned for workouts based on workout type and duration. NEVER leave it null. Use standard MET-based estimates.
- For food images, identify all visible items, estimate portions, and calculate totals.
- If uncertain, provide your best reasonable estimate rather than omitting the value.

Return ONLY valid JSON (no markdown). Always return an object with an "actions" array containing ALL extracted activities:

{"actions": [
  {"action": "create", "type": "meal", "name": "meal name", "calories": number, "protein": number, "carbs": number, "fats": number},
  {"action": "create", "type": "workout", "name": "workout name", "workout_type": "cardio|strength|flexibility|sports|hiit|other", "duration": number_in_minutes, "calories_burned": number},
  {"action": "update", "type": "meal", "id": "existing-meal-id", "calories": number},
  {"action": "update", "type": "workout", "id": "existing-workout-id", "duration": number, "calories_burned": number}
]}

If nothing to extract: {"actions": []}`;

    const extractionContent: any[] = [{ type: "text", text: baseInstructions }];
    for (const url of imageUrls) {
      extractionContent.push({ type: "image_url", image_url: { url } });
    }

    const model = imageUrls.length > 0 ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";

    const extractionResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: imageUrls.length > 0 ? extractionContent : baseInstructions }],
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

    // Support both old single-action format and new multi-action format
    const actions: any[] = parsed.actions
      ? parsed.actions
      : parsed.action && parsed.action !== "none"
        ? [parsed]
        : [];

    if (actions.length === 0) return;

    for (const item of actions) {
      if (item.action === "update") {
        if (item.type === "meal" && item.id) {
          const updates: Record<string, any> = {};
          if (item.name) updates.name = item.name;
          if (item.calories != null) updates.calories = item.calories;
          if (item.protein != null) updates.protein = item.protein;
          if (item.carbs != null) updates.carbs = item.carbs;
          if (item.fats != null) updates.fats = item.fats;

          const { error } = await supabase.from("meals").update(updates).eq("id", item.id).eq("user_id", userId);
          if (error) console.error("Failed to update meal:", error);
          else console.log("Updated meal:", item.id, updates);
        } else if (item.type === "workout" && item.id) {
          const updates: Record<string, any> = {};
          if (item.name) updates.name = item.name;
          if (item.workout_type) updates.workout_type = item.workout_type;
          if (item.duration != null) updates.duration = item.duration;
          if (item.calories_burned != null) updates.calories_burned = item.calories_burned;

          const { error } = await supabase.from("workouts").update(updates).eq("id", item.id).eq("user_id", userId);
          if (error) console.error("Failed to update workout:", error);
          else console.log("Updated workout:", item.id, updates);
        }
      } else if (item.action === "create") {
        if (item.type === "meal") {
          const { error } = await supabase.from("meals").insert({
            user_id: userId,
            name: item.name || "Unnamed meal",
            calories: item.calories ?? null,
            protein: item.protein ?? null,
            carbs: item.carbs ?? null,
            fats: item.fats ?? null,
            source: "ai_estimate",
            meal_time: new Date().toISOString(),
          });
          if (error) console.error("Failed to insert meal:", error);
          else console.log("Auto-logged meal:", item.name);
        } else if (item.type === "workout") {
          const { error } = await supabase.from("workouts").insert({
            user_id: userId,
            name: item.name || "Unnamed workout",
            workout_type: item.workout_type || "other",
            duration: item.duration ?? null,
            calories_burned: item.calories_burned ?? null,
            source: "ai_estimate",
            completed_at: new Date().toISOString(),
          });
          if (error) console.error("Failed to insert workout:", error);
          else console.log("Auto-logged workout:", item.name);
        }
      }
    }
  } catch (e) {
    console.error("Extraction error:", e);
  }
}
