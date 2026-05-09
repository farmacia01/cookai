import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isActive, subscription } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      popular: true,
      features: t('pricing.plans.annual.features', { returnObjects: true }) as string[],
      limitations: [],
      cta: t('pricing.plans.annual.cta'),
      href: "/auth",
    },
  ];

  const handleSubscribe = (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      navigate('/gerar-receitas');
      return;
    }

    toast({
      title: "Pagamento indisponível",
      description: "A API de pagamento foi removida deste app.",
      variant: "destructive",
    });
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
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                        >
                          {plan.cta}
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
    </>
  );
};

export default Pricing;
