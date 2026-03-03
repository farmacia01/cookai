import { useTranslation } from "react-i18next";
import { Camera, Cpu, ChefHat, Heart } from "lucide-react";

const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: Camera,
      step: "01",
      title: t('howItWorksSection.step1Title'),
      description: t('howItWorksSection.step1Desc'),
    },
    {
      icon: Cpu,
      step: "02",
      title: t('howItWorksSection.step2Title'),
      description: t('howItWorksSection.step2Desc'),
    },
    {
      icon: ChefHat,
      step: "03",
      title: t('howItWorksSection.step3Title'),
      description: t('howItWorksSection.step3Desc'),
    },
    {
      icon: Heart,
      step: "04",
      title: t('howItWorksSection.step4Title'),
      description: t('howItWorksSection.step4Desc'),
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16 animate-fade-up">
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t('howItWorksSection.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {t('howItWorksSection.title')}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            {t('howItWorksSection.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 sm:top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
              )}

              <div className="relative z-10 text-center">
                {/* Icon */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6">
                  <div className="absolute inset-0 gradient-hero rounded-xl sm:rounded-2xl opacity-10" />
                  <div className="absolute inset-2 bg-card rounded-lg sm:rounded-xl flex items-center justify-center border border-border shadow-sm">
                    <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 gradient-hero rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-foreground shadow-md">
                    {step.step}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
