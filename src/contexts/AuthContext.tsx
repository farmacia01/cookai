import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, referralCode?: string) => Promise<{ error: Error | null }>;
  signIn: (emailOrPhone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningOutRef = useRef(false);

  // Function to check if profile exists with timeout
  const checkProfileExists = async (userId: string): Promise<boolean> => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000); // 5 second timeout
      });

      const checkPromise = supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
            // PGRST116 is "not found" which is expected
            console.error('Error checking profile:', error);
            return false;
          }
          return !!data;
        })
        .catch((error) => {
          console.error('Error checking profile exists:', error);
          return false;
        });

      return Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error checking profile exists:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let processingEvent = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || processingEvent) return;

        processingEvent = true;

        try {
          // Skip if we're already signing out to avoid loops
          if (isSigningOutRef.current && event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }

          if (session?.user) {
            // Set user immediately to maintain session while checking profile
            setSession(session);
            setUser(session.user);
            setLoading(false);

            // Check profile in background (don't block UI)
            checkProfileExists(session.user.id).then((profileExists) => {
              if (!mounted) return;

              if (!profileExists) {
                // User doesn't have profile, sign them out
                if (!isSigningOutRef.current) {
                  isSigningOutRef.current = true;
                  console.log('User does not have profile, signing out...');
                  setSession(null);
                  setUser(null);
                  // Don't await signOut to avoid blocking
                  supabase.auth.signOut().catch(() => { }).finally(() => {
                    isSigningOutRef.current = false;
                  });
                }
              }
            });
          } else {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        } finally {
          processingEvent = false;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        // Set user immediately to maintain session while checking profile
        setSession(session);
        setUser(session.user);
        setLoading(false);

        // Check profile in background (don't block UI)
        const profileExists = await checkProfileExists(session.user.id);

        if (!profileExists) {
          // User doesn't have profile, sign them out
          if (!isSigningOutRef.current) {
            isSigningOutRef.current = true;
            console.log('User does not have profile, signing out...');
            setSession(null);
            setUser(null);
            await supabase.auth.signOut();
            isSigningOutRef.current = false;
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string, referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    // Save lead to leads table
    if (!error && data?.user) {
      try {
        await supabase
          .from('leads')
          .insert({
            nome: fullName,
            telefone: phone,
            email: email
          });
      } catch (leadError) {
        console.error('Error saving lead:', leadError);
        // Don't fail signup if lead save fails
      }

      // Process referral if code was provided
      if (referralCode) {
        try {
          await supabase.rpc('process_referral', {
            p_referral_code: referralCode.toUpperCase(),
            p_referred_user_id: data.user.id,
          });
        } catch (refError) {
          console.error('Error processing referral:', refError);
        }
      }
    }

    return { error: error as Error | null };
  };

  const signIn = async (emailOrPhone: string, password: string) => {
    try {
      let emailToUse = emailOrPhone;

      // Check if input is a phone number (contains only digits, spaces, parentheses, hyphens, or +)
      const isPhone = /^[\d\s\(\)\-\+]+$/.test(emailOrPhone.trim()) && !emailOrPhone.includes('@');

      if (isPhone) {
        // Use secure server-side RPC to look up email by phone
        // This avoids exposing the entire leads table to the client
        const { data: email, error: rpcError } = await supabase
          .rpc('lookup_email_by_phone', { p_phone: emailOrPhone.trim() });

        if (rpcError || !email) {
          return {
            error: new Error('Telefone não encontrado. Verifique o número ou use seu email.')
          };
        }

        emailToUse = email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password
      });

      // If there's an auth error, return it immediately
      if (error) {
        return { error: error as Error | null };
      }

      // Check if profile exists after successful login
      if (data?.user) {
        const profileExists = await checkProfileExists(data.user.id);

        if (!profileExists) {
          // Sign out user if they don't have a profile (async, don't wait)
          isSigningOutRef.current = true;
          supabase.auth.signOut().catch(() => {
            // Ignore errors on signOut
          }).finally(() => {
            isSigningOutRef.current = false;
          });

          return {
            error: new Error('Conta não encontrada. Por favor, crie uma conta primeiro.')
          };
        }
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('Erro ao fazer login')
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
