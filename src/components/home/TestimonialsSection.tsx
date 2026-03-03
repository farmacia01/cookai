import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Quote, Instagram } from "lucide-react";

interface Testimonial {
  image: string;
  name: string;
  username: string;
  text: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    name: "Marina Costa",
    username: "@marinafitness",
    text: "Eu jogava tanta comida fora toda semana... Agora uso tudo e ainda como melhor. O modo Faxina salvou minha vida!",
    role: "Personal Trainer",
  },
  {
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Lucas Ferreira",
    username: "@lucasferreira_fit",
    text: "O Modo Monstro é absurdo. Consigo bater meus macros todo dia sem ficar horas pensando no que cozinhar.",
    role: "Atleta de Crossfit",
  },
  {
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    name: "Ana Beatriz",
    username: "@anabea_wellness",
    text: "Perdi 8kg em 3 meses com o Seca Barriga. As receitas são gostosas demais, nem parece dieta!",
    role: "Influenciadora Fitness",
  },
  {
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    name: "Pedro Henrique",
    username: "@pedronutri",
    text: "Indico pra todos os meus alunos. A IA acerta demais nos macros e as receitas são práticas de fazer.",
    role: "Nutricionista Esportivo",
  },
  {
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    name: "Camila Santos",
    username: "@camilasantos",
    text: "Meus seguidores amam as receitas que posto! E o melhor: gero todas em segundos com uma foto da geladeira.",
    role: "Creator de Conteúdo",
  },
  {
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    name: "Rafael Oliveira",
    username: "@rafaeloliveirafit",
    text: "Ganho tempo, como bem e ainda economizo. Antes eu pedia delivery todo dia, agora cozinho em 20 min.",
    role: "Empresário",
  },
];

const TestimonialsSection = () => {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const maxDisplayed = 3;

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16 animate-fade-up">
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t('testimonialsSection.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {t('testimonialsSection.title')}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            {t('testimonialsSection.subtitle')}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="relative">
          <div
            className={cn(
              "grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
              !showAll && testimonials.length > maxDisplayed && "max-h-[480px] lg:max-h-none overflow-hidden"
            )}
          >
            {testimonials
              .slice(0, showAll ? undefined : maxDisplayed)
              .map((testimonial, index) => (
                <Card
                  key={index}
                  className="p-4 sm:p-6 bg-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg animate-fade-up relative"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Quote Icon */}
                  <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-primary/20 absolute top-3 right-3 sm:top-4 sm:right-4" />

                  {/* Content */}
                  <p className="text-sm sm:text-base text-foreground leading-relaxed mb-4 sm:mb-6 relative z-10">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground truncate">{testimonial.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{testimonial.role}</p>
                    </div>
                    <a
                      href={`https://instagram.com/${testimonial.username.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    >
                      <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  </div>
                </Card>
              ))}

            {/* Hidden cards for desktop */}
            {!showAll &&
              testimonials.slice(maxDisplayed).map((testimonial, index) => (
                <Card
                  key={`hidden-${index}`}
                  className="p-6 bg-card border-border hidden lg:block animate-fade-up relative"
                  style={{ animationDelay: `${(index + maxDisplayed) * 0.1}s` }}
                >
                  <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                  <p className="text-foreground leading-relaxed mb-6 relative z-10">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                    <a
                      href={`https://instagram.com/${testimonial.username.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  </div>
                </Card>
              ))}
          </div>

          {/* Load More - Mobile only */}
          {testimonials.length > maxDisplayed && !showAll && (
            <div className="lg:hidden">
              <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-secondary/30 to-transparent" />
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={() => setShowAll(true)}>
                  {t('testimonialsSection.loadMore')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
