import { getAdminClient, isAuthorized, json } from '../../../_lib/push-api';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });

  try {
    const { subscription_id, endpoint } = req.body ?? {};
    if (!subscription_id && !endpoint) {
      return json(res, 400, { error: 'subscription_id or endpoint is required' });
    }

    const supabase = getAdminClient();
    let query = supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() });

    query = subscription_id ? query.eq('id', subscription_id) : query.eq('endpoint', endpoint);

    const { error } = await query;
    if (error) throw error;

    return json(res, 200, { success: true });
  } catch (err: any) {
    return json(res, 500, { error: err?.message ?? 'Internal error' });
  }
}
