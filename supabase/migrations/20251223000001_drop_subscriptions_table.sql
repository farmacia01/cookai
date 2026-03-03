-- Migration para apagar completamente a tabela subscriptions
-- ⚠️ ATENÇÃO: Este script remove a tabela e TODOS os seus dados PERMANENTEMENTE!

-- Apagar a tabela e todos os seus dados
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Nota: O CASCADE também remove:
-- - Todos os índices relacionados
-- - Todas as constraints relacionadas
-- - Todas as foreign keys que referenciam esta tabela
-- - Todas as views que dependem desta tabela

-- Se você quiser recriar a tabela depois, use a migration:
-- 20251222000000_add_cakto_fields.sql

