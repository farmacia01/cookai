-- Script para limpar a tabela subscriptions
-- ATENÇÃO: Este script remove TODOS os registros da tabela subscriptions
-- Use com cuidado em produção!

-- Opção 1: TRUNCATE (mais rápido, remove todos os registros e reseta os contadores)
TRUNCATE TABLE public.subscriptions RESTART IDENTITY CASCADE;

-- Opção 2: DELETE (remove registros mas mantém estrutura)
-- DELETE FROM public.subscriptions;

-- Opção 3: DELETE com condição (remover apenas subscriptions específicas)
-- DELETE FROM public.subscriptions WHERE status = 'inactive';
-- DELETE FROM public.subscriptions WHERE created_at < NOW() - INTERVAL '30 days';

-- Verificar se a tabela está vazia
-- SELECT COUNT(*) FROM public.subscriptions;

