import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChefHat, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(false); // Defaulting to "Create an account" like the image
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; phone?: string }>({});
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('nutriai_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setIsLogin(true);
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
    const passwordSchema = z.string()
      .min(8, t('auth.errors.passwordMin'))
      .regex(/[A-Za-z]/, t('auth.errors.passwordLetter'))
      .regex(/[0-9]/, t('auth.errors.passwordNumber'));
    const nameSchema = z.string().min(2, t('auth.errors.nameMin'));
    const phoneSchema = z.string().min(10, t('auth.errors.invalidPhone')).regex(/^[\d\s\(\)\-\+]+$/, t('auth.errors.invalidPhone'));

    if (isLogin) {
      const isPhone = /^[\d\s\(\)\-\+]+$/.test(email.trim()) && !email.includes('@');
      if (isPhone) {
        try { phoneSchema.parse(email); } catch { newErrors.email = t('auth.errors.invalidPhone'); }
      } else {
        try { emailSchema.parse(email); } catch { newErrors.email = t('auth.errors.invalidEmail'); }
      }
    } else {
      try { emailSchema.parse(email); } catch { newErrors.email = t('auth.errors.invalidEmail'); }
      try { nameSchema.parse(fullName); } catch { newErrors.name = t('auth.errors.nameMin'); }
      try { phoneSchema.parse(phone); } catch { newErrors.phone = t('auth.errors.invalidPhone'); }
    }

    try { passwordSchema.parse(password); } catch { newErrors.password = t('auth.errors.passwordMin'); }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: t('auth.errors.loginError'), description: error.message, variant: 'destructive' });
        } else {
          toast({ title: t('auth.success.loginTitle'), description: t('auth.success.loginMessage') });
        }
      } else {
        const { error } = await signUp(email, password, fullName, phone, referralCode || undefined);
        if (error) {
          toast({ title: t('auth.errors.signupError'), description: error.message, variant: 'destructive' });
        } else {
          toast({ title: t('auth.success.signupTitle'), description: t('auth.success.signupMessage') });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0F0D] relative flex flex-col md:justify-center overflow-hidden">

      {/* ── Background Effects ── */}
      {/* Mobile background (Lime mesh glow) */}
      <div className="absolute inset-x-0 top-0 h-[50vh] md:hidden overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#A3E635]/20 to-transparent" />
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(hsl(82 100% 58% / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(82 100% 58% / 0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform: "perspective(500px) rotateX(40deg) scale(1.5)",
          transformOrigin: "top"
        }} />
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center justify-center animate-float">
          <div className="relative">
            <div className="absolute inset-0 bg-[#A3E635] blur-[80px] opacity-40 rounded-full scale-150" />
            <div className="w-40 h-40 bg-[#161D19] rounded-full border-2 border-[#A3E635]/40 flex items-center justify-center relative z-10 shadow-[inset_0_0_30px_rgba(163,230,53,0.2)]">
              <ChefHat className="w-20 h-20 text-[#A3E635] opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Background */}
      <div className="hidden md:block absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#A3E635]/10 blur-[120px] rounded-full" />
      </div>

      <div className="hidden md:block absolute top-0 left-0 w-full z-10"><Header /></div>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col justify-end md:justify-center relative z-20 pb-0 md:pb-16 md:pt-28 min-h-screen md:min-h-0">
        <div className="w-full max-w-[420px] mx-auto w-full">

          {/* Card Container */}
          <div
            className="bg-[#131514]/95 backdrop-blur-xl md:bg-[#161D19] md:rounded-[32px] rounded-t-[32px] rounded-b-none border-t border-x border-[#2a2a2a] md:border p-6 sm:p-8 shadow-2xl animate-fade-up min-h-[65vh] md:min-h-0 flex flex-col"
            style={{ animationDelay: '0.1s' }}
          >
            {/* Drag Handle (Mobile only) */}
            <div className="w-12 h-1 bg-[#333] rounded-full mx-auto mb-8 md:hidden" />

            <div className="text-center mb-8">
              <h1 className="text-[22px] font-semibold text-white tracking-wide">
                {isLogin ? "Welcome back" : "Create an account"}
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              {!isLogin && (
                <>
                  <div className="relative">
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-[52px] bg-transparent border-[#333] rounded-full px-6 text-sm text-white placeholder:text-[#666] focus-visible:ring-[#A3E635] focus-visible:border-[#A3E635] transition-all"
                      required
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.name}</p>}
                  </div>

                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\(\)\-\+]/g, ''))}
                      className="w-full h-[52px] bg-transparent border-[#333] rounded-full px-6 text-sm text-white placeholder:text-[#666] focus-visible:ring-[#A3E635] focus-visible:border-[#A3E635] transition-all"
                      required
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.phone}</p>}
                  </div>
                </>
              )}

              <div className="relative">
                <Input
                  id="email"
                  type={isLogin ? "text" : "email"}
                  placeholder={isLogin ? "Email address or Phone" : "Email address"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[52px] bg-transparent border-[#333] rounded-full px-6 text-sm text-white placeholder:text-[#666] focus-visible:ring-[#A3E635] focus-visible:border-[#A3E635] transition-all"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.email}</p>}
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[52px] bg-transparent border-[#333] rounded-full px-6 pr-12 text-sm text-white placeholder:text-[#666] focus-visible:ring-[#A3E635] focus-visible:border-[#A3E635] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {errors.password && <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.password}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] mt-2 mb-2 bg-[#A3E635] hover:bg-[#bef264] text-[#111] font-semibold text-[15px] rounded-full shadow-[0_4px_20px_rgba(163,230,53,0.25)] transition-all hover:scale-[1.02] flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Continue"
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-[#333] flex-1" />
                <span className="text-[11px] text-[#666] font-medium tracking-wide">or sign up with</span>
                <div className="h-px bg-[#333] flex-1" />
              </div>

              {/* Social Buttons */}
              <div className="flex items-center gap-3">
                <button type="button" className="flex-1 h-[52px] rounded-full border border-[#333] hover:border-[#555] flex items-center justify-center hover:bg-white/5 transition-all focus:outline-none focus:ring-1 focus:ring-[#A3E635]/50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M5.264 9.764A7.076 7.076 0 0 1 12 5c1.782 0 3.398.63 4.673 1.666l3.414-3.414C17.935 1.34 15.176 0 12 0 7.306 0 3.23 2.7 1.05 6.706l4.214 3.058Z" />
                    <path fill="#34A853" d="M16.035 15.684A6.994 6.994 0 0 1 12 19c-2.73 0-5.093-1.558-6.248-3.834L1.442 18.31C3.545 22.502 7.502 24 12 24c3.24 0 5.968-1.07 7.957-2.906l-3.922-5.41Z" />
                    <path fill="#4A90E2" d="M23.636 12.273c0-.853-.07-1.67-.197-2.455H12v5.033h6.666c-.302 1.76-1.328 3.242-2.83 4.24l3.923 5.396C22.05 22.36 23.636 17.653 23.636 12.273Z" />
                    <path fill="#FBBC05" d="M5.752 15.166A6.994 6.994 0 0 1 5 12c0-1.107.265-2.155.735-3.084L1.521 5.858A11.966 11.966 0 0 0 0 12c0 2.05.518 3.985 1.442 5.69l4.31-2.524Z" />
                  </svg>
                </button>
                <button type="button" className="flex-1 h-[52px] rounded-full border border-[#333] hover:border-[#555] flex items-center justify-center hover:bg-white/5 transition-all focus:outline-none focus:ring-1 focus:ring-[#A3E635]/50">
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2.744c.913-1.127 2.196-1.892 3.637-1.928.188 1.487-.472 2.87-1.353 3.966-.88.1068-2.227 1.9-3.483 1.832-.218-1.465.46-2.843 1.199-3.87zM16.666 18c-1.134 1.583-2.316 3.16-4.045 3.18-1.688.02-2.234-1.026-4.162-1.026-1.928 0-2.531 1.006-4.143 1.045-1.748.04-3.12-1.756-4.275-3.359-2.353-3.267-4.152-9.227-1.748-13.255C3.394 2.651 5.257 1.517 7.085 1.497c1.666-.02 3.228 1.085 4.257 1.085 1.03 0 2.924-1.328 4.965-1.128 2.378.232 4.414 1.189 5.604 3.018-4.708 2.768-3.951 9.423.864 11.391-.32 1.407-1.439 2.822-2.11 3.137z" />
                  </svg>
                </button>
              </div>

              {/* Bottom Switch Link */}
              <div className="mt-8 text-center text-xs font-medium pb-2">
                <span className="text-[#888]">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-[#A3E635] hover:underline"
                >
                  {isLogin ? "Sign Up" : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Hide bottom nav on auth page for cleaner look, similar to the reference */}
      {/* <div className="md:hidden"><MobileBottomNav /></div> is removed for full-screen immersive effect */}
    </div>
  );
};

export default Auth;
