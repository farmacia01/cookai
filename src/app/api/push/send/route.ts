import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

type Audience = 'all' | 'free' | 'premium' | 'inactive' | 'custom';

type SendBody = {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  audience?: Audience;
  custom?: {
    userIds?: string[];
    sessionIds?: string[];
    endpoints?: string[];
  };
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = request.headers.get('authorization') || '';
    const expected = `Bearer ${getEnv('PUSH_ADMIN_SECRET')}`;

    if (auth !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as SendBody;
    if (!payload.title || !payload.body) {
      return Response.json({ error: 'title and body are required' }, { status: 400 });
    }

    const audience = payload.audience || 'all';
    if (!['all', 'custom'].includes(audience)) {
      return Response.json({ error: 'MVP supports only audience all/custom' }, { status: 400 });
    }

    const supabaseUrl = getEnv('SUPABASE_URL');
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(supabaseUrl, serviceKey);

    webpush.setVapidDetails(
      getEnv('VAPID_SUBJECT'),
      getEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
      getEnv('VAPID_PRIVATE_KEY')
    );

    let query = admin.from('push_subscriptions').select('*').eq('is_active', true);

    if (audience === 'custom' && payload.custom) {
      if (payload.custom.userIds?.length) query = query.in('user_id', payload.custom.userIds);
      if (payload.custom.sessionIds?.length) query = query.in('session_id', payload.custom.sessionIds);
      if (payload.custom.endpoints?.length) query = query.in('endpoint', payload.custom.endpoints);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/icon.png',
      badge: payload.badge || '/icon.png',
      data: { url: payload.url || '/', type: 'custom' },
    });

    const logs: Array<Record<string, unknown>> = [];

    for (const sub of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );

        logs.push({
          subscription_id: sub.id,
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          status: 'sent',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown push error';
        const statusCode = Number((err as { statusCode?: number }).statusCode || 0);

        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from('push_subscriptions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sub.id);
        }

        logs.push({
          subscription_id: sub.id,
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    if (logs.length) {
      await admin.from('push_logs').insert(logs);
    }

    return Response.json({ success: true, total: subscriptions?.length || 0, logs: logs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
