-- Script para APAGAR COMPLETAMENTE a tabela subscriptions
-- ⚠️ ATENÇÃO: Este script remove a tabela e TODOS os seus dados PERMANENTEMENTE!
-- ⚠️ Use com MUITO cuidado em produção!

-- Verificar se a tabela existe antes de apagar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions'
  ) THEN
    -- Apagar a tabela e todos os seus dados
    DROP TABLE IF EXISTS public.subscriptions CASCADE;
    
    RAISE NOTICE 'Tabela subscriptions apagada com sucesso!';
  ELSE
    RAISE NOTICE 'Tabela subscriptions não existe.';
  END IF;
END $$;

-- Se quiser apagar também os índices relacionados (caso não sejam apagados pelo CASCADE)
-- DROP INDEX IF EXISTS idx_subscriptions_hubla_id;
-- DROP INDEX IF EXISTS idx_subscriptions_user_id;
-- DROP INDEX IF EXISTS idx_subscriptions_cakto_order_id;
-- DROP INDEX IF EXISTS idx_subscriptions_cakto_order_id_unique;

-- Se quiser apagar também as funções relacionadas
-- DROP FUNCTION IF EXISTS public.upsert_subscription CASCADE;
-- DROP FUNCTION IF EXISTS public.get_active_subscription CASCADE;

-- Verificar se a tabela foi apagada
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name = 'subscriptions';

