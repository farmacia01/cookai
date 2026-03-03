import { useTranslation } from "react-i18next";
import { Trash2, Dumbbell, Flame } from "lucide-react";

const ModesSection = () => {
  const { t } = useTranslation();

  const modes = [
    {
      id: "faxina",
      icon: Trash2,
      emoji: "🧹",
      title: t('modesSection.faxina.title'),
      subtitle: t('modesSection.faxina.subtitle'),
      description: t('modesSection.faxina.description'),
      color: "mode-faxina",
      bgClass: "bg-mode-faxina/10",
      borderClass: "border-mode-faxina/20",
    },
    {
      id: "monstro",
      icon: Dumbbell,
      emoji: "💪",
      title: t('modesSection.monstro.title'),
      subtitle: t('modesSection.monstro.subtitle'),
      description: t('modesSection.monstro.description'),
      color: "mode-monstro",
      bgClass: "bg-mode-monstro/10",
      borderClass: "border-mode-monstro/20",
    },
    {
      id: "seca",
      icon: Flame,
      emoji: "🔥",
      title: t('modesSection.seca.title'),
      subtitle: t('modesSection.seca.subtitle'),
      description: t('modesSection.seca.description'),
      color: "mode-seca",
      bgClass: "bg-mode-seca/10",
      borderClass: "border-mode-seca/20",
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16 animate-fade-up">
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t('modesSection.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {t('modesSection.title')}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            {t('modesSection.subtitle')}
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {modes.map((mode, index) => (
            <div
              key={mode.id}
              className="group relative bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg animate-fade-up cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl ${mode.bgClass} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl sm:text-3xl">{mode.emoji}</span>
              </div>

              {/* Content */}
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                {mode.title}
              </h3>
              <p className="text-xs sm:text-sm text-primary font-medium mb-2">{mode.subtitle}</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {mode.description}
              </p>

              {/* Hover Effect Line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-${mode.color} rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModesSection;
