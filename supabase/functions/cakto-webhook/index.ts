import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS (webhook should only accept from Cakto, but we keep CORS for error responses)
const ALLOWED_ORIGINS = [
  'https://nutraai.vercel.app',
  'https://www.nutraai.vercel.app',
];

// Get CORS headers based on request origin
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Validate webhook signature (if Cakto provides webhook secret)
async function validateWebhookSignature(req: Request, body: string): Promise<boolean> {
  const WEBHOOK_SECRET = Deno.env.get('CAKTO_WEBHOOK_SECRET');

  // If no secret is configured, we'll validate by checking request source
  if (!WEBHOOK_SECRET) {
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    console.warn('CAKTO_WEBHOOK_SECRET not configured. Using basic User-Agent/Referer validation.');
    return userAgent.includes('Cakto') || referer.includes('cakto.com.br');
  }

  // Validate signature header against the secret
  const signature = req.headers.get('x-cakto-signature')
    || req.headers.get('x-webhook-signature')
    || req.headers.get('authorization');

  if (!signature) {
    console.error('Webhook request missing signature header');
    return false;
  }

  // Compare: support both direct token match and Bearer token
  const token = signature.startsWith('Bearer ') ? signature.slice(7) : signature;

  if (token === WEBHOOK_SECRET) {
    return true;
  }

  // Try HMAC-SHA256 verification as fallback
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body)
    );
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (token === expectedHex || `sha256=${expectedHex}` === token) {
      return true;
    }
  } catch (hmacError) {
    console.error('HMAC validation failed:', hmacError);
  }

  console.error('Webhook signature validation failed');
  return false;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Plan ID to billing cycle (months)
const PLAN_TO_BILLING_CYCLE: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

// Map Cakto Offer IDs to Plan IDs
const OFFER_ID_TO_PLAN_ID: Record<string, string> = {
  [Deno.env.get('CAKTO_OFFER_MONTHLY') || '']: 'monthly',
  [Deno.env.get('CAKTO_OFFER_QUARTERLY') || '']: 'quarterly',
  [Deno.env.get('CAKTO_OFFER_ANNUAL') || '']: 'annual',
};

// Also map by checkout link IDs (fallback)
const CHECKOUT_ID_TO_PLAN_ID: Record<string, string> = {
  'nu5sb4x_693458': 'monthly',
  'mabpy8g': 'quarterly',
  '32ath4t': 'annual',
};

// Map Cakto events to internal event types
const CAKTO_EVENT_MAP: Record<string, string> = {
  'purchase_approved': 'order.paid',
  'purchase_refunded': 'order.refunded',
  'purchase_cancelled': 'order.cancelled',
  'order.paid': 'order.paid',
  'order_approved': 'order.paid',
  'order.refunded': 'order.refunded',
  'order_refunded': 'order.refunded',
  'order.cancelled': 'order.cancelled',
  'order_cancelled': 'order.cancelled',
};

// Calculate credits: 30 credits per month of billing cycle
function calculateCredits(billingCycleMonths: number): number {
  return billingCycleMonths * 30;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Log the incoming request for debugging (without sensitive data)
  console.log('Webhook received:', {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    contentType: req.headers.get('content-type'),
  });

  try {
    // Get request body for signature validation
    const bodyText = await req.text();

    // Validate webhook signature/authenticity
    const isValid = await validateWebhookSignature(req, bodyText);
    if (!isValid) {
      console.error('Invalid webhook signature or unauthorized source');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body after validation
    const body = JSON.parse(bodyText);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      throw new Error('Supabase credentials are not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Body already parsed above
    console.log('Processing Cakto webhook event:', {
      event: body.event || body.type,
      orderId: body.data?.id || body.order?.id,
      hasData: !!body.data,
    });

    // Extract event type and order data
    // Cakto sends: { event: "purchase_approved", data: { ... } }
    const rawEventType = body.event || body.type || body.event_type;
    const eventType = CAKTO_EVENT_MAP[rawEventType] || rawEventType;
    const order = body.data || body.order || body;

    console.log('Event mapping:', { rawEventType, eventType });

    if (!eventType) {
      console.error('No event type in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing event type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order || !order.id) {
      console.error('No order data in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing order data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderId = order.id;
    const metadata = order.metadata || {};

    // Get customer email from Cakto webhook structure
    const customerEmail = order.customer?.email || order.customer_email || order.email || metadata.email;

    if (!customerEmail) {
      console.error('No customer email found in webhook:', order);
      return new Response(
        JSON.stringify({ error: 'Missing customer email in webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRIORIDADE 1: Extrair do checkoutUrl (se disponível) - USANDO LINKS DE CHECKOUT
    let planId: string | undefined;
    let offerId: string | undefined;

    if (order.checkoutUrl) {
      const checkoutMatch = order.checkoutUrl.match(/pay\.cakto\.com\.br\/([^/?]+)/);
      if (checkoutMatch) {
        const checkoutId = checkoutMatch[1];
        planId = CHECKOUT_ID_TO_PLAN_ID[checkoutId];
        offerId = checkoutId; // Usar o ID do checkout como offerId
        console.log('Mapped plan from checkoutUrl:', { checkoutId, planId });
      }
    }

    // PRIORIDADE 2: Se não encontrou pelo checkoutUrl, tentar pelo refId
    if (!planId && order.refId) {
      planId = CHECKOUT_ID_TO_PLAN_ID[order.refId];
      if (planId) {
        offerId = order.refId;
        console.log('Mapped plan from refId:', { refId: order.refId, planId });
      }
    }

    // PRIORIDADE 3: Se ainda não encontrou, tentar pelo offer.id (pode ser ID interno ou do checkout)
    if (!planId) {
      offerId = order.offer?.id || order.offer_id || metadata.offer_id;

      if (offerId) {
        // Tentar mapear pelo offer.id (pode ser o ID do checkout ou ID interno)
        planId = OFFER_ID_TO_PLAN_ID[offerId] || CHECKOUT_ID_TO_PLAN_ID[offerId];
        console.log('Mapped plan from offer.id:', { offerId, planId });
      }
    }

    // Try to get userId from metadata first (if set via API)
    let userId = metadata.userId || metadata.user_id || order.user_id;

    // If not in metadata, find user by email
    if (!userId && customerEmail) {
      try {
        console.log('Looking up user by email:', customerEmail);
        // Use Supabase Admin API to find user by email
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();

        if (userError) {
          console.error('Error listing users:', userError);
        } else if (users && users.users) {
          const foundUser = users.users.find(u =>
            u.email?.toLowerCase() === customerEmail.toLowerCase()
          );

          if (foundUser) {
            userId = foundUser.id;
            console.log('Found user by email:', userId);
          } else {
            console.warn('User not found with email:', customerEmail);
          }
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    // Log for debugging
    console.log('Extracted webhook data:', {
      eventType: rawEventType,
      mappedEventType: eventType,
      orderId,
      offerId,
      planId,
      customerEmail,
      userId,
      checkoutUrl: order.checkoutUrl,
      refId: order.refId,
      hasMetadata: !!metadata,
      metadataKeys: Object.keys(metadata || {}),
    });

    if (!userId) {
      console.error('Could not identify user. Email:', customerEmail);
      return new Response(
        JSON.stringify({
          error: `User not found with email: ${customerEmail}. Please ensure the customer uses the same email registered in Cook AI.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!planId) {
      console.error('Could not map checkout/offer to plan ID. CheckoutUrl:', order.checkoutUrl, 'Offer ID:', offerId, 'RefId:', order.refId);
      return new Response(
        JSON.stringify({
          error: `Could not identify plan. CheckoutUrl: ${order.checkoutUrl || 'N/A'}, Offer ID: ${offerId || 'N/A'}, RefId: ${order.refId || 'N/A'}. Please verify the checkout links are correct.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different event types
    switch (eventType) {
      case 'order.paid':
      case 'order_approved':
      case 'paid':
      case 'purchase_approved': {
        // offerId already extracted above
        const billingCycleMonths = PLAN_TO_BILLING_CYCLE[planId] || 1;
        const credits = calculateCredits(billingCycleMonths);

        // Determine product name from planId
        const productNameMap: Record<string, string> = {
          monthly: 'Mensal',
          quarterly: 'Trimestral',
          annual: 'Anual',
        };
        const productName = productNameMap[planId] || planId;

        // Calculate period dates if available
        // Cakto webhook provides: paidAt, createdAt, subscription.next_payment_date
        let periodStart: string | null = null;
        let periodEnd: string | null = null;

        const startDate = order.paidAt || order.paid_at || order.createdAt || order.created_at;
        if (startDate) {
          periodStart = new Date(startDate).toISOString();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + billingCycleMonths);
          periodEnd = endDate.toISOString();
        }

        // If subscription has next_payment_date, use it as period_end
        if (order.subscription?.next_payment_date) {
          periodEnd = new Date(order.subscription.next_payment_date).toISOString();
        }

        // Upsert subscription using the database function
        // offerId pode ser o ID do checkout (nu5sb4x_693458, mabpy8g, 32ath4t) ou ID interno da oferta
        const { error: dbError } = await supabase.rpc('upsert_subscription', {
          p_user_id: userId,
          p_cakto_order_id: orderId,
          p_cakto_offer_id: offerId || order.checkoutUrl?.match(/pay\.cakto\.com\.br\/([^/?]+)/)?.[1] || order.refId,
          p_cakto_customer_email: customerEmail,
          p_product_id: planId,
          p_product_name: productName,
          p_status: 'active',
          p_credits: credits,
          p_billing_cycle_months: billingCycleMonths,
          p_auto_renew: true,
          p_current_period_start: periodStart,
          p_current_period_end: periodEnd,
        });

        if (dbError) {
          console.error('Error upserting subscription:', dbError);
          throw dbError;
        }

        console.log('Subscription created/updated successfully:', orderId);

        // Award referral points if this user was referred by someone
        try {
          const { data: awarded } = await supabase.rpc('award_referral_points', {
            p_referred_user_id: userId,
          });
          if (awarded) {
            console.log('Referral points awarded for user:', userId);
          }
        } catch (refError) {
          console.error('Error awarding referral points (non-fatal):', refError);
        }

        break;
      }

      case 'order.refunded':
      case 'order_refunded':
      case 'refunded': {
        // Find subscription by cakto_order_id
        const { data: existingSub, error: findError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('cakto_order_id', orderId)
          .maybeSingle();

        if (findError) {
          console.error('Error finding subscription:', findError);
          break;
        }

        if (!existingSub) {
          console.log('Subscription not found in database, skipping update');
          break;
        }

        // Update subscription to inactive
        const { error: updateError } = await supabase.rpc('upsert_subscription', {
          p_user_id: existingSub.user_id,
          p_cakto_order_id: orderId,
          p_status: 'inactive',
          p_credits: 0,
          p_auto_renew: false,
        });

        if (updateError) {
          console.error('Error deactivating subscription:', updateError);
          throw updateError;
        }

        console.log('Subscription deactivated successfully:', orderId);
        break;
      }

      case 'order.cancelled':
      case 'order_cancelled':
      case 'cancelled': {
        // Find subscription by cakto_order_id
        const { data: existingSub, error: findError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('cakto_order_id', orderId)
          .maybeSingle();

        if (findError) {
          console.error('Error finding subscription:', findError);
          break;
        }

        if (!existingSub) {
          console.log('Subscription not found in database, skipping update');
          break;
        }

        // Update subscription to inactive
        const { error: updateError } = await supabase.rpc('upsert_subscription', {
          p_user_id: existingSub.user_id,
          p_cakto_order_id: orderId,
          p_status: 'inactive',
          p_credits: 0,
          p_auto_renew: false,
        });

        if (updateError) {
          console.error('Error cancelling subscription:', updateError);
          throw updateError;
        }

        console.log('Subscription cancelled successfully:', orderId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

