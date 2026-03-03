-- ============================================
-- FUNÇÕES PARA TABELA PROFILES
-- ============================================

-- Função melhorada para criar perfil ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Usuário'),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Função para obter ou criar perfil de usuário
CREATE OR REPLACE FUNCTION public.get_or_create_profile(p_user_id UUID, p_full_name TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- Tenta buscar o perfil existente
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE profiles.user_id = p_user_id;
  
  -- Se não existir, cria um novo
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (p_user_id, COALESCE(p_full_name, 'Usuário'))
    RETURNING * INTO v_profile;
  END IF;
  
  RETURN QUERY SELECT 
    v_profile.id,
    v_profile.user_id,
    v_profile.full_name,
    v_profile.avatar_url,
    v_profile.created_at,
    v_profile.updated_at;
END;
$$;

-- Função para atualizar perfil do usuário
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_daily_calories_goal INTEGER DEFAULT NULL,
  p_daily_protein_goal INTEGER DEFAULT NULL,
  p_daily_carbs_goal INTEGER DEFAULT NULL,
  p_daily_fat_goal INTEGER DEFAULT NULL,
  p_dietary_restrictions TEXT[] DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    daily_calories_goal = COALESCE(p_daily_calories_goal, daily_calories_goal),
    daily_protein_goal = COALESCE(p_daily_protein_goal, daily_protein_goal),
    daily_carbs_goal = COALESCE(p_daily_carbs_goal, daily_carbs_goal),
    daily_fat_goal = COALESCE(p_daily_fat_goal, daily_fat_goal),
    dietary_restrictions = COALESCE(p_dietary_restrictions, dietary_restrictions),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;
  
  IF NOT FOUND THEN
    -- Se não encontrou, cria o perfil
    INSERT INTO public.profiles (
      user_id, 
      full_name, 
      avatar_url,
      daily_calories_goal,
      daily_protein_goal,
      daily_carbs_goal,
      daily_fat_goal,
      dietary_restrictions
    )
    VALUES (
      p_user_id,
      COALESCE(p_full_name, 'Usuário'),
      p_avatar_url,
      p_daily_calories_goal,
      p_daily_protein_goal,
      p_daily_carbs_goal,
      p_daily_fat_goal,
      p_dietary_restrictions
    )
    RETURNING * INTO v_profile;
  END IF;
  
  RETURN v_profile;
END;
$$;

-- ============================================
-- FUNÇÕES PARA TABELA RECIPES
-- ============================================

-- Função para criar receita
CREATE OR REPLACE FUNCTION public.create_recipe(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_prep_time TEXT DEFAULT NULL,
  p_servings INTEGER DEFAULT 2,
  p_calories INTEGER DEFAULT NULL,
  p_protein INTEGER DEFAULT NULL,
  p_carbs INTEGER DEFAULT NULL,
  p_fat INTEGER DEFAULT NULL,
  p_ingredients JSONB DEFAULT '[]'::jsonb,
  p_instructions JSONB DEFAULT '[]'::jsonb,
  p_mode TEXT DEFAULT 'faxina',
  p_image_url TEXT DEFAULT NULL
)
RETURNS public.recipes
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recipe public.recipes;
BEGIN
  INSERT INTO public.recipes (
    user_id,
    title,
    description,
    prep_time,
    servings,
    calories,
    protein,
    carbs,
    fat,
    ingredients,
    instructions,
    mode,
    image_url
  )
  VALUES (
    p_user_id,
    p_title,
    p_description,
    p_prep_time,
    p_servings,
    p_calories,
    p_protein,
    p_carbs,
    p_fat,
    p_ingredients,
    p_instructions,
    p_mode,
    p_image_url
  )
  RETURNING * INTO v_recipe;
  
  RETURN v_recipe;
END;
$$;

-- Função para atualizar receita
CREATE OR REPLACE FUNCTION public.update_recipe(
  p_recipe_id UUID,
  p_user_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_prep_time TEXT DEFAULT NULL,
  p_servings INTEGER DEFAULT NULL,
  p_calories INTEGER DEFAULT NULL,
  p_protein INTEGER DEFAULT NULL,
  p_carbs INTEGER DEFAULT NULL,
  p_fat INTEGER DEFAULT NULL,
  p_ingredients JSONB DEFAULT NULL,
  p_instructions JSONB DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_is_favorite BOOLEAN DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL
)
RETURNS public.recipes
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recipe public.recipes;
BEGIN
  UPDATE public.recipes
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    prep_time = COALESCE(p_prep_time, prep_time),
    servings = COALESCE(p_servings, servings),
    calories = COALESCE(p_calories, calories),
    protein = COALESCE(p_protein, protein),
    carbs = COALESCE(p_carbs, carbs),
    fat = COALESCE(p_fat, fat),
    ingredients = COALESCE(p_ingredients, ingredients),
    instructions = COALESCE(p_instructions, instructions),
    image_url = COALESCE(p_image_url, image_url),
    is_favorite = COALESCE(p_is_favorite, is_favorite),
    rating = COALESCE(p_rating, rating)
  WHERE id = p_recipe_id AND user_id = p_user_id
  RETURNING * INTO v_recipe;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe not found or access denied';
  END IF;
  
  RETURN v_recipe;
END;
$$;

-- Função para obter receitas do usuário
CREATE OR REPLACE FUNCTION public.get_user_recipes(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_mode TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  prep_time TEXT,
  servings INTEGER,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  ingredients JSONB,
  instructions JSONB,
  mode TEXT,
  image_url TEXT,
  is_favorite BOOLEAN,
  rating INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.title,
    r.description,
    r.prep_time,
    r.servings,
    r.calories,
    r.protein,
    r.carbs,
    r.fat,
    r.ingredients,
    r.instructions,
    r.mode,
    r.image_url,
    r.is_favorite,
    r.rating,
    r.created_at
  FROM public.recipes r
  WHERE r.user_id = p_user_id
    AND (p_mode IS NULL OR r.mode = p_mode)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- FUNÇÕES PARA TABELA SUBSCRIPTIONS
-- ============================================

-- Função para criar ou atualizar assinatura
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_user_id UUID,
  p_hubla_subscription_id TEXT,
  p_hubla_user_id TEXT,
  p_product_id TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'inactive',
  p_credits INTEGER DEFAULT 0,
  p_billing_cycle_months INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_auto_renew BOOLEAN DEFAULT true,
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions;
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    hubla_subscription_id,
    hubla_user_id,
    product_id,
    product_name,
    status,
    credits,
    billing_cycle_months,
    payment_method,
    auto_renew,
    current_period_start,
    current_period_end
  )
  VALUES (
    p_user_id,
    p_hubla_subscription_id,
    p_hubla_user_id,
    p_product_id,
    p_product_name,
    p_status,
    p_credits,
    p_billing_cycle_months,
    p_payment_method,
    p_auto_renew,
    p_current_period_start,
    p_current_period_end
  )
  ON CONFLICT (hubla_subscription_id) 
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    hubla_user_id = EXCLUDED.hubla_user_id,
    product_id = EXCLUDED.product_id,
    product_name = EXCLUDED.product_name,
    status = EXCLUDED.status,
    credits = EXCLUDED.credits,
    billing_cycle_months = EXCLUDED.billing_cycle_months,
    payment_method = EXCLUDED.payment_method,
    auto_renew = EXCLUDED.auto_renew,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now()
  RETURNING * INTO v_subscription;
  
  RETURN v_subscription;
END;
$$;

-- Função para obter assinatura ativa do usuário
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id UUID)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_subscription;
END;
$$;

-- ============================================
-- FUNÇÕES PARA TABELA GENERATION_LOGS
-- ============================================

-- Função para criar log de geração
CREATE OR REPLACE FUNCTION public.create_generation_log(
  p_user_id UUID,
  p_tokens_used INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'success',
  p_mode TEXT DEFAULT NULL,
  p_ingredients_count INTEGER DEFAULT 0
)
RETURNS public.generation_logs
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_log public.generation_logs;
BEGIN
  INSERT INTO public.generation_logs (
    user_id,
    tokens_used,
    status,
    mode,
    ingredients_count
  )
  VALUES (
    p_user_id,
    p_tokens_used,
    p_status,
    p_mode,
    p_ingredients_count
  )
  RETURNING * INTO v_log;
  
  RETURN v_log;
END;
$$;

-- Função para obter estatísticas de geração (apenas para admins)
CREATE OR REPLACE FUNCTION public.get_generation_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_generations BIGINT,
  successful_generations BIGINT,
  failed_generations BIGINT,
  total_tokens_used BIGINT,
  unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_generations,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_generations,
    COUNT(*) FILTER (WHERE status != 'success')::BIGINT as failed_generations,
    COALESCE(SUM(tokens_used), 0)::BIGINT as total_tokens_used,
    COUNT(DISTINCT user_id)::BIGINT as unique_users
  FROM public.generation_logs
  WHERE (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

-- ============================================
-- FUNÇÕES PARA TABELA USER_USAGE
-- ============================================

-- Função para incrementar uso do usuário
CREATE OR REPLACE FUNCTION public.increment_user_usage(
  p_user_id UUID,
  p_month_year TEXT DEFAULT NULL
)
RETURNS public.user_usage
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month_year TEXT;
  v_usage public.user_usage;
BEGIN
  -- Se não foi fornecido, usa o mês/ano atual
  v_month_year := COALESCE(p_month_year, TO_CHAR(now(), 'YYYY-MM'));
  
  INSERT INTO public.user_usage (user_id, month_year, recipes_generated)
  VALUES (p_user_id, v_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    recipes_generated = user_usage.recipes_generated + 1,
    updated_at = now()
  RETURNING * INTO v_usage;
  
  RETURN v_usage;
END;
$$;

-- Função para obter uso do usuário
CREATE OR REPLACE FUNCTION public.get_user_usage(
  p_user_id UUID,
  p_month_year TEXT DEFAULT NULL
)
RETURNS public.user_usage
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month_year TEXT;
  v_usage public.user_usage;
BEGIN
  v_month_year := COALESCE(p_month_year, TO_CHAR(now(), 'YYYY-MM'));
  
  SELECT * INTO v_usage
  FROM public.user_usage
  WHERE user_id = p_user_id
    AND month_year = v_month_year;
  
  RETURN v_usage;
END;
$$;

-- ============================================
-- POLÍTICAS RLS PARA ADMINS
-- ============================================

-- Admins podem visualizar todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar todos os perfis
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem visualizar todas as receitas
DROP POLICY IF EXISTS "Admins can view all recipes" ON public.recipes;
CREATE POLICY "Admins can view all recipes"
ON public.recipes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem visualizar todas as assinaturas
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem visualizar todo o uso
DROP POLICY IF EXISTS "Admins can view all user usage" ON public.user_usage;
CREATE POLICY "Admins can view all user usage"
ON public.user_usage
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

