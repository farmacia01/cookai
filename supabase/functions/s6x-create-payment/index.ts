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
        console.log("=== S6X CREATE PAYMENT START ===");

        const S6X_CLIENT_ID = Deno.env.get("S6X_CLIENT_ID");
        const S6X_CLIENT_SECRET = Deno.env.get("S6X_CLIENT_SECRET");

        console.log("Credentials loaded:", !!S6X_CLIENT_ID, !!S6X_CLIENT_SECRET);

        if (!S6X_CLIENT_ID || !S6X_CLIENT_SECRET) {
            console.error("Missing S6X credentials");
            return new Response(
                JSON.stringify({ error: "Credenciais S6X não configuradas no servidor." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const rawBody = await req.text();
        console.log("Raw body received:", rawBody);

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error("JSON parse error:", e);
            return new Response(
                JSON.stringify({ error: "Body inválido - JSON esperado" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { user_id, plan_id, customer_name, customer_document, customer_email, amount } = body;

        console.log("Parsed fields:", { user_id, plan_id, customer_name, customer_document: customer_document ? "***" : null, customer_email, amount });

        if (!user_id || !plan_id || !customer_name || !customer_document || !amount) {
            const missing = [];
            if (!user_id) missing.push("user_id");
            if (!plan_id) missing.push("plan_id");
            if (!customer_name) missing.push("customer_name");
            if (!customer_document) missing.push("customer_document");
            if (!amount) missing.push("amount");
            console.error("Missing required fields:", missing);
            return new Response(
                JSON.stringify({ error: `Campos obrigatórios faltando: ${missing.join(", ")}` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Plan metadata
        const planNames: Record<string, string> = {
            monthly: "CookAI Pro - Mensal",
            quarterly: "CookAI Pro - Trimestral",
            annual: "CookAI Pro - Anual",
        };

        const payload = {
            amount: Number(amount),
            customer: {
                name: customer_name,
                document: String(customer_document).replace(/\D/g, ""),
                email: customer_email || undefined,
            },
            description: `Assinatura ${planNames[plan_id] || plan_id}`,
            product: {
                name: planNames[plan_id] || "CookAI Pro",
                id: plan_id,
            },
            order_reference: `${user_id}-${plan_id}-${Date.now()}`,
            metadata: {
                user_id,
                plan_id,
                source: "cookai",
            },
        };

        console.log("Sending to S6X:", JSON.stringify(payload));

        const response = await fetch(`${S6X_BASE_URL}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Client-Id": S6X_CLIENT_ID,
                "X-Client-Secret": S6X_CLIENT_SECRET,
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log("S6X response status:", response.status);
        console.log("S6X response body:", responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            console.error("Failed to parse S6X response as JSON");
            return new Response(
                JSON.stringify({ error: "Resposta inválida do gateway", raw: responseText }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!response.ok || !data.success) {
            console.error("S6X API error:", JSON.stringify(data));
            return new Response(
                JSON.stringify({ error: data.message || "Erro ao gerar cobrança PIX", details: data }),
                { status: response.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("Payment created successfully:", data.data?.transaction_id);

        // Return only what the frontend needs
        return new Response(
            JSON.stringify({
                success: true,
                transaction_id: data.data.transaction_id,
                status: data.data.status,
                amount: data.data.amount,
                fee: data.data.fee,
                pix: {
                    qr_code: data.data.pix.qr_code,
                    qr_code_base64: data.data.pix.qr_code_base64,
                    copy_paste: data.data.pix.copy_paste,
                },
                expires_at: data.data.expires_at,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Unhandled error:", error?.message || error);
        return new Response(
            JSON.stringify({ error: error?.message || "Erro interno" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
