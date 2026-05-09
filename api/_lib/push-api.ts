import { createClient } from '@supabase/supabase-js';

export function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

export function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getAdminClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

export function isAuthorized(req: any): boolean {
  const expected = `Bearer ${getEnv('PUSH_ADMIN_SECRET')}`;
  const received = req.headers?.authorization ?? '';
  return received === expected;
}
