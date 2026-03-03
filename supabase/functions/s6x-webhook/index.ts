import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

// HMAC-SHA256 signature verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return expected === signature;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const WEBHOOK_SECRET = Deno.env.get("S6X_WEBHOOK_SECRET");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Read raw body for signature verification
        const rawBody = await req.text();
        console.log("S6X Webhook received:", rawBody);

        // Validate webhook signature
        const signature = req.headers.get("x-webhook-signature");
        if (WEBHOOK_SECRET && signature) {
            const isValid = await verifySignature(rawBody, signature, WEBHOOK_SECRET);
            if (!isValid) {
                console.error("Invalid webhook signature");
                return new Response(
                    JSON.stringify({ error: "Invalid signature" }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            console.log("Webhook signature verified ✓");
        }

        const body = JSON.parse(rawBody);

        // Webhook payload fields (from S6X docs):
        // event: "payment.confirmed"
        // transaction_id, type, status, amount, fee, net_amount
        // customer: { name, email, document }
        // metadata: { user_id, plan_id, ... }
        const event = body.event;
        const transactionId = body.transaction_id;
        const status = body.status;
        const metadata = body.metadata || {};
        const userId = metadata.user_id;
        const planId = metadata.plan_id;

        console.log(`Event: ${event}, Status: ${status}, User: ${userId}, Plan: ${planId}`);

        if (!userId || !planId) {
            console.error("Missing user_id or plan_id in metadata:", metadata);
            return new Response(
                JSON.stringify({ error: "Metadata sem user_id ou plan_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Only process confirmed payments
        if (event === "payment.confirmed" || status === "paid" || status === "approved") {
            console.log(`Payment confirmed for user ${userId}, plan ${planId}`);

            const planConfig: Record<string, { name: string; months: number }> = {
                monthly: { name: "Mensal", months: 1 },
                quarterly: { name: "Trimestral", months: 3 },
                annual: { name: "Anual", months: 12 },
            };

            const plan = planConfig[planId] || planConfig.monthly;
            const credits = plan.months * 30;
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + plan.months);

            const { error: rpcError } = await supabase.rpc("upsert_subscription", {
                p_user_id: userId,
                p_cakto_order_id: transactionId,
                p_cakto_offer_id: null,
                p_product_id: planId,
                p_product_name: plan.name,
                p_status: "active",
                p_credits: credits,
                p_billing_cycle_months: plan.months,
                p_auto_renew: false,
                p_current_period_start: now.toISOString(),
                p_current_period_end: periodEnd.toISOString(),
            });

            if (rpcError) {
                console.error("Error upserting subscription:", rpcError);
                return new Response(
                    JSON.stringify({ error: "Erro ao ativar assinatura", details: rpcError.message }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            console.log(`Subscription activated: user=${userId}, plan=${plan.name}, credits=${credits}`);

            // Award referral points if this user was referred by someone
            // The award_referral_points function will safely do nothing if there's no pending referral
            const { error: referralError } = await supabase.rpc('award_referral_points', {
                p_referred_user_id: userId
            });

            if (referralError) {
                console.error("Error awarding referral points:", referralError);
                // We don't fail the webhook if referral points fail, as the subscription is already active
            } else {
                console.log(`Referral points checked/awarded for user=${userId}`);
            }

        } else {
            console.log(`Event "${event}" / status "${status}" — no action taken`);
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Webhook error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Erro interno" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
