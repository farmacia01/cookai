import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Dumbbell, UtensilsCrossed, User, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";

const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const prevPathRef = useRef(location.pathname);
  const [fading, setFading] = useState(false);

  const navigate = useNavigate();

  const leftItems = [
    { icon: Home, label: t("mobileNav.home", "Início"), path: "/" },
    { icon: UtensilsCrossed, label: "Receitas", path: "/minhas-receitas" },
  ];
  const rightItems = [
    { icon: Dumbbell, label: t("mobileNav.dashboard", "Nutrição"), path: "/dashboard" },
    { icon: User, label: user ? t("mobileNav.profile", "Perfil") : t("mobileNav.login", "Entrar"), path: user ? "/perfil" : "/auth" },
  ];

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setFading(true);
      setTimeout(() => setFading(false), 350);
    }
  }, [location.pathname]);

  const NavItem = ({ icon: Icon, label, path }: { icon: React.ElementType; label: string; path: string }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1.5 transition-all duration-300 ${fading ? "opacity-70" : "opacity-100"
          }`}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${isActive ? "bg-[#A3E635]/15 scale-105" : ""
            }`}
        >
          <Icon
            className={`w-5 h-5 transition-all duration-200 ${isActive ? "text-[#A3E635] stroke-[2.3px]" : "text-[#666] stroke-[1.5px]"
              }`}
          />
        </div>
        <span
          className={`text-[10px] leading-none font-medium transition-all duration-200 ${isActive ? "text-[#A3E635]" : "text-[#555]"
            }`}
        >
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass-nav">
        <div
          className="flex items-center justify-around px-3 pt-1"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          {/* Left 2 items */}
          {leftItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}

          {/* FAB center button */}
          <div className="relative flex flex-col items-center" style={{ marginTop: "-24px" }}>
            <button
              className="fab-btn"
              onClick={() => {
                if ("vibrate" in navigator) navigator.vibrate(15);
                navigate("/gerar-receitas");
              }}
            >
              <Plus className="w-7 h-7 text-[#0D0D0D] stroke-[2.5px]" />
            </button>
            <span className="text-[10px] text-[#555] font-medium mt-0.5">Gerar</span>
          </div>

          {/* Right 2 items */}
          {rightItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
