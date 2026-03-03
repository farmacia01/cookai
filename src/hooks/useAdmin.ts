import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: isAdmin, isLoading: roleLoading, error } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('[useAdmin] No user ID');
        return false;
      }
      
      console.log('[useAdmin] Checking admin role for user:', user.id);
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('[useAdmin] Error checking admin role:', error);
        console.error('[useAdmin] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }
      
      console.log('[useAdmin] Role check result:', data);
      return data === true;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  if (error) {
    console.error('[useAdmin] Query error:', error);
  }

  return {
    isAdmin: isAdmin ?? false,
    loading: authLoading || roleLoading,
    user,
    error,
  };
};