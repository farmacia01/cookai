# Cook AI - Notificações via n8n (estrutura completa)

## 1) Arquitetura final
- App: apenas registra/desregistra push subscription (não agenda local).
- Supabase: guarda subscriptions em `public.push_subscriptions`.
- n8n: executa cron, filtra destinatários por horário/preferências e envia Web Push.

Fluxo:
1. Usuário aceita notificação no app.
2. App chama Edge Function `push-subscriptions`.
3. Supabase salva `endpoint`, `p256dh`, `auth`, `meal_settings`, `active=true`.
4. n8n roda a cada minuto e envia push para quem deve receber naquele minuto.
5. n8n marca `active=false` se endpoint estiver inválido (`404/410`).

## 2) Pré-requisitos
- Tabela `public.push_subscriptions` com colunas:
  - `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `meal_settings`, `active`, `updated_at`
- Function `public.manage_push_subscription(...)` com `p_meal_settings`.
- Service Worker com handlers `push` e `notificationclick`.

## 3) Secrets/credenciais
No n8n (Credentials ou env vars):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ex: `mailto:admin@cookai.app`)
- `N8N_CRON_SECRET` (valor forte, igual no Supabase e no n8n)

No `supabase/config.toml`:
- `[functions.send-broadcast]`
- `verify_jwt = false`

Proteção da function fica via header `x-cron-secret`.

## 4) Workflow n8n (importável)
Arquivo:
- `n8n/workflows/cookai-push-cron.json`

Esse workflow inclui:
- Cron: a cada minuto
- Code: calcula `currentHHmm` e timezone
- HTTP (Supabase): busca inscritos ativos
- Code: filtra por `meal_settings`
- Split in Batches: envia 1 a 1
- HTTP (Supabase Function `send-broadcast`): envio push (já assina com VAPID no backend)

## 5) SQL de apoio para n8n
Arquivo:
- `n8n/sql/subscriptions_queries.sql`

## 6) Teste ponta a ponta
0. Rodar SQL de compatibilidade em `n8n/sql/subscriptions_queries.sql` (bloco `0)`).
1. Abrir app e permitir notificações.
2. Confirmar linha na `push_subscriptions` com `active=true`.
3. No n8n, rodar workflow manualmente com payload de teste.
4. Validar notificação recebida em background e app fechado.
5. Clicar notificação deve abrir `data.url` (ex: `/gerar-receitas`).

## 7) Operação
- Recomenda-se limite de taxa por execução (batch + espera curta).
- Guardar logs de envio no próprio n8n ou tabela dedicada.
- Para campanhas gerais, reutilizar o mesmo fluxo com filtro diferente.
