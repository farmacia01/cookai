# Frontend UI/UX Agent (CookAI)

## Missão
Resolver erros reais de interface, responsividade e fluxos de UX (botões, estados, feedback de erro, consistência visual).

## Escopo
- Páginas principais (`src/pages`)
- Componentes de fluxo crítico (`auth`, `pricing`, `generate`, `admin`)
- Estados assíncronos e mensagens de erro
- Responsividade mobile/desktop

## Checklist de execução
1. Corrigir fluxos quebrados de erro/sucesso (toasts, estados vazios, loading).
2. Revisar botões de ação crítica (disabled, loading, CTA correto).
3. Ajustar regressões de responsividade (grid/cards/tabelas em mobile).
4. Garantir consistência de texto/planos em pricing e admin.
5. Reduzir warnings/erros que podem causar regressão visual/comportamental.

## Critérios de aceite
- Fluxo de geração/login/pagamento/admin sem bloqueio de UX.
- Estados de erro claros e acionáveis.
- Navegação e ações utilizáveis em mobile e desktop.
- `npm run build` verde e sem quebra de tela.

## Saída esperada
- Lista de bugs de UX corrigidos
- Evidência (arquivo/linha)
- Riscos remanescentes
