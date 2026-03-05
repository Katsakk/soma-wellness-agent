import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Authenticate user
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

    // Fetch user context in parallel
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

    // Calculate today's macro totals
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
- When data is missing, suggest they log meals or connect integrations.
- For workout generation, ask about available time, equipment, and location if not specified.
- Be encouraging but honest about gaps in their routine.
- Keep responses under 300 words unless the user asks for detail.
- When a user tells you about food they ate, confirm you've logged it for them.`;

    // Extract the last user message for meal detection
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop()?.content || "";

    // Fire meal extraction in parallel with the chat response (non-blocking)
    const mealExtractionPromise = extractAndLogMeal(lastUserMessage, userId, supabase, LOVABLE_API_KEY);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      // Wait for extraction to finish before returning error
      await mealExtractionPromise.catch(() => {});
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a transform stream that passes through the chat response
    // and waits for meal extraction to complete
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Pipe the response body through, and after it's done, ensure meal extraction completes
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
        // Wait for meal extraction to finish before closing
        await mealExtractionPromise.catch((e) => console.error("Meal extraction error:", e));
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

async function extractAndLogMeal(
  userMessage: string,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  apiKey: string
) {
  if (!userMessage || userMessage.length < 3) return;

  try {
    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a meal extraction assistant. Analyze the user's message and determine if they are describing food they ate, are eating, or plan to eat. If yes, extract meal details with estimated macros. If the message is NOT about food/eating (e.g. asking questions, discussing workouts, general chat), return {"is_meal": false}.

Return ONLY valid JSON, no markdown formatting, no code blocks. Use one of these formats:

If meal detected:
{"is_meal": true, "name": "descriptive meal name", "calories": number, "protein": number, "carbs": number, "fats": number}

If NOT a meal:
{"is_meal": false}

Be accurate with macro estimates. Use common nutritional databases as reference.`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!extractionResponse.ok) {
      console.error("Meal extraction API error:", extractionResponse.status);
      return;
    }

    const extractionData = await extractionResponse.json();
    const content = extractionData.choices?.[0]?.message?.content?.trim();
    if (!content) return;

    // Clean potential markdown code blocks
    const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch {
      console.error("Failed to parse meal extraction JSON:", cleanedContent);
      return;
    }

    if (!parsed.is_meal) return;

    // Insert the meal
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

    if (error) {
      console.error("Failed to insert meal:", error);
    } else {
      console.log("Auto-logged meal from chat:", parsed.name);
    }
  } catch (e) {
    console.error("Meal extraction error:", e);
  }
}
