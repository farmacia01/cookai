import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://nutraai.vercel.app',
  'https://www.nutraai.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Get CORS headers based on request origin
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mealDescription, language = 'pt' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!mealDescription || mealDescription.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Descrição da refeição é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Estimating macros for meal:', mealDescription);

    const systemPrompts: Record<string, string> = {
      pt: `Você é um nutricionista especializado em estimar valores nutricionais de refeições.

O usuário vai descrever uma refeição que comeu. Sua tarefa é estimar os macronutrientes dessa refeição.

IMPORTANTE:
- Seja realista nas estimativas baseado em porções típicas
- Se a descrição for vaga, assuma porções médias
- Considere ingredientes típicos do prato descrito

Responda APENAS com JSON válido no formato:
{
  "meal_name": "Nome padronizado da refeição",
  "calories": 500,
  "protein": 25,
  "carbs": 60,
  "fat": 15,
  "notes": "Breve explicação da estimativa"
}`,
      en: `You are a nutritionist specialized in estimating nutritional values of meals.

The user will describe a meal they ate. Your task is to estimate the macronutrients of that meal.

IMPORTANT:
- Be realistic in estimates based on typical portions
- If the description is vague, assume average portions
- Consider typical ingredients of the described dish

Respond ONLY with valid JSON in the format:
{
  "meal_name": "Standardized meal name",
  "calories": 500,
  "protein": 25,
  "carbs": 60,
  "fat": 15,
  "notes": "Brief explanation of the estimate"
}`,
      es: `Eres un nutricionista especializado en estimar valores nutricionales de comidas.

El usuario describirá una comida que consumió. Tu tarea es estimar los macronutrientes de esa comida.

IMPORTANTE:
- Sé realista en las estimaciones basadas en porciones típicas
- Si la descripción es vaga, asume porciones promedio
- Considera ingredientes típicos del plato descrito

Responde SOLO con JSON válido en el formato:
{
  "meal_name": "Nombre estandarizado de la comida",
  "calories": 500,
  "protein": 25,
  "carbs": 60,
  "fat": 15,
  "notes": "Breve explicación de la estimación"
}`
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompts[language] || systemPrompts['pt'] },
          { role: 'user', content: `Refeição: ${mealDescription}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const parsedMacros = JSON.parse(jsonContent);
    console.log('Estimated macros:', parsedMacros);

    return new Response(
      JSON.stringify(parsedMacros),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in estimate-meal-macros function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao estimar macros'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
