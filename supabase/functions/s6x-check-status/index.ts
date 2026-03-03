import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const S6X_BASE_URL = "https://s6x.com.br/api/v1";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const S6X_CLIENT_ID = Deno.env.get("S6X_CLIENT_ID");
        const S6X_CLIENT_SECRET = Deno.env.get("S6X_CLIENT_SECRET");

        if (!S6X_CLIENT_ID || !S6X_CLIENT_SECRET) {
            throw new Error("Credenciais S6X não configuradas.");
        }

        const { transaction_id } = await req.json();

        if (!transaction_id) {
            return new Response(
                JSON.stringify({ error: "transaction_id é obrigatório" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const response = await fetch(`${S6X_BASE_URL}/payments/${transaction_id}`, {
            method: "GET",
            headers: {
                "X-Client-Id": S6X_CLIENT_ID,
                "X-Client-Secret": S6X_CLIENT_SECRET,
            },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            return new Response(
                JSON.stringify({ error: data.message || "Erro ao consultar status" }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                transaction_id: data.data.transaction_id,
                status: data.data.status, // "pending", "paid", "expired", "cancelled", "failed"
                amount: data.data.amount,
                paid_at: data.data.paid_at || null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message || "Erro interno" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
