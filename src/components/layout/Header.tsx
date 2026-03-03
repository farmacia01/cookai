import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, Menu, X, LogOut, User, BookOpen, TrendingUp, Settings, CreditCard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/40 shadow-[0_1px_32px_rgba(0,0,0,0.2)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl gradient-hero flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <ChefHat className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">
              Cook <span className="text-gradient">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/gerar-receitas"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t('nav.generateRecipes')}
            </Link>
            {user && (
              <Link
                to="/minhas-receitas"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {t('nav.myRecipes')}
              </Link>
            )}
            <Link
              to="/como-funciona"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              to="/precos"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t('nav.pricing')}
            </Link>
            <Link
              to="/faq"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t('nav.faq')}
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <User className="w-4 h-4" />
                    {t('nav.myAccount')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/perfil" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('nav.myProfile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {t('nav.dashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/minhas-receitas" className="cursor-pointer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      {t('nav.myRecipes')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/precos" className="cursor-pointer">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('nav.myPlan')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">{t('nav.login')}</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default">{t('nav.startFree')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-foreground font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/gerar-receitas"
                className="text-foreground font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.generateRecipes')}
              </Link>
              {user && (
                <Link
                  to="/minhas-receitas"
                  className="text-foreground font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.myRecipes')}
                </Link>
              )}
              <Link
                to="/como-funciona"
                className="text-foreground font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.howItWorks')}
              </Link>
              <Link
                to="/precos"
                className="text-foreground font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.pricing')}
              </Link>
              <Link
                to="/faq"
                className="text-foreground font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.faq')}
              </Link>
              {user && (
                <>
                  <Link
                    to="/perfil"
                    className="text-foreground font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.myProfile')}
                  </Link>
                  <Link
                    to="/dashboard"
                    className="text-foreground font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.dashboard')}
                  </Link>
                </>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between py-2">
                  <span className="text-foreground font-medium">{t('nav.theme')}</span>
                  <div className="flex items-center gap-2">
                    <LanguageSelector />
                    <ThemeToggle />
                  </div>
                </div>
                {user ? (
                  <Button variant="destructive" onClick={handleSignOut} className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.logout')}
                  </Button>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full">{t('nav.login')}</Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="default" className="w-full">{t('nav.startFree')}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
