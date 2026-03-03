import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const DIETARY_LABELS: Record<string, string> = {
  vegano: "Vegano (sem produtos de origem animal)",
  vegetariano: "Vegetariano (sem carne, mas permite laticínios e ovos)",
  sem_gluten: "Sem Glúten",
  sem_lactose: "Sem Lactose",
  alergia_amendoim: "Alergia a Amendoim (NUNCA use amendoim ou derivados)",
  alergia_frutos_mar: "Alergia a Frutos do Mar (NUNCA use peixes, camarões, mariscos, etc.)",
};

// Helper function to extract number from string like "215 kcal" or "14 g"
function extractNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove units and extract number
    const match = value.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
}

// Helper function to parse potentially malformed JSON (multiple objects separated by comma)
function parseMalformedJSON(jsonString: string): any[] {
  try {
    // First, try normal JSON parse
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    // If normal parse fails, try to extract multiple JSON objects
    console.log('Normal JSON parse failed, trying to extract multiple objects...');
    const recipes: any[] = [];
    let inString = false;
    let escapeNext = false;
    let currentObject = '';
    let braceCount = 0;
    let bracketCount = 0;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];

      if (escapeNext) {
        currentObject += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentObject += char;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        currentObject += char;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) {
            // Start of new object
            currentObject = '{';
          } else {
            currentObject += char;
          }
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          currentObject += char;
          if (braceCount === 0 && bracketCount === 0) {
            // Found a complete object
            try {
              const parsed = JSON.parse(currentObject);
              recipes.push(parsed);
              console.log(`Successfully parsed recipe object ${recipes.length}`);
            } catch (e) {
              console.error(`Failed to parse extracted object ${recipes.length + 1}:`, e instanceof Error ? e.message : 'Unknown error');
              console.error('Object preview:', currentObject.substring(0, 200));
            }
            currentObject = '';
            // Skip comma, whitespace, and newlines after object
            i++;
            while (i < jsonString.length && (jsonString[i] === ',' || jsonString[i] === ' ' || jsonString[i] === '\n' || jsonString[i] === '\r' || jsonString[i] === '\t')) {
              i++;
            }
            i--; // Adjust for loop increment
            continue;
          }
        } else if (char === '[') {
          bracketCount++;
          currentObject += char;
        } else if (char === ']') {
          bracketCount--;
          currentObject += char;
        } else if (braceCount > 0) {
          currentObject += char;
        }
      } else {
        // Inside string, always add character
        currentObject += char;
      }
    }

    // Handle case where we have a trailing object
    if (currentObject.trim() && braceCount === 0) {
      try {
        const parsed = JSON.parse(currentObject);
        recipes.push(parsed);
        console.log(`Successfully parsed final recipe object`);
      } catch (e) {
        console.error('Failed to parse trailing object:', e instanceof Error ? e.message : 'Unknown error');
      }
    }

    if (recipes.length > 0) {
      console.log(`Extracted ${recipes.length} recipes from malformed JSON`);
      return recipes;
    }

    // Last resort: try wrapping in array
    try {
      const wrapped = JSON.parse(`[${jsonString}]`);
      return Array.isArray(wrapped) ? wrapped : [wrapped];
    } catch (e) {
      console.error('All parsing attempts failed');
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Convert n8n Portuguese format to expected format
function convertN8NFormatToExpected(n8nRecipes: any[]): { recipes: any[], ingredients_found: string[] } {
  const ingredients_found: string[] = [];
  const recipes = n8nRecipes.map((recipe: any) => {
    // Extract ingredients from all recipes
    if (recipe.ingredientes_utilizados && Array.isArray(recipe.ingredientes_utilizados)) {
      recipe.ingredientes_utilizados.forEach((ing: string) => {
        if (!ingredients_found.includes(ing)) {
          ingredients_found.push(ing);
        }
      });
    }
    if (recipe.ingredientes_extras && Array.isArray(recipe.ingredientes_extras)) {
      recipe.ingredientes_extras.forEach((ing: string) => {
        if (!ingredients_found.includes(ing)) {
          ingredients_found.push(ing);
        }
      });
    }

    // Convert Portuguese format to English format
    const allIngredients = [
      ...(recipe.ingredientes_utilizados || []),
      ...(recipe.ingredientes_extras || [])
    ];

    // Convert passo_a_passo to instructions array
    let instructions: string[] = [];
    if (recipe.passo_a_passo) {
      if (Array.isArray(recipe.passo_a_passo)) {
        instructions = recipe.passo_a_passo;
      } else if (typeof recipe.passo_a_passo === 'string') {
        // Split by newlines or numbers
        instructions = recipe.passo_a_passo
          .split(/\n+|(?=\d+[\.\)])/)
          .map((step: string) => step.trim())
          .filter((step: string) => step.length > 0);
      }
    }

    // Extract nutritional values from tabela_nutricional or direct fields
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    if (recipe.tabela_nutricional) {
      calories = extractNumber(recipe.tabela_nutricional.calorias);
      protein = extractNumber(recipe.tabela_nutricional.proteinas);
      carbs = extractNumber(recipe.tabela_nutricional.carboidratos);
      fat = extractNumber(recipe.tabela_nutricional.gorduras);
    } else {
      // Fallback to direct fields
      calories = extractNumber(recipe.calorias || recipe.calories);
      protein = extractNumber(recipe.proteina || recipe.protein);
      carbs = extractNumber(recipe.carboidratos || recipe.carbs);
      fat = extractNumber(recipe.gorduras || recipe.fat);
    }

    return {
      title: recipe.nome_receita || recipe.title || 'Receita sem nome',
      description: recipe.dica_do_chef || recipe.description || '',
      prep_time: recipe.tempo_preparo || recipe.prep_time || '30 min',
      servings: recipe.porcoes || recipe.servings || 2,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      ingredients: allIngredients,
      instructions: instructions,
      difficulty: recipe.dificuldade || recipe.difficulty || 'Fácil'
    };
  });

  return { recipes, ingredients_found };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user ID from JWT token (since verify_jwt = true)
    let sessionId: string;
    let userId: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        // Initialize Supabase client to get user from JWT
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          userId = user.id;
        }
      } catch (authError) {
        console.log('Could not get user from auth, will generate session ID');
      }
    }

    // Generate session ID (use user ID if available, otherwise generate UUID)
    sessionId = userId || crypto.randomUUID();

    console.log('Request received, parsing body...');
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body');
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize input
    const {
      imageBase64,
      mode,
      dietaryRestrictions = [],
      usePantryBasics = true,
      language = 'pt',
      mealCategory = 'lunch',
      economyMode = false,
      nutritionalGoals
    } = requestBody;

    // Validate mode
    const validModes = ['faxina', 'monstro', 'seca'];
    if (typeof mode !== 'string' || !validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be faxina, monstro, or seca.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate language
    const validLanguages = ['pt', 'en', 'es'];
    if (typeof language !== 'string' || !validLanguages.includes(language)) {
      return new Response(
        JSON.stringify({ error: 'Invalid language. Must be pt, en, or es.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate mealCategory
    const validMealCategories = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (typeof mealCategory !== 'string' || !validMealCategories.includes(mealCategory)) {
      return new Response(
        JSON.stringify({ error: 'Invalid meal category.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate dietaryRestrictions
    if (!Array.isArray(dietaryRestrictions)) {
      return new Response(
        JSON.stringify({ error: 'dietaryRestrictions must be an array.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate imageBase64
    if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing image data.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit image size (e.g., max 10MB base64 encoded)
    if (imageBase64.length > 15 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Maximum size is 10MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect content type from base64 string
    let contentType = 'unknown';
    if (imageBase64) {
      if (imageBase64.startsWith('data:image/jpeg') || imageBase64.startsWith('data:image/jpg')) {
        contentType = 'image/jpeg';
      } else if (imageBase64.startsWith('data:image/png')) {
        contentType = 'image/png';
      } else if (imageBase64.startsWith('data:image/webp')) {
        contentType = 'image/webp';
      } else if (imageBase64.startsWith('data:image/gif')) {
        contentType = 'image/gif';
      } else if (imageBase64.startsWith('data:audio/')) {
        contentType = 'audio';
      } else if (imageBase64.startsWith('data:video/')) {
        contentType = 'video';
      } else if (imageBase64.startsWith('data:text/')) {
        contentType = 'text';
      } else if (imageBase64.startsWith('data:image/')) {
        contentType = 'image';
      }
    }

    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

    if (!N8N_WEBHOOK_URL) {
      console.error('N8N_WEBHOOK_URL environment variable is not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de geração de receitas não configurado. Contate o suporte.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Don't log webhook URL for security
    console.log('Processing recipe generation request');

    // Invalid image error messages by language
    const invalidImageErrors: Record<string, string> = {
      pt: "Não detectamos alimentos nesta foto. Por favor, envie uma foto da sua geladeira ou despensa.",
      en: "We didn't detect any food in this photo. Please send a photo of your fridge or pantry.",
      es: "No detectamos alimentos en esta foto. Por favor, envía una foto de tu refrigerador o despensa."
    };

    // Meal category translations
    const mealCategoryLabels: Record<string, Record<string, string>> = {
      pt: {
        breakfast: "Café da Manhã",
        lunch: "Almoço",
        dinner: "Jantar",
        snack: "Lanche"
      },
      en: {
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        snack: "Snack"
      },
      es: {
        breakfast: "Desayuno",
        lunch: "Almuerzo",
        dinner: "Cena",
        snack: "Merienda"
      }
    };

    // Economy mode instructions by language
    const economyInstructions: Record<string, string> = {
      pt: `\n\nMODO ECONOMIA ATIVADO: Priorize ingredientes que são tipicamente "da estação" (mais baratos) e ofertas locais comuns. Evite ingredientes exóticos ou caros (ex: substitua "Salmão" por "Tilápia" ou "Sardinha" se o foco for custo, a menos que o salmão esteja visível na foto). Prove que dieta fit é acessível. Use proteínas mais baratas como ovos, frango, atum em lata, e leguminosas.`,
      en: `\n\nECONOMY MODE ACTIVATED: Prioritize ingredients that are typically "in season" (cheaper) and common local deals. Avoid exotic or expensive ingredients (e.g., substitute "Salmon" with "Tilapia" or "Sardines" if cost is the focus, unless salmon is visible in the photo). Prove that a fit diet is affordable. Use cheaper proteins like eggs, chicken, canned tuna, and legumes.`,
      es: `\n\nMODO ECONOMÍA ACTIVADO: Prioriza ingredientes que son típicamente "de temporada" (más baratos) y ofertas locales comunes. Evita ingredientes exóticos o caros (ej: sustituye "Salmón" por "Tilapia" o "Sardinas" si el enfoque es el costo, a menos que el salmón sea visible en la foto). Demuestra que una dieta fit es accesible. Usa proteínas más baratas como huevos, pollo, atún en lata y legumbres.`
    };

    // Language-specific configurations
    const languageConfig: Record<string, {
      languageName: string;
      modeInstructions: Record<string, string>;
      dietaryIntro: string;
      pantryAvailable: string;
      pantryRestricted: string;
      systemRole: string;
      userPrompt: string;
      mealCategoryInstruction: string;
      imageValidation: string;
    }> = {
      pt: {
        languageName: 'Português',
        modeInstructions: {
          faxina: "Foque em usar TODOS os ingredientes identificados para evitar desperdício. Priorize ingredientes que parecem estar próximos do vencimento.",
          monstro: "Foque em receitas RICAS EM PROTEÍNA para ganho muscular. Priorize carnes, ovos, laticínios e leguminosas. Mínimo de 30g de proteína por porção.",
          seca: "Foque em receitas de BAIXA CALORIA e BAIXO CARBOIDRATO para queima de gordura. Máximo de 400 calorias e 20g de carboidratos por porção."
        },
        dietaryIntro: "RESTRIÇÕES ALIMENTARES OBRIGATÓRIAS (RESPEITE RIGOROSAMENTE):",
        pantryAvailable: "ITENS BÁSICOS DE DESPENSA DISPONÍVEIS:\nVocê pode assumir que o usuário tem acesso a itens básicos como: sal, pimenta, azeite/óleo, alho, cebola, vinagre, açúcar, farinha de trigo, ervas secas básicas (orégano, manjericão, etc.). Use-os livremente nas receitas.",
        pantryRestricted: "IMPORTANTE: Use APENAS os ingredientes que você consegue identificar na imagem. NÃO assuma que o usuário tem outros ingredientes disponíveis (nem mesmo itens básicos como sal ou óleo).",
        systemRole: "Você é um nutricionista especializado e chef de cozinha.",
        userPrompt: "Analise esta imagem da geladeira/despensa e gere receitas personalizadas baseadas nos ingredientes visíveis.",
        mealCategoryInstruction: "As receitas devem ser APROPRIADAS PARA",
        imageValidation: "PASSO 1 - VALIDAÇÃO OBRIGATÓRIA: Primeiro, analise se a imagem mostra claramente o interior de uma geladeira, uma despensa, ou um conjunto de alimentos visíveis. Se a imagem NÃO contiver alimentos identificáveis (ex: foto de pessoa, paisagem, objeto não relacionado a comida), você DEVE retornar APENAS este JSON: {\"error\": \"invalid_image\", \"message\": \"Não detectamos alimentos nesta foto\"}. NÃO invente ingredientes ou receitas se não houver alimentos na imagem."
      },
      en: {
        languageName: 'English',
        modeInstructions: {
          faxina: "Focus on using ALL identified ingredients to avoid waste. Prioritize ingredients that appear to be close to expiration.",
          monstro: "Focus on HIGH PROTEIN recipes for muscle building. Prioritize meats, eggs, dairy and legumes. Minimum 30g of protein per serving.",
          seca: "Focus on LOW CALORIE and LOW CARB recipes for fat burning. Maximum 400 calories and 20g of carbs per serving."
        },
        dietaryIntro: "MANDATORY DIETARY RESTRICTIONS (STRICTLY FOLLOW):",
        pantryAvailable: "BASIC PANTRY ITEMS AVAILABLE:\nYou can assume the user has access to basic items like: salt, pepper, olive oil/oil, garlic, onion, vinegar, sugar, wheat flour, basic dried herbs (oregano, basil, etc.). Use them freely in recipes.",
        pantryRestricted: "IMPORTANT: Use ONLY the ingredients you can identify in the image. DO NOT assume the user has other ingredients available (not even basic items like salt or oil).",
        systemRole: "You are a specialized nutritionist and chef.",
        userPrompt: "Analyze this image of the fridge/pantry and generate personalized recipes based on the visible ingredients.",
        mealCategoryInstruction: "Recipes must be APPROPRIATE FOR",
        imageValidation: "STEP 1 - MANDATORY VALIDATION: First, analyze if the image clearly shows the inside of a fridge, a pantry, or a set of visible food items. If the image does NOT contain identifiable food (e.g., photo of a person, landscape, object unrelated to food), you MUST return ONLY this JSON: {\"error\": \"invalid_image\", \"message\": \"No food detected in this photo\"}. DO NOT invent ingredients or recipes if there is no food in the image."
      },
      es: {
        languageName: 'Español',
        modeInstructions: {
          faxina: "Concéntrate en usar TODOS los ingredientes identificados para evitar el desperdicio. Prioriza los ingredientes que parecen estar cerca de su fecha de vencimiento.",
          monstro: "Concéntrate en recetas RICAS EN PROTEÍNA para el desarrollo muscular. Prioriza carnes, huevos, lácteos y legumbres. Mínimo 30g de proteína por porción.",
          seca: "Concéntrate en recetas BAJAS EN CALORÍAS y BAJAS EN CARBOHIDRATOS para quemar grasa. Máximo 400 calorías y 20g de carbohidratos por porción."
        },
        dietaryIntro: "RESTRICCIONES DIETÉTICAS OBLIGATORIAS (RESPETAR ESTRICTAMENTE):",
        pantryAvailable: "ARTÍCULOS BÁSICOS DE DESPENSA DISPONIBLES:\nPuedes asumir que el usuario tiene acceso a artículos básicos como: sal, pimienta, aceite de oliva/aceite, ajo, cebolla, vinagre, azúcar, harina de trigo, hierbas secas básicas (orégano, albahaca, etc.). Úsalos libremente en las recetas.",
        pantryRestricted: "IMPORTANTE: Usa SOLO los ingredientes que puedas identificar en la imagen. NO asumas que el usuario tiene otros ingredientes disponibles (ni siquiera artículos básicos como sal o aceite).",
        systemRole: "Eres un nutricionista especializado y chef de cocina.",
        userPrompt: "Analiza esta imagen de la nevera/despensa y genera recetas personalizadas basadas en los ingredientes visibles.",
        mealCategoryInstruction: "Las recetas deben ser APROPIADAS PARA",
        imageValidation: "PASO 1 - VALIDACIÓN OBLIGATORIA: Primero, analiza si la imagen muestra claramente el interior de una nevera, una despensa o un conjunto de alimentos visibles. Si la imagen NO contiene alimentos identificables (ej: foto de persona, paisaje, objeto no relacionado con comida), DEBES retornar SOLO este JSON: {\"error\": \"invalid_image\", \"message\": \"No detectamos alimentos en esta foto\"}. NO inventes ingredientes o recetas si no hay alimentos en la imagen."
      }
    };

    const config = languageConfig[language] || languageConfig['pt'];
    const mealLabel = (mealCategoryLabels[language] || mealCategoryLabels['pt'])[mealCategory] || mealCategory;

    // Build dietary restrictions text
    let dietaryText = "";
    if (dietaryRestrictions.length > 0) {
      const restrictions = dietaryRestrictions
        .map((r: string) => DIETARY_LABELS[r] || r)
        .join(", ");
      dietaryText = `\n\n${config.dietaryIntro}\n${restrictions}\n\n${language === 'pt' ? 'As receitas DEVEM respeitar TODAS essas restrições. Não inclua NENHUM ingrediente que viole essas restrições.' : language === 'en' ? 'Recipes MUST respect ALL these restrictions. Do NOT include ANY ingredient that violates these restrictions.' : 'Las recetas DEBEN respetar TODAS estas restricciones. NO incluya NINGÚN ingrediente que viole estas restricciones.'}`;
    }

    // Build pantry basics text
    const pantryText = usePantryBasics
      ? `\n\n${config.pantryAvailable}`
      : `\n\n${config.pantryRestricted}`;

    // Build meal category text
    const mealCategoryText = `\n\n${config.mealCategoryInstruction} ${mealLabel.toUpperCase()}. Generate recipes that are typical and suitable for this meal time.`;

    // Build economy mode text
    const economyText = economyMode ? (economyInstructions[language] || economyInstructions['pt']) : '';

    const systemPrompt = `${config.systemRole} Your task is:

${config.imageValidation}

PASSO 2 - SE HOUVER ALIMENTOS:
1. Analyze the fridge/pantry image and identify ALL visible ingredients
2. Create 3 healthy recipes using these ingredients

IMPORTANT: ALL OUTPUT MUST BE IN ${config.languageName.toUpperCase()}. Recipe titles, descriptions, ingredients, and instructions MUST be written in ${config.languageName}.

Selected mode: ${mode.toUpperCase()}
Specific instructions: ${config.modeInstructions[mode as keyof typeof config.modeInstructions]}${mealCategoryText}${dietaryText}${pantryText}${economyText}

IF the image is valid and contains food, respond with valid JSON in the following format:
{
  "ingredients_found": ["ingredient1", "ingredient2", ...],
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief and appetizing description",
      "prep_time": "XX min",
      "servings": 2,
      "calories": 350,
      "protein": 25,
      "carbs": 30,
      "fat": 12,
      "ingredients": ["200g chicken", "1 cup rice", ...],
      "instructions": ["Step 1", "Step 2", ...]
    }
  ]
}`;

    // Call n8n webhook with the same payload format
    const payload = {
      imageBase64,
      content_type: contentType,
      session_id: sessionId,
      mode,
      restricao: dietaryRestrictions, // Restrições alimentares
      meta: nutritionalGoals ? {
        calorias: typeof nutritionalGoals.calories === 'number' ? nutritionalGoals.calories : null,
        proteina: typeof nutritionalGoals.protein === 'number' ? nutritionalGoals.protein : null,
        carboidratos: typeof nutritionalGoals.carbs === 'number' ? nutritionalGoals.carbs : null,
        gorduras: typeof nutritionalGoals.fat === 'number' ? nutritionalGoals.fat : null
      } : null, // Metas nutricionais
      usePantryBasics: typeof usePantryBasics === 'boolean' ? usePantryBasics : true,
      language,
      mealCategory,
      economyMode: typeof economyMode === 'boolean' ? economyMode : false,
      systemPrompt,
      userPrompt: config.userPrompt
    };
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

    let response;
    try {
      response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log('n8n response status:', response.status);
    } catch (fetchError) {
      console.error('Failed to fetch n8n webhook:', fetchError);
      throw new Error(`Failed to connect to n8n: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos à sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
    }

    let data;
    try {
      const responseText = await response.text();
      console.log('n8n response received, length:', responseText.length);

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        console.error('n8n returned empty response');
        throw new Error('n8n webhook retornou uma resposta vazia. Verifique se o nó "Respond to Webhook" está configurado corretamente no workflow do n8n.');
      }

      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse n8n response:', parseError);
      if (parseError instanceof Error && parseError.message.includes('vazia')) {
        throw parseError;
      }
      throw new Error(`Falha ao processar resposta do n8n: ${parseError instanceof Error ? parseError.message : 'Resposta inválida ou vazia'}`);
    }

    console.log('n8n response data type:', typeof data);
    console.log('n8n response data keys:', Array.isArray(data) ? `Array[${data.length}]` : Object.keys(data));
    console.log('n8n response data (first 1000 chars):', JSON.stringify(data).substring(0, 1000));

    // Log structure for debugging
    if (data.output) {
      console.log('Found data.output, type:', typeof data.output);
      if (typeof data.output === 'string') {
        console.log('data.output is string, length:', data.output.length);
        console.log('data.output preview:', data.output.substring(0, 200));
      }
    }

    // n8n should return the response directly in the expected format
    // If it returns wrapped, we'll handle it
    let parsedResponse: any;

    // If n8n returns the response in a different format, try to extract it
    if (data.choices?.[0]?.message?.content) {
      // Handle if n8n returns in Lovable format
      const content = data.choices[0].message.content;
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }
      parsedResponse = JSON.parse(jsonContent);
    } else if (data.recipes && Array.isArray(data.recipes)) {
      // n8n returns in expected format directly
      console.log('n8n returned expected format with recipes array');
      parsedResponse = data;
    } else if (Array.isArray(data)) {
      // Check if array contains objects with 'output' field (n8n format)
      if (data.length > 0 && data[0] && typeof data[0] === 'object' && data[0].output) {
        console.log('n8n returned array with output fields, extracting...', 'Array length:', data.length);
        // Extract and parse output from each item
        const allRecipes: any[] = [];
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (item && item.output) {
            try {
              console.log(`Processing array item ${i}, output type:`, typeof item.output, 'length:', typeof item.output === 'string' ? item.output.length : 'N/A');

              let parsedOutput: any;
              if (typeof item.output === 'string') {
                // Use the malformed JSON parser to handle multiple objects
                const parsedArray = parseMalformedJSON(item.output);
                parsedOutput = parsedArray.length === 1 ? parsedArray[0] : parsedArray;
              } else {
                parsedOutput = item.output;
              }

              console.log(`Parsed output ${i}, type:`, Array.isArray(parsedOutput) ? 'Array' : typeof parsedOutput);

              // Check if parsedOutput is an array of recipes
              if (Array.isArray(parsedOutput)) {
                console.log(`Output ${i} is array with ${parsedOutput.length} items`);
                allRecipes.push(...parsedOutput);
              } else if (parsedOutput.receitas && Array.isArray(parsedOutput.receitas)) {
                console.log(`Output ${i} has receitas array with ${parsedOutput.receitas.length} items`);
                allRecipes.push(...parsedOutput.receitas);
              } else if (parsedOutput.nome_receita || parsedOutput.title) {
                // Single recipe object
                console.log(`Output ${i} is single recipe:`, parsedOutput.nome_receita || parsedOutput.title);
                allRecipes.push(parsedOutput);
              } else {
                console.log('Unexpected output format in array item:', Object.keys(parsedOutput || {}));
                console.log('Output preview:', JSON.stringify(parsedOutput).substring(0, 200));
              }
            } catch (parseError) {
              console.error(`Failed to parse output in array item ${i}:`, parseError);
              console.error('Raw output value (first 500 chars):', typeof item.output === 'string' ? item.output.substring(0, 500) : JSON.stringify(item.output).substring(0, 500));
              // Don't throw, continue processing other items
            }
          } else {
            console.log(`Array item ${i} has no output field or is invalid`);
          }
        }
        console.log('Extracted recipes from array output:', allRecipes.length);
        if (allRecipes.length > 0) {
          parsedResponse = convertN8NFormatToExpected(allRecipes);
        } else {
          throw new Error('No recipes found in n8n array output');
        }
      } else {
        // n8n returns array of recipes directly (Portuguese format)
        // Convert to expected format
        console.log('n8n returned array format, converting...', 'Array length:', data.length);
        parsedResponse = convertN8NFormatToExpected(data);
      }
    } else if (data.output) {
      // n8n returns in { output: "..." } format (stringified JSON)
      let output: any;
      try {
        // First, try to parse if it's a string
        if (typeof data.output === 'string') {
          console.log('n8n output is string, parsing...', 'Length:', data.output.length);
          // Use malformed JSON parser to handle multiple objects
          const parsedArray = parseMalformedJSON(data.output);
          output = parsedArray.length === 1 ? parsedArray[0] : parsedArray;
        } else {
          output = data.output;
        }

        console.log('Parsed n8n output, type:', Array.isArray(output) ? 'Array' : typeof output);
        console.log('Parsed n8n output keys:', Array.isArray(output) ? `Array[${output.length}]` : Object.keys(output));

        // Check if output contains receitas array (Portuguese format from n8n)
        if (output.receitas && Array.isArray(output.receitas)) {
          console.log('n8n returned output.receitas array format, converting...', 'Array length:', output.receitas.length);
          parsedResponse = convertN8NFormatToExpected(output.receitas);
        } else if (Array.isArray(output)) {
          // Direct array of recipes
          console.log('n8n returned output array format, converting...', 'Array length:', output.length);
          parsedResponse = convertN8NFormatToExpected(output);
        } else if (output.recipes && Array.isArray(output.recipes)) {
          // Already in expected format
          console.log('n8n returned output with recipes array');
          parsedResponse = output;
        } else {
          console.log('n8n output structure:', JSON.stringify(output).substring(0, 500));
          // Try to find receitas in nested structure
          if (output.data && output.data.receitas) {
            console.log('Found receitas in output.data.receitas');
            parsedResponse = convertN8NFormatToExpected(output.data.receitas);
          } else if (output.data && Array.isArray(output.data)) {
            console.log('Found array in output.data');
            parsedResponse = convertN8NFormatToExpected(output.data);
          } else {
            console.log('n8n output is not in expected format, trying as-is');
            parsedResponse = output;
          }
        }
      } catch (parseError) {
        console.error('Failed to parse n8n output:', parseError);
        console.error('Raw output value:', typeof data.output === 'string' ? data.output.substring(0, 500) : JSON.stringify(data.output).substring(0, 500));
        throw new Error(`Failed to parse n8n output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } else if (data.body) {
      // n8n might wrap response in body
      const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      if (Array.isArray(body)) {
        console.log('n8n returned body array format, converting...', 'Array length:', body.length);
        parsedResponse = convertN8NFormatToExpected(body);
      } else if (body.recipes && Array.isArray(body.recipes)) {
        console.log('n8n returned body with recipes array');
        parsedResponse = body;
      } else {
        console.log('n8n body is not array, using as-is');
        parsedResponse = body;
      }
    } else {
      // Try to parse as JSON string if needed
      try {
        parsedResponse = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsedResponse)) {
          console.log('n8n returned parsed array format, converting...', 'Array length:', parsedResponse.length);
          parsedResponse = convertN8NFormatToExpected(parsedResponse);
        } else if (!parsedResponse.recipes) {
          console.error('Invalid response format from n8n. Data:', JSON.stringify(parsedResponse).substring(0, 500));
          throw new Error(`Invalid response format from n8n. Expected recipes array or object with recipes, got: ${JSON.stringify(Object.keys(parsedResponse))}`);
        }
      } catch (parseError) {
        console.error('Failed to parse n8n response:', parseError);
        console.error('Raw data:', JSON.stringify(data).substring(0, 500));
        throw new Error(`Invalid response format from n8n: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }

    // Check if it's an invalid image error
    if (parsedResponse.error === 'invalid_image') {
      console.log('Invalid image detected by AI');
      return new Response(
        JSON.stringify({
          error: 'invalid_image',
          message: invalidImageErrors[language] || invalidImageErrors['pt']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure recipes and ingredients_found exist
    // If parsedResponse is already in the correct format from convertN8NFormatToExpected, use it
    if (!parsedResponse.recipes || !Array.isArray(parsedResponse.recipes)) {
      // Last attempt: check if parsedResponse itself is an array (shouldn't happen, but just in case)
      if (Array.isArray(parsedResponse)) {
        console.log('parsedResponse is array, converting...');
        parsedResponse = convertN8NFormatToExpected(parsedResponse);
      } else {
        console.error('Invalid response format: recipes is missing or not an array');
        console.error('Parsed response type:', typeof parsedResponse);
        console.error('Parsed response keys:', Array.isArray(parsedResponse) ? `Array[${parsedResponse.length}]` : Object.keys(parsedResponse || {}));
        console.error('Parsed response (first 1000 chars):', JSON.stringify(parsedResponse).substring(0, 1000));
        throw new Error('Invalid response format from n8n: recipes array is missing');
      }
    }

    if (!parsedResponse.ingredients_found) {
      parsedResponse.ingredients_found = [];
    }

    console.log('Final parsed response - recipes count:', parsedResponse.recipes.length);
    console.log('Final parsed response - ingredients found count:', parsedResponse.ingredients_found.length);

    console.log('Successfully parsed recipes:', parsedResponse.recipes.length);
    console.log('Ingredients found:', parsedResponse.ingredients_found.length);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recipes function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar imagem';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', errorStack);

    // Provide more helpful error messages
    let userFriendlyMessage = errorMessage;
    let statusCode = 500;

    if (errorMessage.includes('n8n webhook retornou uma resposta vazia') || errorMessage.includes('vazia')) {
      userFriendlyMessage = 'O serviço de geração de receitas não está respondendo corretamente. Por favor, verifique a configuração do workflow n8n ou tente novamente em alguns instantes.';
      statusCode = 503; // Service Unavailable
    } else if (errorMessage.includes('Failed to connect to n8n') || errorMessage.includes('connect')) {
      userFriendlyMessage = 'Não foi possível conectar ao serviço de geração de receitas. Verifique sua conexão e tente novamente.';
      statusCode = 503;
    } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
      userFriendlyMessage = 'Erro ao processar a resposta do serviço. Tente novamente ou entre em contato com o suporte.';
      statusCode = 502; // Bad Gateway
    }

    return new Response(
      JSON.stringify({
        error: userFriendlyMessage,
        details: 'Verifique se a imagem é válida e tente novamente. Se o problema persistir, entre em contato com o suporte.',
        originalError: Deno.env.get('ENVIRONMENT') === 'development' ? errorMessage : undefined,
        stack: Deno.env.get('ENVIRONMENT') === 'development' ? errorStack : undefined
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
