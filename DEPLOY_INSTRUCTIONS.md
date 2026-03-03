# Instruções de Deploy - Nova Conta Supabase

## Problemas Identificados

1. **Erro 400 no Auth**: Migrations não executadas na nova conta
2. **Erro 500 na Edge Function**: Função não deployada na nova conta

## Passo a Passo para Resolver

### 1. Executar Migrations na Nova Conta

**Opção A: Via Supabase CLI**

```bash
# Linkar com o novo projeto
supabase link --project-ref enfkbhqiryqwqlcsjwnl

# Executar migrations
supabase db push
```

**Opção B: Via Dashboard SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/enfkbhqiryqwqlcsjwnl
2. Vá em **SQL Editor**
3. Execute cada migration na ordem:
   - `20251213033130_3a1b7e4b-05ab-47c9-af3b-c43f89a322f6.sql`
   - `20251213124744_10691ffb-4d96-4297-bcd4-df6a9e2b8517.sql`
   - `20251213130325_656b4d40-5698-4b0e-a48e-31968c59e341.sql`
   - `20251213131640_21681ba9-8bd4-4364-9fa3-c92b79d9a2c7.sql`
   - `20251216061228_aefdabc5-aee4-44f7-8138-dff08713f951.sql`

### 2. Deploy das Edge Functions

**Via Supabase CLI:**

```bash
# Certifique-se de estar linkado ao projeto correto
supabase link --project-ref enfkbhqiryqwqlcsjwnl

# Deploy da função generate-recipes
supabase functions deploy generate-recipes

# Deploy das outras funções (se necessário)
supabase functions deploy generate-recipe-image
supabase functions deploy estimate-meal-macros
```

**Via Dashboard:**

1. Acesse: https://supabase.com/dashboard/project/enfkbhqiryqwqlcsjwnl
2. Vá em **Edge Functions**
3. Clique em **Deploy a new function**
4. Faça upload ou cole o código de cada função

### 3. Configurar Secrets das Edge Functions

No Supabase Dashboard → Edge Functions → Settings → Secrets:

- **N8N_WEBHOOK_URL**: `https://n8n-production-3ec1d.up.railway.app/webhook/55454557-102f-4852-9f51-063499ad2221`
- **SUPABASE_URL**: `https://enfkbhqiryqwqlcsjwnl.supabase.co`
- **SUPABASE_SERVICE_ROLE_KEY**: [Sua Service Role Key]

### 4. Verificar Logs da Edge Function

Para debugar o erro 500:

1. Acesse: https://supabase.com/dashboard/project/enfkbhqiryqwqlcsjwnl
2. Vá em **Edge Functions** → **generate-recipes** → **Logs**
3. Verifique os erros específicos

### 5. Testar o n8n Webhook

Teste se o webhook do n8n está respondendo:

```bash
curl -X POST https://n8n-production-3ec1d.up.railway.app/webhook/55454557-102f-4852-9f51-063499ad2221 \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,...",
    "mode": "faxina",
    "language": "pt"
  }'
```

## Checklist

- [ ] Migrations executadas na nova conta
- [ ] Edge Functions deployadas na nova conta
- [ ] Secrets configurados no Supabase
- [ ] n8n webhook testado e funcionando
- [ ] Logs da Edge Function verificados
- [ ] Variáveis de ambiente atualizadas no Vercel

## Troubleshooting

### Erro 500 na Edge Function

**Possíveis causas:**
1. Função não deployada na nova conta
2. n8n não está respondendo corretamente
3. Formato do payload incorreto
4. Timeout do n8n

**Solução:**
- Verifique os logs da Edge Function no Supabase Dashboard
- Teste o webhook do n8n diretamente
- Verifique se o n8n está processando corretamente

### Erro 400 no Auth

**Possíveis causas:**
1. Migrations não executadas
2. Tabelas não criadas
3. Configuração de autenticação incorreta

**Solução:**
- Execute todas as migrations
- Verifique se as tabelas foram criadas (SQL Editor → Table Editor)

