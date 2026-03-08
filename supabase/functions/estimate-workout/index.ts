import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a fitness activity estimation assistant. Given a workout or activity description, extract or estimate the key details. If calories aren't mentioned, estimate based on activity type, duration and typical intensity. Common estimates: HIIT 10-13 cal/min, running 8-12 cal/min, cycling 6-10 cal/min, strength 5-8 cal/min, yoga 3-5 cal/min, walking 4-6 cal/min.`,
          },
          {
            role: "user",
            content: `Extract workout details from this description: "${description.trim()}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "estimate_workout",
              description: "Return estimated workout details.",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "A clean, short workout name (e.g. 'Morning Run', 'HIIT Class', 'Strength Training')",
                  },
                  workout_type: {
                    type: "string",
                    enum: ["cardio", "strength", "hiit", "flexibility", "full_body", "upper_body", "lower_body", "sports", "other"],
                    description: "Best matching workout type category",
                  },
                  duration_minutes: {
                    type: "number",
                    description: "Duration in minutes",
                  },
                  calories_burned: {
                    type: "number",
                    description: "Estimated calories burned",
                  },
                },
                required: ["name", "workout_type", "duration_minutes", "calories_burned"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "estimate_workout" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to estimate workout" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workout = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(workout), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("estimate-workout error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
