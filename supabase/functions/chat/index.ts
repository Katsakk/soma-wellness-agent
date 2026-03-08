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

    const proteinGap = Math.max(0, (goals[0]?.target_protein || 150) - todayTotals.protein);

    const systemPrompt = `You are SOMA Coach — a precision nutrition and fitness coach for ${displayName}. You operate with the rigour of a registered dietitian and certified personal trainer, grounded in peer-reviewed evidence.

## Core Principles
- **Accuracy above all.** Every calorie and macro estimate must be based on verified nutritional data (USDA FoodData Central standards). Explain your reasoning: portion size × food density × macro per gram.
- **Be direct and specific.** No vague encouragement. If ${displayName} is under on protein, say exactly how many grams short and exactly what food would close it.
- **Strict but supportive.** Hold the user accountable like a professional coach — honest, not harsh.
- **Concise.** Under 180 words unless detail is requested. Use bullets and bold for key numbers.
- One emoji maximum per response, only when it adds genuine warmth.

## Calorie & Macro Estimation Standards
- Use cooked/prepared weights unless raw is specified.
- Realistic portions: cooked chicken breast = 150–180g, not 100g. Restaurant meals: default to higher-end estimates (oils/sauces add hidden calories).
- Protein: 4 kcal/g | Carbs: 4 kcal/g | Fat: 9 kcal/g | Fibre: 2 kcal/g (fermentable).
- Cross-check: macros × kcal/g must equal total calories ±5%. Correct if they don't.
- Always estimate fibre for whole foods. Flag fibre-poor meals.
- For images: identify every visible item, estimate weight/volume per item, then sum totals.

## Strict Rules
- Flag nutritionally poor meals clearly and suggest a better alternative.
- Proactively flag nutrient gaps with exact numbers every response.
- Never approve a plan below 1200 kcal/day (female) or 1500 kcal/day (male).
- For injury, illness, disordered eating: empathise briefly, direct to a qualified professional.

## User Context
**Goal:** ${goals.length > 0 ? goals.map((g) => `${g.goal_type} | ${g.target_calories || "—"} kcal | ${g.target_protein || "—"}g protein | ${g.target_carbs || "—"}g carbs | ${g.target_fats || "—"}g fat | ${g.exercise_days_per_week || "?"}x/week`).join("; ") : "No goals set — prompt them to set goals in Profile."}

**Preferences:** ${prefs ? `Diet: ${(prefs.dietary_preferences || []).join(", ") || "none"} | Workout: ${(prefs.workout_preferences || []).join(", ") || "none"} | Units: ${prefs.units || "metric"}` : "No preferences set."}

**Today's intake:** ${todayMeals.length > 0 ? `${todayTotals.calories} kcal | ${todayTotals.protein}g protein | ${todayTotals.carbs}g carbs | ${todayTotals.fats}g fat — ${todayMeals.length} meal(s): ${todayMeals.map((m) => `${m.name} (${m.calories || "?"}cal)`).join(", ")}` : "Nothing logged yet."}${proteinGap > 0 ? ` — ${proteinGap}g protein still needed today.` : ""}

**Recent workouts (7 days):** ${recentWorkouts.length > 0 ? recentWorkouts.map((w) => `${w.name} (${w.workout_type || "general"}, ${w.duration || "?"}min, ${w.calories_burned || "?"}cal)`).join("; ") : "None."}

**Remembered facts:** ${memories.length > 0 ? memories.map((m) => m.fact).join("; ") : "None yet."}

## Response Rules
- Always use real logged data — never fabricate numbers.
- Food logged (text or image): confirm saved, show concise macro breakdown with fibre.
- Workout logged: confirm saved, give precise feedback.
- Corrections: update the existing entry, never duplicate.
- End every actionable message with one clear next step.`;

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

## MEAL TYPE DETECTION
Detect the meal type from context clues in the message:
- Words like "breakfast", "morning meal", "woke up and had" → "breakfast"
- Words like "lunch", "midday", "noon meal" → "lunch"
- Words like "dinner", "supper", "evening meal", "tonight" → "dinner"
- Words like "snack", "between meals", "quick bite" → "snack"
- If the user explicitly names a meal type, ALWAYS use it — do NOT default to breakfast.
- If unclear and it is morning hours context, use "breakfast". Otherwise use the most likely type or "snack".

## ESTIMATION RULES (follow precisely)
MEALS — you MUST provide all of:
- calories: Use USDA FoodData Central reference values. Cooked weight unless stated raw. Restaurant meals: use higher-end estimates (oils/sauces). Cross-check: protein×4 + carbs×4 + fats×9 must equal calories ±5%.
- protein: grams
- carbs: grams
- fats: grams
- fiber: grams — estimate from whole food content (e.g. 1 cup cooked oats ≈ 4g, 1 banana ≈ 3g, white rice ≈ 0.5g/100g). Never omit.
NEVER return null for any meal field. Use your best evidence-based estimate.

WORKOUTS — you MUST provide:
- calories_burned: Use MET-based calculation (MET × weight_kg × hours). Assume 75kg if unknown. Running 8km/h = MET 8.0, HIIT = MET 8.0–10.0, strength training = MET 3.5–6.0, yoga = MET 2.5–4.0.

Return ONLY valid JSON (no markdown). Always return an object with an "actions" array containing ALL extracted activities:

{"actions": [
  {"action": "create", "type": "meal", "name": "meal name", "meal_type": "breakfast|lunch|dinner|snack", "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number},
  {"action": "create", "type": "workout", "name": "workout name", "workout_type": "cardio|strength|flexibility|sports|hiit|other", "duration": number_in_minutes, "calories_burned": number},
  {"action": "update", "type": "meal", "id": "existing-meal-id", "calories": number, "fiber": number},
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
            fiber: item.fiber ?? null,
            source: "ai_estimate",
            meal_time: new Date().toISOString(),
            notes: item.meal_type ? `[${item.meal_type}]` : null,
          });
          if (error) console.error("Failed to insert meal:", error);
          else console.log("Auto-logged meal:", item.name, "type:", item.meal_type);
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
