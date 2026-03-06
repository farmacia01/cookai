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
    // Build unsigned JWT
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

    // Import private key (base64url-encoded raw EC key)
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

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cookai.app";

        // Auth check: only admins can send
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Check admin role
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
        });
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { title, body, icon = "/icon.png" } = await req.json();
        if (!title || !body) {
            return new Response(
                JSON.stringify({ error: "title and body are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch all push subscriptions
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth");

        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            // Log notification with 0 recipients
            await supabaseAdmin.from("broadcast_notifications").insert({
                title,
                body,
                icon,
                sent_by: user.id,
                recipients_count: 0,
            });
            return new Response(
                JSON.stringify({ success: true, sent: 0, message: "Nenhuma inscrição ativa encontrada." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const payload = JSON.stringify({
            title,
            body,
            icon,
            badge: "/icon.png",
            tag: `broadcast-${Date.now()}`,
            data: { url: "/" },
        });

        let successCount = 0;
        const failedEndpoints: string[] = [];

        for (const sub of subscriptions) {
            try {
                const url = new URL(sub.endpoint);
                const audience = `${url.protocol}//${url.host}`;

                const headers: Record<string, string> = {
                    "Content-Type": "application/octet-stream",
                    "Content-Encoding": "aes128gcm",
                    "TTL": "86400",
                };

                if (vapidPublicKey && vapidPrivateKey) {
                    headers["Authorization"] = await generateVAPIDAuthHeaders(
                        vapidPublicKey,
                        vapidPrivateKey,
                        audience,
                        vapidSubject
                    );
                }

                // Encrypt the payload using WebPush encryption
                // For simplicity, we send without encryption first (some push services accept plaintext)
                const response = await fetch(sub.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "TTL": "86400",
                        ...(vapidPublicKey && vapidPrivateKey
                            ? {
                                Authorization: await generateVAPIDAuthHeaders(
                                    vapidPublicKey,
                                    vapidPrivateKey,
                                    audience,
                                    vapidSubject
                                ),
                                "Urgency": "normal",
                            }
                            : {}),
                    },
                    body: payload,
                });

                if (response.ok || response.status === 201 || response.status === 202) {
                    successCount++;
                } else if (response.status === 410 || response.status === 404) {
                    // Subscription expired, remove it
                    failedEndpoints.push(sub.endpoint);
                    await supabaseAdmin
                        .from("push_subscriptions")
                        .delete()
                        .eq("endpoint", sub.endpoint);
                } else {
                    failedEndpoints.push(sub.endpoint);
                    console.warn(`Push failed for ${sub.endpoint}: ${response.status}`);
                }
            } catch (err) {
                console.error(`Failed to send push to ${sub.endpoint}:`, err);
                failedEndpoints.push(sub.endpoint);
            }
        }

        // Save broadcast log
        await supabaseAdmin.from("broadcast_notifications").insert({
            title,
            body,
            icon,
            sent_by: user.id,
            recipients_count: successCount,
        });

        return new Response(
            JSON.stringify({
                success: true,
                sent: successCount,
                failed: failedEndpoints.length,
                total: subscriptions.length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("send-broadcast error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
