# CookAI

App web (com build mobile via Capacitor) que gera receitas a partir de uma foto da geladeira ou da despensa, usando IA para reconhecer ingredientes e montar refeições de acordo com o objetivo do usuário.

## O que é

O CookAI é um SaaS completo de geração de receitas por IA: o usuário tira uma foto dos ingredientes que tem em casa, escolhe um "modo" (ex.: aproveitar o que tem na geladeira, hipertrofia, secar, GLP-1) e uma categoria de refeição, e a aplicação retorna receitas com informações nutricionais (calorias, proteína, carboidratos, gordura), lista de compras e opção de registrar refeições extras no diário alimentar.

Além do fluxo principal de geração de receitas, o projeto inclui um conjunto real de funcionalidades de produto:

- autenticação e perfil de usuário (metas nutricionais, restrições alimentares);
- planos pagos com limites de uso (receitas geradas por mês, receitas salvas) e integração de assinatura/pagamento;
- painel administrativo (usuários, assinaturas, logs de geração, broadcast de notificações);
- sistema de indicação/afiliados (referrals);
- notificações push (Web Push) com automações via n8n para lembretes diários de refeição;
- internacionalização (pt-BR, en, es);
- build mobile via Capacitor (Android).

Não é um projeto de brinquedo: há migrations reais de banco de dados, Edge Functions, tratamento de erros, controle de acesso e regras de negócio (limites por plano, RLS no Supabase) construídos ao longo do tempo.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, React Router, TanStack Query
- **UI**: Tailwind CSS + shadcn/ui (Radix UI), i18next para internacionalização
- **Backend**: Supabase (Postgres + Auth + Edge Functions em Deno) para geração de receitas, estimativa de macros, geração de imagem de receita e envio de notificações
- **Mobile**: Capacitor (Android)
- **Automação**: workflows n8n para push notifications agendadas
- **Deploy**: Vercel (frontend + rotas de API para push)

## Estrutura do projeto

```
src/
  pages/        # Rotas: geração de receitas, dashboard, preços, admin, afiliados...
  components/    # Componentes de UI, receita, admin, push, layout
  hooks/         # useRecipes, useSubscription, useUserLimits, useNotifications...
  contexts/       # AuthContext
  i18n/           # Traduções pt/en/es
supabase/
  functions/      # Edge Functions: generate-recipes, generate-recipe-image,
                  # estimate-meal-macros, push-subscriptions, send-broadcast
  migrations/     # Histórico de migrations do banco (Postgres)
n8n/              # Workflows de automação para notificações push
api/              # Rotas serverless (Vercel) para push notifications
```

## Como rodar localmente

Pré-requisitos: Node.js e uma conta/projeto Supabase (para as variáveis de ambiente abaixo).

```bash
# instalar dependências
npm i

# variáveis de ambiente necessárias (crie um .env local)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...

# ambiente de desenvolvimento
npm run dev

# build de produção
npm run build

# lint
npm run lint
```

As Edge Functions (geração de receitas, macros, notificações) rodam no Supabase e exigem chaves próprias configuradas no painel do projeto Supabase, não incluídas neste repositório.

## Observação

Este repositório foi criado a partir do Lovable (a interface tinha o texto de boilerplate original) e evoluiu para um produto com regras de negócio, banco de dados e integrações reais — não é apenas o esqueleto inicial gerado pela plataforma.
