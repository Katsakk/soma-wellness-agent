import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlaceInput {
  name: string;
  types: string[];
  rating?: number;
  distance?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { section, places, userId } = await req.json();

    if (!section || !places || !userId) {
      return new Response(JSON.stringify({ error: "section, places, and userId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user context
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [mealsRes, workoutsRes, goalsRes] = await Promise.all([
      supabase.from("meals").select("name, calories, protein, carbs, fats, fiber").eq("user_id", userId).gte("meal_time", todayStart.toISOString()),
      supabase.from("workouts").select("name, workout_type, duration, calories_burned").eq("user_id", userId).gte("completed_at", todayStart.toISOString()).lte("completed_at", new Date().toISOString()),
      supabase.from("goals").select("target_calories, target_protein, target_carbs, target_fats, goal_type, exercise_days_per_week").eq("user_id", userId).eq("is_active", true).limit(1),
    ]);

    const meals = mealsRes.data || [];
    const workouts = workoutsRes.data || [];
    const goal = (goalsRes.data?.[0] as any) || {};

    const totalCals = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
    const totalProtein = meals.reduce((s: number, m: any) => s + (Number(m.protein) || 0), 0);
    const totalCarbs = meals.reduce((s: number, m: any) => s + (Number(m.carbs) || 0), 0);
    const totalFats = meals.reduce((s: number, m: any) => s + (Number(m.fats) || 0), 0);
    const totalWorkoutMin = workouts.reduce((s: number, w: any) => s + (w.duration || 0), 0);

    const targetCals = goal.target_calories || 2000;
    const targetProtein = goal.target_protein || 150;
    const goalType = goal.goal_type || "general wellness";

    // Build place list for prompt
    const placesSummary = (places as PlaceInput[])
      .slice(0, 8)
      .map((p, i) => `${i + 1}. ${p.name} (${p.types?.[0] || "venue"}${p.rating ? `, rated ${p.rating}` : ""}${p.distance ? `, ${Math.round(p.distance)}m away` : ""})`)
      .join("\n");

    const systemPrompt = section === "meals"
      ? `You are a precision nutrition coach. Given a user's nutrition data and nearby restaurants, provide a brief personalised insight and a one-line reason for each restaurant. Be specific, data-driven, and concise.`
      : `You are a fitness coach. Given a user's activity data and nearby fitness venues, provide a brief personalised insight and a one-line reason for each venue. Be specific and motivating.`;

    const userPrompt = section === "meals"
      ? `User data today:
- Calories consumed: ${totalCals} / ${targetCals} kcal target
- Protein: ${totalProtein}g / ${targetProtein}g target
- Carbs: ${totalCarbs}g, Fats: ${totalFats}g
- Goal: ${goalType}
- Workouts today: ${workouts.length > 0 ? workouts.map((w: any) => w.name).join(", ") : "none logged"}

Nearby restaurants:
${placesSummary}

Return a JSON object with:
- "insight": 1-2 sentence summary of what the user needs nutritionally and why these restaurants are relevant
- "explanations": an object mapping restaurant name (exactly as given) to a 1-sentence reason why it suits the user's goals today

Keep each explanation under 12 words. Focus on the user's actual gaps (protein, calories, etc.).`
      : `User data today:
- Workouts logged: ${workouts.length} (${totalWorkoutMin} min total)
- Workout types: ${workouts.map((w: any) => w.workout_type).join(", ") || "none"}
- Goal: ${goalType}
- Exercise days target: ${goal.exercise_days_per_week || 3} days/week
- Calories consumed: ${totalCals} / ${targetCals} kcal

Nearby fitness venues:
${placesSummary}

Return a JSON object with:
- "insight": 1-2 sentence summary of today's activity and why these venues are relevant
- "explanations": an object mapping venue name (exactly as given) to a 1-sentence reason why it suits the user today

Keep each explanation under 12 words. Be encouraging and specific.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ideas-insight error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
