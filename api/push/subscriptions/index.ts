import { getAdminClient, isAuthorized, json } from '../../_lib/push-api';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('is_active', true);

    if (error) throw error;

    const payload = (data ?? []).map((row) => ({
      id: row.id,
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    }));

    return json(res, 200, payload);
  } catch (error: any) {
    return json(res, 500, { error: error?.message ?? 'Internal error' });
  }
}
