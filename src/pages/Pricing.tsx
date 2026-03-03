import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PixQrCodeModal } from "@/components/PixQrCodeModal";

// Preços dos planos em reais (ajuste conforme necessário)
const PLAN_PRICES: Record<string, number> = {
  monthly: 29.90,
  quarterly: 69.90,
  annual: 149.90,
};

const PLAN_LABELS: Record<string, string> = {
  monthly: "CookAI Pro - Mensal",
  quarterly: "CookAI Pro - Trimestral",
  annual: "CookAI Pro - Anual",
};

const Pricing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isActive, subscription } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // S6X PIX state
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code_base64: string;
    copy_paste: string;
    transaction_id: string;
    amount: number;
    expires_at: string;
  } | null>(null);
  const [pixPlanName, setPixPlanName] = useState("");

  // CPF dialog state
  const [showCpfDialog, setShowCpfDialog] = useState(false);
  const [cpfInput, setCpfInput] = useState("");
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const plans = [
    {
      id: "free",
      name: t('pricing.plans.free.name'),
      description: t('pricing.plans.free.description'),
      price: t('pricing.plans.free.price'),
      period: "",
      icon: Zap,
      popular: false,
      features: t('pricing.plans.free.features', { returnObjects: true }) as string[],
      limitations: t('pricing.plans.free.limitations', { returnObjects: true }) as string[],
      cta: t('pricing.plans.free.cta'),
      href: "/auth",
    },
    {
      id: "monthly",
      name: t('pricing.plans.monthly.name'),
      description: t('pricing.plans.monthly.description'),
      price: t('pricing.plans.monthly.price'),
      period: t('pricing.plans.monthly.period'),
      pricePerDay: t('pricing.plans.monthly.pricePerDay'),
      icon: Sparkles,
      popular: false,
      features: t('pricing.plans.monthly.features', { returnObjects: true }) as string[],
      limitations: [],
      cta: t('pricing.plans.monthly.cta'),
      href: "/auth",
    },
    {
      id: "quarterly",
      name: t('pricing.plans.quarterly.name'),
      description: t('pricing.plans.quarterly.description'),
      price: t('pricing.plans.quarterly.price'),
      period: t('pricing.plans.quarterly.period'),
      totalPrice: t('pricing.plans.quarterly.totalPrice'),
      installments: t('pricing.plans.quarterly.installments'),
      savings: t('pricing.plans.quarterly.savings'),
      pricePerDay: t('pricing.plans.quarterly.pricePerDay'),
      icon: Crown,
      popular: true,
      features: t('pricing.plans.quarterly.features', { returnObjects: true }) as string[],
      limitations: [],
      cta: t('pricing.plans.quarterly.cta'),
      href: "/auth",
    },
    {
      id: "annual",
      name: t('pricing.plans.annual.name'),
      description: t('pricing.plans.annual.description'),
      price: t('pricing.plans.annual.price'),
      period: t('pricing.plans.annual.period'),
      totalPrice: t('pricing.plans.annual.totalPrice'),
      installments: t('pricing.plans.annual.installments'),
      savings: t('pricing.plans.annual.savings'),
      pricePerDay: t('pricing.plans.annual.pricePerDay'),
      originalPrice: t('pricing.plans.annual.originalPrice'),
      icon: Crown,
      popular: false,
      features: t('pricing.plans.annual.features', { returnObjects: true }) as string[],
      limitations: [],
      cta: t('pricing.plans.annual.cta'),
      href: "/auth",
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      navigate('/gerar-receitas');
      return;
    }

    // Ask for CPF before proceeding
    setPendingPlanId(planId);
    setShowCpfDialog(true);
  };

  const handleCpfSubmit = async () => {
    if (!pendingPlanId || !user) return;

    const cleanCpf = cpfInput.replace(/\D/g, "");
    if (cleanCpf.length < 11) {
      toast({ title: "CPF inválido", description: "Informe um CPF válido com 11 dígitos.", variant: "destructive" });
      return;
    }

    setShowCpfDialog(false);
    setLoadingPlanId(pendingPlanId);

    try {
      const amount = PLAN_PRICES[pendingPlanId];
      if (!amount) throw new Error("Plano não encontrado");

      const response = await supabase.functions.invoke("s6x-create-payment", {
        body: {
          user_id: user.id,
          plan_id: pendingPlanId,
          customer_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Cliente",
          customer_document: cleanCpf,
          customer_email: user.email,
          amount,
        },
      });

      // supabase.functions.invoke returns { data, error }
      // When non-2xx, error is FunctionsHttpError but data may contain the body
      if (response.error) {
        // Try to get the actual error message from the response context
        let errorMsg = "Erro ao gerar cobrança PIX";
        try {
          const ctx = await response.error.context?.json();
          if (ctx?.error) errorMsg = ctx.error;
        } catch {
          errorMsg = response.error.message || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = response.data;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar cobrança");

      setPixData({
        qr_code_base64: data.pix.qr_code_base64,
        copy_paste: data.pix.copy_paste,
        transaction_id: data.transaction_id,
        amount: data.amount,
        expires_at: data.expires_at,
      });
      setPixPlanName(PLAN_LABELS[pendingPlanId] || "CookAI Pro");
      setPixModalOpen(true);
    } catch (error) {
      console.error("Erro ao criar pagamento S6X:", error);
      toast({
        title: "Erro ao gerar PIX",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlanId(null);
      setPendingPlanId(null);
      setCpfInput("");
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('nav.pricing')} | Cook</title>
        <meta name="description" content={t('pricing.subtitle')} />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 lg:py-16 pt-20 sm:pt-24 md:pt-28">
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 md:space-y-12">
            {/* Pricing Section Header */}
            <div className="text-center space-y-3 sm:space-y-4">
              <Badge variant="secondary" className="mb-2">
                <Sparkles className="w-3 h-3 mr-1" />
                {t('pricing.badge')}
              </Badge>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                {t('pricing.title')}
                <span className="text-gradient block">{t('pricing.titleHighlight')}</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
                {t('pricing.subtitle')}
              </p>
            </div>

            {/* Active Subscription Banner */}
            {isActive && subscription && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">
                      {t('pricing.activeSubscription')} {subscription.product_name || "Pro"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparison Banner */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">{t('pricing.comparison.title')}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-lg">
                  <span className="text-muted-foreground line-through">{t('pricing.comparison.nutritionist')}</span>
                  <span className="text-primary font-bold">
                    {t('pricing.comparison.nutriai', { price: 'R$ 0,66', plan: 'anual' })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('pricing.comparison.subtitle')}</p>
              </CardContent>
            </Card>

            {/* Pricing Cards */}
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const Icon = plan.icon;
                // Verificar se este plano específico é o plano ativo do usuário
                const isCurrentPlan = isActive && subscription && subscription.product_id === plan.id;
                const planData = plan as typeof plan & {
                  pricePerDay?: string;
                  totalPrice?: string;
                  installments?: string;
                  savings?: string;
                  originalPrice?: string;
                };

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col transition-all duration-300 ${plan.popular
                      ? "border-primary border-2 shadow-xl lg:scale-105 z-10"
                      : "border-border hover:border-primary/50"
                      }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-primary text-primary-foreground text-xs sm:text-sm font-semibold px-3 sm:px-4 py-0.5 sm:py-1">
                          {t('pricing.mostPopular')}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-2 pt-5 sm:pt-6">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl sm:rounded-2xl flex items-center justify-center ${plan.popular
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-secondary text-foreground"
                        }`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-bold">{plan.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      {/* Price */}
                      <div className="text-center mb-6">
                        {plan.id === 'free' ? (
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                          </div>
                        ) : (
                          <>
                            {planData.installments && (
                              <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                {planData.installments} <span className="text-2xl sm:text-3xl font-bold">{plan.price}</span>
                              </p>
                            )}
                            {!planData.installments && (
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                                {plan.period && (
                                  <span className="text-muted-foreground text-base sm:text-lg">{plan.period}</span>
                                )}
                              </div>
                            )}
                            {planData.totalPrice && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Total: <span className="font-semibold">{planData.totalPrice}</span>
                              </p>
                            )}
                            {planData.pricePerDay && (
                              <p className="text-xs text-primary font-medium mt-2">
                                {planData.pricePerDay} por dia
                              </p>
                            )}
                            {planData.savings && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {planData.savings}
                              </Badge>
                            )}
                            {planData.originalPrice && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="line-through">{planData.originalPrice}</span>
                                {" → "}
                                <span className="text-primary font-semibold">{planData.totalPrice}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-6 flex-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                        {(plan.limitations || []).map((limitation, index) => (
                          <li key={index} className="flex items-start gap-2 text-muted-foreground">
                            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">−</span>
                            <span className="text-sm">{limitation}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      {isCurrentPlan ? (
                        <Button variant="outline" disabled className="w-full">
                          <Check className="w-4 h-4 mr-2" />
                          {t('pricing.currentPlan')}
                        </Button>
                      ) : (
                        <Button
                          variant={plan.popular ? "default" : "outline"}
                          size="lg"
                          className="w-full font-semibold"
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={loadingPlanId === plan.id}
                        >
                          {loadingPlanId === plan.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t('pricing.processing') || 'Processando...'}
                            </>
                          ) : (
                            plan.cta
                          )}
                        </Button>
                      )}

                      {/* Guarantee */}
                      {plan.id !== 'free' && (
                        <p className="text-xs text-center text-muted-foreground mt-3">
                          <Check className="w-3 h-3 inline mr-1 text-primary" />
                          {t('pricing.guarantee.text')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* FAQ Section */}
            <div className="text-center space-y-4 pt-8">
              <h2 className="text-xl md:text-2xl font-bold">{t('pricing.hasQuestions')}</h2>
              <p className="text-muted-foreground">
                {t('pricing.checkFaq')}{" "}
                <Link to="/faq" className="text-primary hover:underline">
                  {t('pricing.faqLink')}
                </Link>
                {" "}{t('pricing.orContact')}
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                {t('pricing.securePayment')}
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                {t('pricing.cancelAnytime')}
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                {t('pricing.ptSupport')}
              </div>
            </div>
          </div>
        </main>

        <Footer />
        <MobileBottomNav />
      </div>

      {/* PIX QR Code Modal */}
      <PixQrCodeModal
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        pixData={pixData}
        planName={pixPlanName}
      />

      {/* CPF Dialog */}
      {showCpfDialog && (
        <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowCpfDialog(false); setPendingPlanId(null); }} />
          <div className="relative w-full max-w-[400px] bg-[#131514] md:rounded-[28px] rounded-t-[28px] border-t border-x border-[#2a2a2a] md:border p-6 pb-10 md:pb-6 animate-fade-up z-10">
            <div className="w-12 h-1 bg-[#333] rounded-full mx-auto mb-6 md:hidden" />
            <h3 className="text-lg font-bold text-white text-center mb-2">Informe seu CPF</h3>
            <p className="text-sm text-[#888] text-center mb-5">Necessário para gerar o pagamento PIX</p>
            <Input
              placeholder="000.000.000-00"
              value={cpfInput}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                const formatted = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
                setCpfInput(formatted);
              }}
              className="w-full h-[52px] bg-transparent border-[#333] rounded-full px-6 text-center text-lg font-mono text-white placeholder:text-[#555] focus-visible:ring-[#A3E635] focus-visible:border-[#A3E635] mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-full border-[#333]" onClick={() => { setShowCpfDialog(false); setPendingPlanId(null); }}>Cancelar</Button>
              <Button className="flex-1 h-12 rounded-full bg-[#A3E635] text-black font-bold hover:bg-[#bef264]" onClick={handleCpfSubmit}>Continuar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Pricing;
