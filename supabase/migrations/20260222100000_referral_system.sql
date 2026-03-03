-- ============================================
-- Sistema de Afiliados / Indicação
-- ============================================

-- 1. Adicionar referral_code ao profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;

-- 2. Gerar códigos para profiles existentes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;

-- 3. Auto-gerar referral_code para novos users via trigger
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code_trigger ON public.profiles;
CREATE TRIGGER set_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_code();

-- Gerar códigos para profiles existentes que não têm
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;


-- ============================================
-- 4. Tabela de indicações (quem indicou quem)
-- ============================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_awarded INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending', -- pending (signup) -> completed (purchase)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(referred_id) -- cada user só pode ser indicado uma vez
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Usuários vêem suas próprias indicações (como referrer)
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
CREATE POLICY "Users can view their referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

-- Admins vêem tudo
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role full access
DROP POLICY IF EXISTS "Service role manages referrals" ON public.referrals;
CREATE POLICY "Service role manages referrals"
  ON public.referrals FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);


-- ============================================
-- 5. Catálogo de recompensas
-- ============================================
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'credits', -- credits, free_days, discount
  reward_value INTEGER NOT NULL DEFAULT 0, -- ex: 10 créditos, 7 dias, 20% desconto
  image_url TEXT, -- URL da imagem da recompensa
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Todos authenticated podem ver recompensas ativas
DROP POLICY IF EXISTS "Users can view active rewards" ON public.referral_rewards;
CREATE POLICY "Users can view active rewards"
  ON public.referral_rewards FOR SELECT TO authenticated
  USING (active = true);

-- Admins gerenciam recompensas
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.referral_rewards;
CREATE POLICY "Admins can manage rewards"
  ON public.referral_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role full access
DROP POLICY IF EXISTS "Service role manages rewards" ON public.referral_rewards;
CREATE POLICY "Service role manages rewards"
  ON public.referral_rewards FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================
-- 6. Resgates de recompensas
-- ============================================
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.referral_rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

-- Usuários vêem seus resgates
DROP POLICY IF EXISTS "Users can view their redemptions" ON public.referral_redemptions;
CREATE POLICY "Users can view their redemptions"
  ON public.referral_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Usuários podem criar resgates
DROP POLICY IF EXISTS "Users can create redemptions" ON public.referral_redemptions;
CREATE POLICY "Users can create redemptions"
  ON public.referral_redemptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins gerenciam resgates
DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.referral_redemptions;
CREATE POLICY "Admins can manage redemptions"
  ON public.referral_redemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role full access
DROP POLICY IF EXISTS "Service role manages redemptions" ON public.referral_redemptions;
CREATE POLICY "Service role manages redemptions"
  ON public.referral_redemptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.referral_redemptions(user_id);


-- ============================================
-- 7. RPC: Processar indicação após signup
-- ============================================
CREATE OR REPLACE FUNCTION public.process_referral(
  p_referral_code TEXT,
  p_referred_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_already_referred BOOLEAN;
BEGIN
  -- Buscar quem tem esse código
  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_referrer_id = p_referred_user_id THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id)
  INTO v_already_referred;

  IF v_already_referred THEN
    RETURN FALSE;
  END IF;

  -- Registrar indicação como PENDENTE (pontos só creditados após compra)
  INSERT INTO public.referrals (referrer_id, referred_id, points_awarded, status)
  VALUES (v_referrer_id, p_referred_user_id, 10, 'pending');

  RETURN TRUE;
END;
$$;

-- RPC: Creditar pontos quando indicado compra plano
CREATE OR REPLACE FUNCTION public.award_referral_points(
  p_referred_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referral public.referrals;
BEGIN
  -- Buscar referral pendente
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = p_referred_user_id AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Marcar como completado
  UPDATE public.referrals
  SET status = 'completed'
  WHERE id = v_referral.id;

  -- Dar pontos ao referrer
  UPDATE public.profiles
  SET referral_points = COALESCE(referral_points, 0) + v_referral.points_awarded
  WHERE user_id = v_referral.referrer_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_referral(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_referral_points(UUID) TO service_role;


-- ============================================
-- 8. RPC: Resgatar recompensa
-- ============================================
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_points_cost INTEGER;
  v_user_points INTEGER;
  v_reward_active BOOLEAN;
BEGIN
  -- Buscar custo da recompensa
  SELECT points_cost, active INTO v_points_cost, v_reward_active
  FROM public.referral_rewards
  WHERE id = p_reward_id;

  IF v_points_cost IS NULL OR NOT v_reward_active THEN
    RETURN FALSE;
  END IF;

  -- Buscar pontos do usuário
  SELECT COALESCE(referral_points, 0) INTO v_user_points
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_user_points < v_points_cost THEN
    RETURN FALSE;
  END IF;

  -- Descontar pontos
  UPDATE public.profiles
  SET referral_points = referral_points - v_points_cost
  WHERE user_id = p_user_id;

  -- Registrar resgate
  INSERT INTO public.referral_redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_points_cost, 'approved');

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID) TO authenticated;


-- ============================================
-- 9. Inserir recompensas padrão
-- ============================================
INSERT INTO public.referral_rewards (name, description, points_cost, reward_type, reward_value) VALUES
  ('+10 Créditos de Receitas', 'Ganhe 10 créditos extras para gerar receitas', 30, 'credits', 10),
  ('+50 Créditos de Receitas', 'Ganhe 50 créditos extras para gerar receitas', 100, 'credits', 50),
  ('7 Dias Grátis de Premium', 'Ganhe 7 dias de acesso premium grátis', 50, 'free_days', 7),
  ('30 Dias Grátis de Premium', 'Ganhe 30 dias de acesso premium grátis', 150, 'free_days', 30)
ON CONFLICT DO NOTHING;
