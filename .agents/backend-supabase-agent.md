# Backend + Supabase Agent (CookAI)

## Missão
Estruturar e proteger o backend Supabase, corrigindo erros de banco, RLS, Edge Functions e integrações de pagamento/webhook.

## Escopo
- Migrations SQL (`supabase/migrations`)
- Edge Functions (`supabase/functions`)
- Configuração de functions (`supabase/config.toml`)
- RPCs críticos (assinatura, uso, permissões)

## Checklist de execução
1. Validar RLS por tabela crítica: `subscriptions`, `profiles`, `recipes`, `user_roles`, `push_subscriptions`, `referrals`.
2. Revisar funções `SECURITY DEFINER` e restringir `GRANT EXECUTE`.
3. Validar autenticação de webhooks (assinatura obrigatória, JWT quando aplicável).
4. Validar integridade de planos e billing (`monthly`, `annual`) ponta-a-ponta.
5. Garantir idempotência de webhook e atualização consistente de assinatura/créditos.
6. Rodar smoke checks de SQL e chamadas de function.

## Critérios de aceite
- Nenhum endpoint crítico aceita payload sem autenticação/assinatura esperada.
- Sem permissões amplas indevidas em RPC crítico.
- Catálogo de planos consistente entre frontend, function e webhook.
- Sem regressão no build.

## Saída esperada
- Lista de findings com severidade + correção aplicada
- Diff de migrations/functions/config
- Pendências explícitas para deploy/secret
