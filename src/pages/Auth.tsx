import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Mail, Lock, User, Loader2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; phone?: string }>({});
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Capture referral code from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('nutriai_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/gerar-receitas');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const emailSchema = z.string().email(t('auth.errors.invalidEmail'));
    // Password must be at least 8 characters for better security
    const passwordSchema = z.string()
      .min(8, t('auth.errors.passwordMin'))
      .regex(/[A-Za-z]/, t('auth.errors.passwordLetter'))
      .regex(/[0-9]/, t('auth.errors.passwordNumber'));
    const nameSchema = z.string().min(2, t('auth.errors.nameMin'));
    const phoneSchema = z.string().min(10, t('auth.errors.invalidPhone')).regex(/^[\d\s\(\)\-\+]+$/, t('auth.errors.invalidPhone'));

    if (isLogin) {
      // Para login: email OU telefone (pelo menos um deve ser válido)
      const isPhone = /^[\d\s\(\)\-\+]+$/.test(email.trim()) && !email.includes('@');

      if (isPhone) {
        // Se parece telefone, valida como telefone
        try {
          phoneSchema.parse(email);
        } catch {
          newErrors.email = t('auth.errors.invalidPhone');
        }
      } else {
        // Se parece email, valida como email
        try {
          emailSchema.parse(email);
        } catch {
          newErrors.email = t('auth.errors.invalidEmail');
        }
      }
    } else {
      // Para cadastro: todos os campos são obrigatórios
      try {
        emailSchema.parse(email);
      } catch {
        newErrors.email = t('auth.errors.invalidEmail');
      }

      try {
        nameSchema.parse(fullName);
      } catch {
        newErrors.name = t('auth.errors.nameMin');
      }

      try {
        phoneSchema.parse(phone);
      } catch {
        newErrors.phone = t('auth.errors.invalidPhone');
      }
    }

    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = t('auth.errors.passwordMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        // Para login, usa o campo email que pode conter email ou telefone
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: t('auth.errors.loginError'),
              description: t('auth.errors.wrongCredentials'),
              variant: 'destructive',
            });
          } else if (error.message.includes('Conta não encontrada') || error.message.includes('não encontrada')) {
            toast({
              title: t('auth.errors.loginError'),
              description: t('auth.errors.noProfile'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('auth.errors.loginError'),
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          // Save email/phone if "Remember Me" is checked (only if it's an email)
          if (rememberMe && email.includes('@')) {
            localStorage.setItem('nutriai_remembered_email', email);
          } else {
            localStorage.removeItem('nutriai_remembered_email');
          }

          toast({
            title: t('auth.success.loginTitle'),
            description: t('auth.success.loginMessage'),
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName, phone, referralCode || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: t('auth.errors.signupError'),
              description: t('auth.errors.emailExists'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('auth.errors.signupError'),
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: t('auth.success.signupTitle'),
            description: t('auth.success.signupMessage'),
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block"><Header /></div>

      <main className="pt-8 md:pt-28 pb-24 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8 animate-fade-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-hero flex items-center justify-center shadow-glow">
                <ChefHat className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
              </h1>
              <p className="text-muted-foreground">
                {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
              </p>
            </div>

            {/* Referral Badge */}
            {referralCode && !isLogin && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-center animate-fade-up">
                <p className="text-sm text-primary font-medium">
                  🎉 Você foi indicado! Código: <span className="font-mono font-bold">{referralCode}</span>
                </p>
              </div>
            )}

            {/* Form */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-lg animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('auth.fullName')} *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder={t('auth.yourName')}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('auth.phone')} *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t('auth.phonePlaceholder')}
                          value={phone}
                          onChange={(e) => {
                            // Remove caracteres não numéricos exceto +, espaços, parênteses e hífen
                            const value = e.target.value.replace(/[^\d\s\(\)\-\+]/g, '');
                            setPhone(value);
                          }}
                          className="pl-10"
                          required
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{isLogin ? t('auth.emailOrPhone') : `${t('auth.email')} *`}</Label>
                  <div className="relative">
                    {isLogin ? (
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    )}
                    <Input
                      id="email"
                      type={isLogin ? "text" : "email"}
                      placeholder={isLogin ? t('auth.emailOrPhonePlaceholder') : "seu@email.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')} *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {isLogin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t('auth.rememberMe')}
                    </Label>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isLogin ? t('auth.loggingIn') : t('auth.creatingAccount')}
                    </>
                  ) : (
                    isLogin ? t('auth.login') : t('auth.signup')
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setErrors({});
                      setPhone('');
                    }}
                    className="ml-1 text-primary font-medium hover:underline"
                  >
                    {isLogin ? t('auth.createAccountLink') : t('auth.loginLink')}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="hidden md:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default Auth;
