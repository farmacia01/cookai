-- Adicionar campo para rastrear quando o usuário gerou a última receita
-- Isso ajuda a monitorar usuários ativos e inativos

-- Adicionar coluna na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_recipe_generated_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para queries rápidas de ordenação
CREATE INDEX IF NOT EXISTS idx_profiles_last_recipe_generated_at 
ON public.profiles(last_recipe_generated_at DESC NULLS LAST);

-- Criar função para atualizar automaticamente quando uma receita é inserida
CREATE OR REPLACE FUNCTION public.update_user_last_recipe_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Atualiza o campo last_recipe_generated_at no perfil do usuário
  UPDATE public.profiles
  SET 
    last_recipe_generated_at = NEW.created_at,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar automaticamente quando receita é inserida
DROP TRIGGER IF EXISTS trigger_update_last_recipe_date ON public.recipes;
CREATE TRIGGER trigger_update_last_recipe_date
AFTER INSERT ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_user_last_recipe_date();

-- Atualizar registros existentes: popular last_recipe_generated_at com a data da última receita de cada usuário
UPDATE public.profiles p
SET last_recipe_generated_at = (
  SELECT MAX(r.created_at)
  FROM public.recipes r
  WHERE r.user_id = p.user_id
)
WHERE EXISTS (
  SELECT 1
  FROM public.recipes r
  WHERE r.user_id = p.user_id
);

