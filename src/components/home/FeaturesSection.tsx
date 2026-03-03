import { useTranslation } from "react-i18next";
import { Camera, Target, ShoppingCart, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Camera,
      title: t('featuresSection.feature1.title'),
      description: t('featuresSection.feature1.description'),
    },
    {
      icon: Target,
      title: t('featuresSection.feature2.title'),
      description: t('featuresSection.feature2.description'),
    },
    {
      icon: ShoppingCart,
      title: t('featuresSection.feature3.title'),
      description: t('featuresSection.feature3.description'),
    },
    {
      icon: TrendingUp,
      title: t('featuresSection.feature4.title'),
      description: t('featuresSection.feature4.description'),
    },
    {
      icon: BarChart3,
      title: t('featuresSection.feature6.title'),
      description: t('featuresSection.feature6.description'),
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16 animate-fade-up">
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t('featuresSection.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {t('featuresSection.title')}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            {t('featuresSection.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

