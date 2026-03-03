# 🔧 Fix: Erro 401 no Webhook da Cakto

## Problema

O webhook da Cakto está retornando **401 (Unauthorized)** quando a Cakto tenta chamá-lo.

## Causa

Mesmo com `verify_jwt = false` no `config.toml`, o Supabase pode estar exigindo autenticação. Isso pode acontecer se:

1. A função não foi deployada após alterar o `config.toml`
2. O Supabase está bloqueando requisições sem autenticação
3. A configuração não foi aplicada corretamente

## Soluções

### Solução 1: Fazer Deploy Novamente da Função

Após alterar o `config.toml`, é necessário fazer deploy novamente:

```bash
# Via Supabase CLI
supabase functions deploy cakto-webhook
```

**OU via Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/enfkbhqiryqwqlcsjwnl
2. Vá em **Edge Functions** → **cakto-webhook**
3. Clique em **Deploy** ou **Redeploy**

### Solução 2: Verificar Configuração no Dashboard

1. Acesse: https://supabase.com/dashboard/project/enfkbhqiryqwqlcsjwnl
2. Vá em **Edge Functions** → **cakto-webhook** → **Settings**
3. Verifique se **"Verify JWT"** está **DESABILITADO** (OFF)
4. Se estiver habilitado, desabilite e salve

### Solução 3: Usar Anon Key no Webhook (Alternativa)

Se as soluções acima não funcionarem, você pode configurar a Cakto para enviar o `apikey` no header:

**No Painel Cakto:**
- Configure o webhook para incluir o header:
  - `apikey: sua_anon_key_aqui`

**No código do webhook:**
O código já aceita o header `apikey` nos CORS headers, então isso deve funcionar.

### Solução 4: Verificar URL do Webhook

Certifique-se de que a URL do webhook na Cakto está correta:

```
https://enfkbhqiryqwqlcsjwnl.supabase.co/functions/v1/cakto-webhook
```

**Importante:** Não inclua `/` no final da URL.

## Verificação

Após aplicar as soluções:

1. Faça um teste de pagamento na Cakto
2. Verifique os logs do webhook no Supabase:
   - **Edge Functions** → **cakto-webhook** → **Logs**
3. O status code deve ser **200** (não 401)

## Logs Esperados

Após o fix, você deve ver nos logs:

```
Webhook received: {
  method: "POST",
  url: "...",
  headers: { ... }
}
Processing Cakto webhook event: { ... }
```

Se ainda aparecer 401, verifique:
- Se o deploy foi feito corretamente
- Se a configuração `verify_jwt = false` está no `config.toml`
- Se a URL do webhook na Cakto está correta

