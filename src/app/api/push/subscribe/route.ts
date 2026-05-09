import { createClient } from '@supabase/supabase-js';

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  user_agent?: string;
  session_id?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as SubscribeBody;
    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh;
    const auth = body.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Missing server env vars' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = request.headers.get('authorization') || '';
    let userId: string | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7);
      const userClient = createClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      );
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const sessionId = userId ? null : (body.session_id || crypto.randomUUID());

    const { error } = await admin.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_id: userId,
        session_id: sessionId,
        user_agent: body.user_agent || request.headers.get('user-agent'),
        is_active: true,
      },
      { onConflict: 'endpoint' }
    );

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
