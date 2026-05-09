import { getAdminClient, isAuthorized, json } from '../../_lib/push-api';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });

  try {
    const { subscription_id, title, body, url, status, error } = req.body ?? {};
    if (!subscription_id || !title || !body || !status) {
      return json(res, 400, { error: 'Missing required fields' });
    }

    const supabase = getAdminClient();
    const { error: insertError } = await supabase.from('push_logs').insert({
      subscription_id,
      title,
      body,
      url: url ?? '/',
      status,
      error: error ?? null,
    });

    if (insertError) throw insertError;
    return json(res, 200, { success: true });
  } catch (err: any) {
    return json(res, 500, { error: err?.message ?? 'Internal error' });
  }
}
