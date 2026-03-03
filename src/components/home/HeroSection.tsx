import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Camera, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center pt-20 md:pt-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-4 md:right-10 w-48 h-48 md:w-72 md:h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-4 md:left-10 w-64 h-64 md:w-96 md:h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 md:space-y-8 animate-fade-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-secondary border border-border">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              <span className="text-xs md:text-sm font-medium text-secondary-foreground">
                {t('hero.badge')}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
              {t('hero.title1')}
              <span className="text-gradient block">{t('hero.title2')}</span>
              {t('hero.title3')}
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/gerar-receitas">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <Camera className="w-5 h-5" />
                  {t('hero.cta1')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/como-funciona">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  {t('hero.cta2')}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 md:gap-8 pt-4">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">10k+</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('hero.stats.recipes')}</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">15s</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('hero.stats.time')}</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">R$0</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('hero.stats.price')}</p>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative animate-fade-up mt-8 lg:mt-0" style={{ animationDelay: '0.2s' }}>
            <div className="relative z-10">
              {/* Main Card */}
              <div className="bg-card rounded-2xl md:rounded-3xl shadow-lg p-4 md:p-6 border border-border">
                <div className="aspect-[4/3] rounded-xl md:rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
                  <div className="text-center p-4 md:p-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-xl md:rounded-2xl gradient-hero flex items-center justify-center shadow-glow animate-pulse-glow">
                      <Utensils className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
                    </div>
                    <p className="text-base md:text-lg font-semibold text-foreground mb-2">
                      {t('hero.nextRecipe')}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {t('hero.dragPhoto')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="hidden sm:block absolute -top-2 -right-2 md:-top-4 md:-right-4 bg-card rounded-xl md:rounded-2xl shadow-md p-2 md:p-3 lg:p-4 border border-border animate-float">
                <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-lg md:rounded-xl bg-mode-faxina/10 flex items-center justify-center">
                    <span className="text-xs md:text-sm lg:text-lg">🧹</span>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs lg:text-sm font-semibold text-foreground">{t('modes.faxina.title')}</p>
                    <p className="text-[9px] md:text-xs text-muted-foreground">{t('modes.faxina.subtitle')}</p>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block absolute -bottom-2 -left-2 md:-bottom-4 md:-left-4 bg-card rounded-xl md:rounded-2xl shadow-md p-2 md:p-3 lg:p-4 border border-border animate-float" style={{ animationDelay: '-2s' }}>
                <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-lg md:rounded-xl bg-mode-monstro/10 flex items-center justify-center">
                    <span className="text-xs md:text-sm lg:text-lg">💪</span>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs lg:text-sm font-semibold text-foreground">{t('modes.monstro.title')}</p>
                    <p className="text-[9px] md:text-xs text-muted-foreground">{t('modes.monstro.subtitle')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
