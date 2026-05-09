import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const authHeader = req.headers.get("Authorization");
        let userId: string | null = null;
        if (authHeader) {
            const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user } } = await supabaseUser.auth.getUser();
            userId = user?.id ?? null;
        }

        const { endpoint, p256dh, auth, userAgent, session_id, meal_settings, action = "register" } = await req.json();
        const sessionId = typeof session_id === "string" && session_id.trim().length > 0 ? session_id.trim() : null;

        if (!endpoint || (action === "register" && (!p256dh || !auth))) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        if (!userId && !sessionId) {
            return new Response(JSON.stringify({ error: "Missing auth or session_id" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "unregister") {
            const query = supabaseAdmin
                .from("push_subscriptions")
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("endpoint", endpoint);

            const { error } = userId
                ? await query.eq("user_id", userId)
                : await query.eq("session_id", sessionId);

            if (error) throw error;
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { data, error } = await supabaseAdmin.from("push_subscriptions").upsert(
            {
                user_id: userId,
                session_id: userId ? null : sessionId,
                endpoint,
                p256dh,
                auth,
                user_agent: userAgent || req.headers.get("user-agent") || null,
                is_active: true,
                updated_at: new Date().toISOString(),
                meal_settings: meal_settings || null,
            },
            { onConflict: "endpoint" }
        ).select("id").maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, id: data?.id || null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("push-subscriptions error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
