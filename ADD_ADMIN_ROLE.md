# Como Adicionar Role de Admin

Para acessar a página `/admin`, você precisa ter a role `admin` na tabela `user_roles`.

## Opção 1: Via SQL Editor do Supabase

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o seguinte SQL (substitua `SEU_EMAIL_AQUI` pelo seu email):

```sql
-- Adicionar role de admin usando email
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE u.email = 'SEU_EMAIL_AQUI'
ON CONFLICT (user_id, role) DO NOTHING;
```

## Opção 2: Usando o ID do usuário

Se você souber o ID do usuário (pode ver no console do navegador quando acessar /admin):

```sql
-- Substitua USER_ID_AQUI pelo ID do usuário
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Opção 3: Verificar usuários existentes

Para ver todos os usuários e suas roles:

```sql
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
```

## Verificar se funcionou

Após adicionar a role, acesse `/admin` novamente. Abra o console do navegador (F12) para ver os logs de debug.

