import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import { buildPushHTTPRequest } from "https://esm.sh/@pushforge/builder@1.1.2?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

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
} as const;

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
        const vapidPrivateKeyStr = Deno.env.get("VAPID_PRIVATE_KEY")!;
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cookai.app";

        // Parse JWK if it's a string
        let vapidPrivateKey;
        try {
            vapidPrivateKey = JSON.parse(vapidPrivateKeyStr);
        } catch {
            vapidPrivateKey = vapidPrivateKeyStr;
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from("push_subscriptions")
            .select("*")
            .eq("active", true);

        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: "No active subscriptions found." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const now = new Date();
        const currentHourBRT = (now.getUTCHours() - 3 + 24) % 24;
        const currentHourStr = currentHourBRT.toString().padStart(2, '0');

        console.log(`Verificando refeições para a hora: ${currentHourStr}h (BRT)`);

        let successCount = 0;
        let failedCount = 0;

        for (const sub of subscriptions) {
            try {
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
                        const payload = {
                            title: message.title,
                            body: message.body,
                            icon: "/icon.png",
                            badge: "/icon.png",
                            tag: `meal-${meal.id}-${now.toISOString().split("T")[0]}`,
                            data: { url: "/gerar-receitas" },
                        };

                        try {
                            const pushRequest = await buildPushHTTPRequest({
                                privateJWK: vapidPrivateKey,
                                message: {
                                    payload: payload,
                                    adminContact: vapidSubject,
                                },
                                subscription: {
                                    endpoint: sub.endpoint,
                                    keys: {
                                        p256dh: sub.p256dh,
                                        auth: sub.auth,
                                    }
                                }
                            });

                            const res = await fetch(pushRequest.endpoint, {
                                method: 'POST',
                                body: pushRequest.body,
                                headers: pushRequest.headers
                            });

                            if (res.ok) {
                                successCount++;
                            } else if (res.status === 410 || res.status === 404) {
                                await supabaseAdmin.from("push_subscriptions").update({ active: false }).eq("id", sub.id);
                                failedCount++;
                            } else {
                                failedCount++;
                            }
                        } catch (err) {
                            console.error(`Error sending notification to ${sub.endpoint}:`, err);
                            failedCount++;
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
