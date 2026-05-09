# Push Notifications - Cook AI

## Arquivos criados/alterados
- `public/sw.js`
- `supabase/migrations/20260509193000_push_notifications_hardening.sql`
- `src/lib/push.ts`
- `src/components/push/PushPermissionCard.tsx`
- `src/pages/admin/PushAdminPage.tsx`
- `supabase/functions/push-subscriptions/index.ts`
- `supabase/functions/send-broadcast/index.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/push/send/route.ts`

## Env vars
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT=mailto:seuemail@email.com`
- `PUSH_ADMIN_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

No frontend Vite atual, também manter:
- `VITE_VAPID_PUBLIC_KEY` (espelhando a chave pública)
- `VITE_PUSH_ADMIN_SECRET` (somente para MVP local/admin; produção ideal usa backend com sessão admin)

## SQL/migration
A migration cria/ajusta:
- `public.push_subscriptions`
- `public.push_logs`
- trigger de `updated_at`
- RLS para owner + `service_role`

## Teste rápido
1. Executar migration no Supabase.
2. Subir app e abrir no navegador seguro (https ou localhost).
3. Ativar notificações no card da home.
4. Conferir linha em `push_subscriptions`.
5. Acessar `/admin/push` e enviar notificação.
6. Confirmar recebimento e clique abrindo URL.
7. Conferir `push_logs`.

## cURL exemplo
```bash
curl -X POST "https://SEU_PROJECT_REF.supabase.co/functions/v1/send-broadcast" \
  -H "Authorization: Bearer $PUSH_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Receita rápida para hoje",
    "body":"Você tem ingredientes para uma receita rica em proteína.",
    "url":"/",
    "audience":"all"
  }'
```

## n8n exemplo
- Method: `POST`
- URL: `https://SEU_PROJECT_REF.supabase.co/functions/v1/send-broadcast`
- Headers:
  - `Authorization: Bearer {{$env.PUSH_ADMIN_SECRET}}`
  - `Content-Type: application/json`
- Body JSON:
```json
{
  "title": "Receita rápida para hoje",
  "body": "Você tem ingredientes para uma receita rica em proteína.",
  "url": "/",
  "audience": "all"
}
```
