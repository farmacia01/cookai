import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import { buildPushHTTPRequest } from "https://esm.sh/@pushforge/builder@1.1.2?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const vapidPrivateKeyStr = Deno.env.get("VAPID_PRIVATE_KEY")!;
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cookai.app";
        const pushAdminSecret = Deno.env.get("PUSH_ADMIN_SECRET");

        const { title, body, icon, badge, url, tag, target_user_id, audience = "all", custom } = await req.json();
        if (!title || !body) {
            return new Response(JSON.stringify({ error: "Missing title/body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Parse JWK if it's a string
        let vapidPrivateKey;
        try {
            vapidPrivateKey = JSON.parse(vapidPrivateKeyStr);
        } catch {
            vapidPrivateKey = vapidPrivateKeyStr;
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // allow either PUSH_ADMIN_SECRET, admin JWT or cron secret (for n8n scheduled sends)
        const cronSecret = Deno.env.get("N8N_CRON_SECRET");
        const receivedCronSecret = req.headers.get("x-cron-secret");
        const isCronAuthorized = !!cronSecret && !!receivedCronSecret && cronSecret === receivedCronSecret;
        const authHeader = req.headers.get("Authorization");
        const isPushSecretAuthorized =
            !!pushAdminSecret &&
            !!authHeader &&
            authHeader.replace(/^Bearer\s+/i, "") === pushAdminSecret;

        // check if user is admin (when not using secrets)
        if (!isCronAuthorized && !isPushSecretAuthorized) {
            if (!authHeader) throw new Error("Missing auth header");
            const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
            if (userError || !user) throw new Error("Invalid user");

            const { data: roleData } = await supabaseAdmin
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (roleData?.role !== "admin") throw new Error("Unauthorized");
        }

        let query = supabaseAdmin
            .from("push_subscriptions")
            .select("*")
            .eq("is_active", true);

        if (audience === "custom") {
            const sessionIds = Array.isArray(custom?.sessionIds) ? custom.sessionIds.filter(Boolean) : [];
            const userIds = Array.isArray(custom?.userIds) ? custom.userIds.filter(Boolean) : [];
            if (sessionIds.length === 0 && userIds.length === 0) {
                return new Response(JSON.stringify({ error: "custom audience requires sessionIds or userIds" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            if (sessionIds.length > 0) query = query.in("session_id", sessionIds);
            if (userIds.length > 0) query = query.in("user_id", userIds);
        }

        if (target_user_id) {
            query = query.eq("user_id", target_user_id);
        }

        const { data: subscriptions, error: subError } = await query;
        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: "No active subscriptions" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload = {
            title: title || "Cook AI",
            body: body || "Olá!",
            icon: icon || "/icon.png",
            badge: badge || "/icon.png",
            tag: tag || "broadcast",
            data: { url: url || "/" }
        };

        const results = [];
        for (const sub of subscriptions) {
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

                if (!res.ok && (res.status === 410 || res.status === 404)) {
                    await supabaseAdmin
                        .from("push_subscriptions")
                        .update({ is_active: false, updated_at: new Date().toISOString() })
                        .eq("id", sub.id);
                }
                await supabaseAdmin.from("push_logs").insert({
                    subscription_id: sub.id,
                    title: payload.title,
                    body: payload.body,
                    url: payload.data.url,
                    status: res.ok ? "sent" : `error_${res.status}`,
                    error: res.ok ? null : `HTTP ${res.status}`,
                });
                results.push({ id: sub.id, success: res.ok, status: res.status });
            } catch (err) {
                await supabaseAdmin.from("push_logs").insert({
                    subscription_id: sub.id,
                    title: payload.title,
                    body: payload.body,
                    url: payload.data.url,
                    status: "error_exception",
                    error: err.message,
                });
                results.push({ id: sub.id, success: false, error: err.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
