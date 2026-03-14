import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import { buildPushHTTPRequest } from "https://esm.sh/@pushforge/builder@1.1.2?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Basic CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        // Note: private key should be in JWK format string or object for @pushforge/builder
        const vapidPrivateKeyStr = Deno.env.get("VAPID_PRIVATE_KEY")!;
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cookai.app";

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Parse JWK if it's a string
        let vapidPrivateKey;
        try {
            vapidPrivateKey = JSON.parse(vapidPrivateKeyStr);
        } catch {
            vapidPrivateKey = vapidPrivateKeyStr;
        }

        // 1. Calculate dates
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        // 2. Query clients expiring tomorrow or expired yesterday
        const { data: clients, error: clientsError } = await supabaseAdmin
            .from("clients")
            .select("id, name, user_id, proxima_manutencao")
            .or(`proxima_manutencao.eq.${tomorrowStr},proxima_manutencao.eq.${yesterdayStr}`)
            .eq("active", true);

        if (clientsError) throw clientsError;
        if (!clients || clients.length === 0) {
            return new Response(JSON.stringify({ message: "No clients to notify today" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Group clients by user
        const userNotifications: Record<string, { before: any[], after: any[] }> = {};
        for (const client of clients) {
            if (!userNotifications[client.user_id]) {
                userNotifications[client.user_id] = { before: [], after: [] };
            }
            if (client.proxima_manutencao === tomorrowStr) {
                userNotifications[client.user_id].before.push(client);
            } else {
                userNotifications[client.user_id].after.push(client);
            }
        }

        const results = [];

        // 4. Process each user
        for (const [userId, groups] of Object.entries(userNotifications)) {
            // Get user's active subscriptions
            const { data: subs, error: subsError } = await supabaseAdmin
                .from("push_subscriptions")
                .select("id, endpoint, p256dh, auth")
                .eq("user_id", userId)
                .eq("active", true);

            if (subsError || !subs || subs.length === 0) continue;

            // Prepare messages
            const messages = [];
            if (groups.before.length > 0) {
                const names = groups.before.map(c => c.name).join(", ");
                messages.push(`Vence amanhã: ${names}`);
            }
            if (groups.after.length > 0) {
                const names = groups.after.map(c => c.name).join(", ");
                messages.push(`Venceu ontem: ${names}`);
            }

            const body = messages.join("\n");
            const payload = {
                title: "Manutenção Próxima",
                body,
                icon: "/icon.png",
                badge: "/icon.png",
                tag: "maintenance-alert",
                data: { url: "/" }
            };

            // 5. Send to each subscription
            for (const sub of subs) {
                const windowType = groups.before.length > 0 && groups.after.length > 0 ? 'both' : (groups.before.length > 0 ? 'before_1d' : 'after_1d');
                
                const { data: existingLog } = await supabaseAdmin
                    .from("maintenance_notification_logs")
                    .select("id")
                    .eq("subscription_id", sub.id)
                    .eq("notification_date", todayStr)
                    .eq("window_type", windowType)
                    .maybeSingle();

                if (existingLog) continue;

                try {
                    // Build Web Push Request using @pushforge/builder API
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

                    const response = await fetch(pushRequest.endpoint, {
                        method: 'POST',
                        body: pushRequest.body,
                        headers: pushRequest.headers
                    });

                    // Log the attempt
                    await supabaseAdmin.from("maintenance_notification_logs").insert({
                        subscription_id: sub.id,
                        notification_date: todayStr,
                        window_type: windowType,
                        sent_at: new Date().toISOString(),
                        status: response.ok ? 'success' : 'failed',
                        error_message: response.ok ? null : `Status: ${response.status}`
                    });

                    if (!response.ok && (response.status === 410 || response.status === 404)) {
                        await supabaseAdmin.from("push_subscriptions").update({ active: false }).eq("id", sub.id);
                    }

                    results.push({ subId: sub.id, status: response.ok ? 'sent' : 'failed' });

                } catch (err) {
                    console.error(`Error sending push to ${sub.id}:`, err);
                    await supabaseAdmin.from("maintenance_notification_logs").insert({
                        subscription_id: sub.id,
                        notification_date: todayStr,
                        window_type: windowType,
                        status: 'failed',
                        error_message: err.message
                    });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("maintenance-notifier error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
