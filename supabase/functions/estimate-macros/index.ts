import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, image } = await req.json();
    const hasDescription = typeof description === "string" && description.trim().length > 0;
    const hasImage = typeof image === "string" && image.startsWith("data:");
    if (!hasDescription && !hasImage) {
      return new Response(JSON.stringify({ error: "Description or image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: `You are a precision nutrition estimation assistant using USDA FoodData Central reference values. Estimate macros accurately:
- Use cooked/prepared weights unless raw is specified.
- Realistic portions: a chicken breast = 150-180g cooked, a cup of rice = ~175g cooked.
- Restaurant meals: default to higher-end estimates (oils and sauces add hidden calories).
- Cross-check: protein×4 + carbs×4 + fats×9 must equal calories ±5%. Correct if needed.
- Estimate fiber from whole food content. Return 0 only for purely refined/processed foods.
- If quantities aren't specified, assume a typical single-serving portion for an adult.`,
          },
          {
            role: "user",
            content: hasImage
              ? [
                  { type: "image_url", image_url: { url: image } },
                  {
                    type: "text",
                    text: hasDescription
                      ? `Estimate the macros for this meal: "${description.trim()}"`
                      : "Estimate the macros for the food shown in this image.",
                  },
                ]
              : `Estimate the macros for this meal: "${description.trim()}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "estimate_macros",
              description: "Return estimated nutritional information for a meal.",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "A clean, short name for the meal (e.g. 'Grilled Chicken Salad')",
                  },
                  calories: {
                    type: "number",
                    description: "Estimated total calories (kcal)",
                  },
                  protein: {
                    type: "number",
                    description: "Estimated protein in grams",
                  },
                  carbs: {
                    type: "number",
                    description: "Estimated carbohydrates in grams",
                  },
                  fats: {
                    type: "number",
                    description: "Estimated fats in grams",
                  },
                  fiber: {
                    type: "number",
                    description: "Estimated dietary fiber in grams",
                  },
                },
                required: ["name", "calories", "protein", "carbs", "fats", "fiber"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "estimate_macros" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to estimate macros" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const macros = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(macros), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("estimate-macros error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
