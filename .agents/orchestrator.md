# Orquestrador de Correções (CookAI)

## Ordem de execução
1. Backend/Supabase Agent
- Corrigir segurança e integridade de dados antes da UI.

2. Frontend UI/UX Agent
- Ajustar fluxos/feedback e comportamento após estabilizar backend.

3. Validação final
- `npm run lint`
- `npm run build`
- Checklist de regressão manual dos fluxos: auth, gerar receita, pricing/pagamento, admin.

## Prioridade de correção
- Crítico: segurança/permissão/dados incorretos
- Alto: fluxo principal quebrado
- Médio: inconsistência de estado/UX com impacto
- Baixo: warnings e melhorias não bloqueantes

## Definição de pronto
- Correções críticas e altas aplicadas
- Build de produção funcionando
- Pendências documentadas (se houver)
