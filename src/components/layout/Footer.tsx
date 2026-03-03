import { Link, useLocation } from "react-router-dom";
import { ChefHat, Instagram, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const Footer = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const getHomeLink = () => {
    if (location.pathname === '/paginadevendas') {
      return '/paginadevendas';
    }
    return '/';
  };

  return (
    <footer className="bg-foreground text-background py-10 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <Link to={getHomeLink()} className="flex items-center gap-2 mb-3 md:mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-hero flex items-center justify-center">
                <ChefHat className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <span className="text-lg md:text-xl font-bold">
                Cook <span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-background/60 max-w-sm mb-4 md:mb-6 text-sm md:text-base">
              {t('footer.description')}
            </p>
            <div className="flex gap-3 md:gap-4">
              <a
                href="https://www.instagram.com/cookai.oficial/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="Instagram Cook"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:evolinkbr@gmail.com"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="Email Cook"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/gerar-receitas" className="text-background/60 hover:text-background transition-colors">
                  {t('nav.generateRecipes')}
                </Link>
              </li>
              <li>
                <Link to="/como-funciona" className="text-background/60 hover:text-background transition-colors">
                  {t('nav.howItWorks')}
                </Link>
              </li>
              <li>
                <Link to="/precos" className="text-background/60 hover:text-background transition-colors">
                  {t('nav.pricing')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-background/60 hover:text-background transition-colors">
                  {t('footer.helpCenter')}
                </a>
              </li>
              <li>
                <a href="mailto:evolinkbr@gmail.com" className="text-background/60 hover:text-background transition-colors">
                  {t('footer.contact')}
                </a>
              </li>
              <li>
                <a href="#" className="text-background/60 hover:text-background transition-colors">
                  {t('footer.terms')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-background/40 text-sm">
          <p>{t('footer.copyright')}</p>
          <LanguageSelector variant="full" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
