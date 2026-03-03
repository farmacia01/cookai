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

const CAKTO_CLIENT_ID = Deno.env.get('CAKTO_CLIENT_ID');
const CAKTO_CLIENT_SECRET = Deno.env.get('CAKTO_CLIENT_SECRET');
const CAKTO_API_KEY = Deno.env.get('CAKTO_API_KEY'); // Alternative: API key authentication
const CAKTO_API_URL = 'https://api.cakto.com.br';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Plan ID to Cakto Offer ID mapping
const PLAN_TO_OFFER_ID: Record<string, string> = {
  monthly: Deno.env.get('CAKTO_OFFER_MONTHLY') || '',
  quarterly: Deno.env.get('CAKTO_OFFER_QUARTERLY') || '',
  annual: Deno.env.get('CAKTO_OFFER_ANNUAL') || '',
};

// Plan ID to billing cycle (months)
const PLAN_TO_BILLING_CYCLE: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

// Get OAuth2 access token from Cakto
async function getCaktoAccessToken(): Promise<string> {
  if (!CAKTO_CLIENT_ID || !CAKTO_CLIENT_SECRET) {
    throw new Error('CAKTO_CLIENT_ID or CAKTO_CLIENT_SECRET is not configured');
  }

  // Log credential status (without exposing secrets)
  console.log('Cakto credentials status:', {
    hasClientId: !!CAKTO_CLIENT_ID,
    hasClientSecret: !!CAKTO_CLIENT_SECRET,
  });

  // Cakto API authentication endpoint (from official documentation)
  // Documentation: https://docs.cakto.com.br/authentication
  const tokenEndpoint = `${CAKTO_API_URL}/public_api/token/`;

  try {
    console.log(`Requesting Cakto access token from: ${tokenEndpoint}`);
    
    // Build request body - try both URLSearchParams and string format
    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CAKTO_CLIENT_ID,
      client_secret: CAKTO_CLIENT_SECRET,
    });
    
    const bodyString = bodyParams.toString();
    // Don't log request details that might expose sensitive information
    console.log('Sending authentication request to Cakto');
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: bodyString,
    });
    
    console.log('Cakto response status:', response.status);
    console.log('Cakto response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('Successfully obtained access token');
      // Cakto may return 'access_token' or 'token' field
      return data.access_token || data.token || data.accessToken;
    } else {
      const errorText = await response.text();
      let errorMessage = `Failed to get Cakto access token: ${response.status} ${errorText}`;
      
      // Provide more helpful error messages
      if (response.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error === 'unauthorized_client') {
            errorMessage = `Cakto authentication failed: Invalid credentials or insufficient permissions.

SOLUÇÃO:
1. Verifique se CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET estão corretos no Supabase Edge Functions Secrets
2. No Painel Cakto (https://painel.cakto.com.br), vá em Configurações → API
3. Verifique se a chave de API está ATIVA (não revogada)
4. Verifique se os ESCOPOS DE ACESSO estão configurados:
   - ✅ Pedidos (Orders) - para criar pedidos
   - ✅ Ofertas (Offers) - para ler ofertas
   - ✅ Produtos (Products) - para ler produtos
5. Se os escopos não estiverem configurados, você precisa criar uma NOVA chave de API com os escopos corretos
6. Após criar a nova chave, atualize CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET no Supabase`;
          } else if (errorData.error === 'unsupported_grant_type') {
            errorMessage = `Cakto authentication failed: Unsupported grant type.

O código está enviando 'grant_type: client_credentials', mas a Cakto não está aceitando.
Verifique os logs da Edge Function para confirmar que o grant_type está sendo enviado.
Se o problema persistir, entre em contato com o suporte da Cakto.`;
          }
        } catch (e) {
          // If errorText is not JSON, use it as is
        }
      } else if (response.status === 401) {
        errorMessage = `Cakto authentication failed: Unauthorized. Please check your CAKTO_CLIENT_ID and CAKTO_CLIENT_SECRET.`;
      }
      
      console.error(`Cakto token endpoint returned ${response.status}: ${errorText}`);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error requesting Cakto access token:', error);
    
    // If OAuth2 fails and API key is available, use it as fallback
    if (CAKTO_API_KEY) {
      console.log('OAuth2 failed, using API key authentication instead');
      return CAKTO_API_KEY;
    }
    
    throw error instanceof Error ? error : new Error(String(error));
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if we have either OAuth2 credentials or API key
    if ((!CAKTO_CLIENT_ID || !CAKTO_CLIENT_SECRET) && !CAKTO_API_KEY) {
      throw new Error('Cakto credentials are not configured. Please set either CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET (for OAuth2) or CAKTO_API_KEY (for API key auth)');
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { planId, userId, email } = requestBody;
    
    // Validate and sanitize input
    if (typeof planId !== 'string' || !['monthly', 'quarterly', 'annual'].includes(planId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid planId. Must be monthly, quarterly, or annual.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (typeof userId !== 'string' || userId.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Sanitize email
    const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    
    console.log('Creating Cakto order for plan:', planId);

    // Validate email format more strictly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const offerId = PLAN_TO_OFFER_ID[planId];
    if (!offerId || offerId.trim() === '') {
      const envVarName = `CAKTO_OFFER_${planId.toUpperCase()}`;
      return new Response(
        JSON.stringify({ 
          error: `Offer ID not configured for plan "${planId}". Please set ${envVarName} environment variable in Supabase Edge Functions settings.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token (or API key)
    let accessToken: string;
    try {
      accessToken = await getCaktoAccessToken();
    } catch (error) {
      // If OAuth2 fails but API key is available, use it
      if (CAKTO_API_KEY) {
        console.log('OAuth2 failed, using API key instead');
        accessToken = CAKTO_API_KEY;
      } else {
        throw error;
      }
    }

    // Get origin from request headers
    const origin = req.headers.get('origin') || 'https://nutraai.vercel.app';
    const successUrl = `${origin}/cakto-success?order_id={order_id}`;
    const cancelUrl = `${origin}/precos`;

    // Create order in Cakto
    // Based on Cakto API documentation: https://docs.cakto.com.br/introduction
    // URL Base: https://api.cakto.com.br/
    // Try different possible API endpoints (documentation doesn't specify exact endpoint for creating orders)
    const possibleEndpoints = [
      `${CAKTO_API_URL}/api/offers/${offerId}/orders`,
      `${CAKTO_API_URL}/api/orders`, // Alternative: create order directly
      `${CAKTO_API_URL}/v1/offers/${offerId}/orders`,
      `${CAKTO_API_URL}/offers/${offerId}/orders`,
    ];

    let orderResponse: Response | null = null;
    let lastOrderError: Error | null = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying to create order at: ${endpoint}`);
        
        orderResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            offer_id: offerId, // Include offer_id in body if using /api/orders endpoint
            customer_email: sanitizedEmail,
            metadata: {
              userId,
              planId,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        });

        if (orderResponse.ok) {
          break; // Success, exit loop
        } else {
          const errorText = await orderResponse.text();
          console.log(`Endpoint ${endpoint} returned ${orderResponse.status}: ${errorText}`);
          lastOrderError = new Error(`Cakto API error: ${orderResponse.status}. ${errorText}`);
        }
      } catch (error) {
        console.log(`Error trying endpoint ${endpoint}:`, error);
        lastOrderError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!orderResponse || !orderResponse.ok) {
      const errorText = lastOrderError?.message || 'Unknown error';
      console.error('Cakto API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Cakto API error: ${errorText}. Please check the API endpoint and authentication method.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = await orderResponse.json();
    
    // Extract checkout URL from order response
    // The exact field name may vary - adjust based on Cakto API response
    const checkoutUrl = orderData.checkout_url || orderData.url || orderData.payment_url;
    
    if (!checkoutUrl) {
      console.error('No checkout URL in Cakto response:', orderData);
      return new Response(
        JSON.stringify({ 
          error: 'No checkout URL returned from Cakto API. Please check the API response format.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        url: checkoutUrl,
        order_id: orderData.id || orderData.order_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Cakto order:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create Cakto order' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

