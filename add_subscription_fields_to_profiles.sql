-- Adicionar campos de subscription na tabela profiles
-- Isso permite verificar rapidamente se o usuário tem plano ativo sem fazer JOIN

-- Primeiro, criar a tabela subscriptions se ela não existir
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hubla_subscription_id TEXT,
  hubla_user_id TEXT,
  cakto_order_id TEXT,
  cakto_offer_id TEXT,
  cakto_customer_email TEXT,
  product_id TEXT,
  product_name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  credits INTEGER DEFAULT 0,
  billing_cycle_months INTEGER,
  payment_method TEXT,
  auto_renew BOOLEAN DEFAULT true,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices na tabela subscriptions se não existirem
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cakto_order_id ON public.subscriptions(cakto_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_cakto_order_id_unique
  ON public.subscriptions(cakto_order_id)
  WHERE cakto_order_id IS NOT NULL;

-- Habilitar RLS na tabela subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Users can view their own subscription'
  ) THEN
    CREATE POLICY "Users can view their own subscription" 
    ON public.subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Service role can manage subscriptions'
  ) THEN
    CREATE POLICY "Service role can manage subscriptions" 
    ON public.subscriptions 
    FOR ALL 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Adicionar colunas relacionadas a subscription na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_active_plan BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plan_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_current_period_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS plan_billing_cycle_months INTEGER,
  ADD COLUMN IF NOT EXISTS plan_auto_renew BOOLEAN DEFAULT false;

-- Criar índice para busca rápida de usuários com plano ativo
CREATE INDEX IF NOT EXISTS idx_profiles_has_active_plan 
  ON public.profiles(has_active_plan) 
  WHERE has_active_plan = true;

-- Criar função para atualizar os campos de plano no perfil baseado na subscription
CREATE OR REPLACE FUNCTION public.update_profile_subscription_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Se for DELETE, resetar o perfil
  IF TG_OP = 'DELETE' THEN
    -- Verificar se ainda existe outra subscription ativa para este usuário
    IF NOT EXISTS (
      SELECT 1 
      FROM public.subscriptions 
      WHERE user_id = OLD.user_id 
      AND status = 'active'
      AND id != OLD.id
    ) THEN
      -- Não há mais subscriptions ativas, resetar perfil
      UPDATE public.profiles
      SET
        has_active_plan = false,
        plan_name = NULL,
        plan_status = 'inactive',
        plan_credits = 0,
        plan_current_period_end = NULL,
        plan_billing_cycle_months = NULL,
        plan_auto_renew = false,
        updated_at = now()
      WHERE user_id = OLD.user_id;
    ELSE
      -- Ainda existe subscription ativa, atualizar com a mais recente
      UPDATE public.profiles p
      SET
        has_active_plan = true,
        plan_name = s.product_name,
        plan_status = s.status,
        plan_credits = s.credits,
        plan_current_period_end = s.current_period_end,
        plan_billing_cycle_months = s.billing_cycle_months,
        plan_auto_renew = s.auto_renew,
        updated_at = now()
      FROM (
        SELECT *
        FROM public.subscriptions
        WHERE user_id = OLD.user_id
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      ) s
      WHERE p.user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  -- Para INSERT ou UPDATE, atualizar o perfil
  UPDATE public.profiles
  SET
    has_active_plan = (NEW.status = 'active'),
    plan_name = NEW.product_name,
    plan_status = NEW.status,
    plan_credits = NEW.credits,
    plan_current_period_end = NEW.current_period_end,
    plan_billing_cycle_months = NEW.billing_cycle_months,
    plan_auto_renew = NEW.auto_renew,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar automaticamente o perfil quando subscription mudar
DROP TRIGGER IF EXISTS trigger_update_profile_on_subscription_change ON public.subscriptions;

CREATE TRIGGER trigger_update_profile_on_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_subscription_status();

-- Função para sincronizar todos os perfis com suas subscriptions ativas
CREATE OR REPLACE FUNCTION public.sync_all_profiles_with_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Atualizar todos os perfis com suas subscriptions ativas
  UPDATE public.profiles p
  SET
    has_active_plan = true,
    plan_name = s.product_name,
    plan_status = s.status,
    plan_credits = s.credits,
    plan_current_period_end = s.current_period_end,
    plan_billing_cycle_months = s.billing_cycle_months,
    plan_auto_renew = s.auto_renew,
    updated_at = now()
  FROM (
    SELECT DISTINCT ON (user_id)
      user_id,
      product_name,
      status,
      credits,
      current_period_end,
      billing_cycle_months,
      auto_renew
    FROM public.subscriptions
    WHERE status = 'active'
    ORDER BY user_id, created_at DESC
  ) s
  WHERE p.user_id = s.user_id;
  
  -- Resetar perfis que não têm subscription ativa
  UPDATE public.profiles p
  SET
    has_active_plan = false,
    plan_name = NULL,
    plan_status = 'inactive',
    plan_credits = 0,
    plan_current_period_end = NULL,
    plan_billing_cycle_months = NULL,
    plan_auto_renew = false,
    updated_at = now()
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.subscriptions s 
    WHERE s.user_id = p.user_id 
    AND s.status = 'active'
  );
END;
$$;

-- Executar sincronização inicial (descomente para sincronizar agora)
-- SELECT public.sync_all_profiles_with_subscriptions();

