# 🔧 Teste de Autenticação Cakto - GUIA RÁPIDO

## ⚠️ PROBLEMA ATUAL: "unauthorized_client"

Este erro significa que suas credenciais estão **corretas**, mas a chave de API **não tem os escopos/permissões necessários**.

## ✅ SOLUÇÃO RÁPIDA (5 minutos)

### 1. Criar Nova Chave de API no Painel Cakto

1. Acesse: https://painel.cakto.com.br
2. Vá em: **Configurações** → **API**
3. Clique em: **Criar Nova Chave** (ou **Nova Chave de API**)
4. **IMPORTANTE**: Ao criar, selecione **TODOS** os escopos disponíveis:
   - ✅ **Pedidos** (Orders) - OBRIGATÓRIO
   - ✅ **Ofertas** (Offers) - OBRIGATÓRIO
   - ✅ **Produtos** (Products) - Recomendado
5. Copie o **Client ID** e **Client Secret** imediatamente (o secret só aparece uma vez!)

### 2. Atualizar no Supabase

1. Acesse: Supabase Dashboard → Edge Functions → Settings → Secrets
2. Clique nos três pontos (`:`) ao lado de `CAKTO_CLIENT_ID` → **Update**
3. Cole o novo **Client ID** → **Save**
4. Clique nos três pontos (`:`) ao lado de `CAKTO_CLIENT_SECRET` → **Update**
5. Cole o novo **Client Secret** → **Save**

### 3. Testar

1. Volte para a página de preços do seu site
2. Clique em "Assinar" em um plano
3. Deve funcionar agora! ✅

---

Este guia ajuda a testar se suas credenciais da Cakto estão funcionando corretamente.

## Teste Manual com cURL

Execute este comando no terminal, substituindo `SEU_CLIENT_ID` e `SEU_CLIENT_SECRET`:

```bash
curl -X POST https://api.cakto.com.br/public_api/token/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=SEU_CLIENT_ID" \
  -d "client_secret=SEU_CLIENT_SECRET"
```

### Resposta Esperada (Sucesso):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Resposta de Erro (Credenciais Incorretas):
```json
{
  "error": "unauthorized_client"
}
```

## Verificação de Escopos no Painel Cakto

1. Acesse: https://painel.cakto.com.br
2. Vá em: **Configurações** → **API**
3. Encontre sua chave de API
4. Verifique os **Escopos de Acesso**:
   - ✅ **Pedidos** (Orders) - Obrigatório para criar pedidos
   - ✅ **Ofertas** (Offers) - Obrigatório para ler ofertas
   - ✅ **Produtos** (Products) - Recomendado para ler produtos

## Se os Escopos Não Estiverem Configurados

1. **Crie uma Nova Chave de API**:
   - No Painel Cakto: **Configurações** → **API** → **Criar Nova Chave**
   - Selecione **TODOS** os escopos disponíveis
   - Copie o **Client ID** e **Client Secret** imediatamente

2. **Atualize no Supabase**:
   - Supabase Dashboard → Edge Functions → Settings → Secrets
   - Substitua `CAKTO_CLIENT_ID` e `CAKTO_CLIENT_SECRET`
   - Salve

3. **Teste Novamente**:
   - Use o comando cURL acima
   - Se retornar `access_token`, está funcionando!

## Verificar Logs da Edge Function

1. Supabase Dashboard → Edge Functions → `create-cakto-order` → Logs
2. Procure por:
   - `Cakto credentials status:` - Confirma que as credenciais estão sendo lidas
   - `Request body params:` - Confirma que o `grant_type` está sendo enviado
   - `Cakto token endpoint returned:` - Mostra o erro específico da API

## Problemas Comuns

### Erro: "unauthorized_client" (mesmo com escopos configurados)
- **Causa Possível 1**: A chave de API pode estar revogada ou inativa
  - **Solução**: No Painel Cakto, verifique se a chave está ATIVA. Se não estiver, crie uma nova.
  
- **Causa Possível 2**: Os escopos podem não ter sido salvos corretamente
  - **Solução**: Revogue a chave atual e crie uma NOVA chave, selecionando todos os escopos novamente
  
- **Causa Possível 3**: Problema com o ambiente (sandbox vs produção)
  - **Solução**: Verifique se está usando as credenciais do ambiente correto
  
- **Causa Possível 4**: A chave pode estar associada a uma conta diferente
  - **Solução**: Certifique-se de que está usando as credenciais da conta correta
  
- **Solução Recomendada**: 
  1. Revogue a chave atual no Painel Cakto
  2. Crie uma NOVA chave com todos os escopos
  3. Copie o novo Client ID e Client Secret
  4. Atualize no Supabase Edge Functions Secrets
  5. Teste novamente

### Erro: "unsupported_grant_type"
- **Causa**: O `grant_type` não está sendo enviado corretamente
- **Solução**: Verifique os logs da Edge Function

### Erro: 500 (Internal Server Error)
- **Causa**: Problema temporário no servidor da Cakto
- **Solução**: Tente novamente em alguns minutos

