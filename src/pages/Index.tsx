import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Bell, Shield, Settings } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import NotificationSettings from "@/components/NotificationSettings";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hidden md:block"><Header /></div>
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-20 md:pt-32 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="animate-fade-up">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
              Bem-vindo ao Cook AI 🍳
            </h1>
            <p className="text-lg text-muted-foreground">
              Sua central de controle para nutrição e manutenção.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notifications Block */}
            <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <NotificationSettings />
            </div>

            {/* Quick Actions / Info Card */}
            <div className="space-y-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="card-dark p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Status do Sistema</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Notificações Push</span>
                    <span className="text-emerald-400 font-medium">Ativo</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sincronização Cron</span>
                    <span className="text-emerald-400 font-medium">Diária (09:00 BRT)</span>
                  </div>
                </div>
              </div>

              <div className="card-dark p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ações Rápidas</h3>
                </div>
                <button 
                  onClick={() => navigate("/gerar-receitas")}
                  className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Ir para Gerar Receitas
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="hidden md:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default Index;
