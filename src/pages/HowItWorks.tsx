import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CTASection from "@/components/home/CTASection";
import { Camera, Brain, Utensils, TrendingUp, Shield, Zap } from "lucide-react";

const HowItWorks = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Camera,
      title: t('howItWorksPage.feature1Title'),
      description: t('howItWorksPage.feature1Desc'),
    },
    {
      icon: Brain,
      title: t('howItWorksPage.feature2Title'),
      description: t('howItWorksPage.feature2Desc'),
    },
    {
      icon: Utensils,
      title: t('howItWorksPage.feature3Title'),
      description: t('howItWorksPage.feature3Desc'),
    },
    {
      icon: TrendingUp,
      title: t('howItWorksPage.feature4Title'),
      description: t('howItWorksPage.feature4Desc'),
    },
    {
      icon: Shield,
      title: t('howItWorksPage.feature5Title'),
      description: t('howItWorksPage.feature5Desc'),
    },
    {
      icon: Zap,
      title: t('howItWorksPage.feature6Title'),
      description: t('howItWorksPage.feature6Desc'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block"><Header /></div>

      <main className="pt-4 md:pt-28 pb-24 md:pb-0">
        {/* Hero */}
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              {t('howItWorksPage.badge')}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('howItWorksPage.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorksPage.subtitle')}
            </p>
          </div>
        </section>

        <HowItWorksSection />

        {/* Features Grid */}
        <section className="py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-up">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                {t('howItWorksPage.featuresBadge')}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t('howItWorksPage.featuresTitle')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('howItWorksPage.featuresSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTASection />
      </main>

      <div className="hidden md:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default HowItWorks;
