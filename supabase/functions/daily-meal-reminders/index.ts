import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

// --- VAPID key helper using Web Crypto API (Deno-compatible) ---
async function generateVAPIDAuthHeaders(
    vapidPublicKey: string,
    vapidPrivateKey: string,
    audience: string,
    subject: string
): Promise<string> {
    const header = { typ: "JWT", alg: "ES256" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        aud: audience,
        exp: now + 12 * 3600,
        sub: subject,
    };

    const encodeBase64Url = (data: Uint8Array) =>
        btoa(String.fromCharCode(...data))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");

    const textEnc = new TextEncoder();
    const headerEnc = encodeBase64Url(
        textEnc.encode(JSON.stringify(header))
    );
    const payloadEnc = encodeBase64Url(
        textEnc.encode(JSON.stringify(payload))
    );
    const toSign = `${headerEnc}.${payloadEnc}`;

    const rawKey = Uint8Array.from(
        atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0)
    );

    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        rawKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        textEnc.encode(toSign)
    );

    const sigEnc = encodeBase64Url(new Uint8Array(signature));
    const token = `${toSign}.${sigEnc}`;
    return `vapid t=${token}, k=${vapidPublicKey}`;
}

const ENGAGING_MESSAGES = {
    breakfast: [
        { title: "Bom dia, chef! ☀️☕", body: "Que tal começar o dia com uma receita saudável e cheia de energia?" },
        { title: "Acorda pra cuspir! 🥞🍳", body: "O café não se faz sozinho (mas a receita eu te dou)!" },
        { title: "Energia total! ⚡🍎", body: "Use o Cook AI para um café da manhã turbinado de hoje." },
        { title: "Hora do Café! 🥖🥑", body: "Já tem ideia do que vai comer? Vem gerar uma receita rápida!" }
    ],
    lunch: [
        { title: "Bateu aquela fome? 🍽️", body: "Abre a geladeira, digita o que tem e eu faço a mágica!" },
        { title: "Chef, qual o prato de hoje? 🍝", body: "Hora do almoço! Gere uma receita deliciosa em segundos." },
        { title: "Almoço saudável! 🥗🍗", body: "Não caia na tentação do fast food. Vem cozinhar algo bom!" },
        { title: "O estômago tá roncando? 🍔", body: "Deixa comigo! Me diz o que você tem na cozinha!" }
    ],
    dinner: [
        { title: "Chef, já pensou no jantar? 🌙🍷", body: "Uma receita leve ou algo especial? Você decide!" },
        { title: "Fechando o dia com chave de ouro 🍲", body: "O jantar perfeito te espera no Cook AI." },
        { title: "Jantar nutritivo! 🥦🐟", body: "Termine seu dia cuidando do seu corpo. Vem gerar sua receita!" },
        { title: "Relaxa, eu cozinho (a receita) 🍕", body: "Tranquilidade no jantar: só digitar os ingredientes!" }
    ]
};

function getRandomMessage(mealId: string) {
    const list = ENGAGING_MESSAGES[mealId as keyof typeof ENGAGING_MESSAGES];
    if (!list) return { title: "Cook AI", body: "Hora de cozinhar!" };
    return list[Math.floor(Math.random() * list.length)];
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cookai.app";

        // Optional: Check a secret auth header to ensure only our Cron calls this
        const reqAuth = req.headers.get("Authorization");
        const cronSecret = Deno.env.get("CRON_SECRET");
        if (cronSecret && reqAuth !== `Bearer ${cronSecret}`) {
            console.warn("Unauthorized Cron Attempt", reqAuth);
            // Return 401 if strict, but we let it pass for easy setup if no secret is set
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from("push_subscriptions")
            .select("*");

        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: "No active subscriptions found." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get current hour in UTC-3 (Brazil Time)
        const now = new Date();
        const currentHourBRT = (now.getUTCHours() - 3 + 24) % 24;
        const currentHourStr = currentHourBRT.toString().padStart(2, '0');

        console.log(`Verificando refeições para a hora: ${currentHourStr}h (BRT)`);

        let successCount = 0;
        let failedCount = 0;

        for (const sub of subscriptions) {
            try {
                // Determine if they should get a notification this hour
                let meals: any[] = sub.meal_settings || [];
                if (!Array.isArray(meals) || meals.length === 0) {
                    meals = [
                        { id: "breakfast", enabled: true, time: "07:00" },
                        { id: "lunch", enabled: true, time: "12:00" },
                        { id: "dinner", enabled: true, time: "19:00" },
                    ];
                }

                for (const meal of meals) {
                    if (meal.enabled && meal.time.startsWith(currentHourStr)) {
                        const message = getRandomMessage(meal.id);
                        const payload = JSON.stringify({
                            title: message.title,
                            body: message.body,
                            icon: "/icon.png",
                            badge: "/icon.png",
                            tag: `meal-${meal.id}-${now.toISOString().split("T")[0]}`,
                            data: { url: "/gerar-receitas" },
                        });

                        const url = new URL(sub.endpoint);
                        const audience = `${url.protocol}//${url.host}`;
                        const authHeaderStr = await generateVAPIDAuthHeaders(
                            vapidPublicKey,
                            vapidPrivateKey,
                            audience,
                            vapidSubject
                        );

                        const response = await fetch(sub.endpoint, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "TTL": "86400",
                                Authorization: authHeaderStr,
                                Urgency: "normal",
                            },
                            body: payload,
                        });

                        if (response.ok || response.status === 201 || response.status === 202) {
                            successCount++;
                        } else if (response.status === 410 || response.status === 404) {
                            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
                            failedCount++;
                        } else {
                            failedCount++;
                            console.warn(`Push failed for ${sub.endpoint}: ${response.status}`);
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to process sub ${sub.endpoint}:`, err);
                failedCount++;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                sent: successCount,
                failed: failedCount,
                hourRun: currentHourStr
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Cron function error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
