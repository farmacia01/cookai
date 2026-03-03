#!/bin/bash

# Script para fazer push das alterações para o GitHub
# Execute este script após instalar as ferramentas de desenvolvedor do Xcode

cd "$(dirname "$0")"

echo "🚀 Inicializando repositório Git..."

# Inicializar git se não estiver inicializado
if [ ! -d .git ]; then
    git init
fi

# Configurar remote
echo "📡 Configurando remote..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/ryanasafebusiness/nutraai.git

# Adicionar todos os arquivos
echo "📦 Adicionando arquivos..."
git add .

# Verificar status
echo "📊 Status do repositório:"
git status --short | head -20

# Fazer commit
echo "💾 Fazendo commit..."
git commit -m "feat: adiciona página admin completa com gerenciamento de planos, filtros e dashboard detalhado

- Adiciona página admin em /admin com autenticação
- Implementa gerenciamento completo de assinaturas (adicionar, editar, remover planos)
- Adiciona filtros por tipo de plano e atividade de usuários
- Expande dashboard com métricas detalhadas (usuários ativos/inativos, receitas por modo, top usuários)
- Adiciona rastreamento de última receita gerada por usuário
- Implementa limite de 200 receitas para plano mensal
- Adiciona políticas RLS para admins gerenciarem assinaturas
- Melhora responsividade da interface admin
- Adiciona migração para campo last_recipe_generated_at"

# Definir branch principal
echo "🌿 Configurando branch main..."
git branch -M main

# Fazer push
echo "⬆️  Fazendo push para GitHub..."
git push -u origin main

echo "✅ Concluído!"

