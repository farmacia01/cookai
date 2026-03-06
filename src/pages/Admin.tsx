import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardOverview from "@/components/admin/DashboardOverview";
import UsersTable from "@/components/admin/UsersTable";
import GenerationLogs from "@/components/admin/GenerationLogs";
import AdminReferrals from "@/components/admin/AdminReferrals";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import { useState } from "react";

type AdminView = "overview" | "users" | "logs" | "referrals" | "broadcast";

const Admin = () => {
  const { isAdmin, loading, user } = useAdmin();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AdminView>("overview");

  useEffect(() => {
    if (!loading && !user) {
      console.log("[Admin] No user, redirecting to auth");
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      console.log("[Admin] User is not admin, redirecting to home", { userId: user.id, isAdmin });
      navigate("/");
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            Você não tem permissão para acessar esta página. Apenas administradores podem acessar o painel admin.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 break-all">
            User ID: {user.id}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-full sm:w-auto"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Cook</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex">
        <AdminSidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pt-20 md:pt-6 overflow-auto">
          <div className="max-w-7xl mx-auto w-full">
            {activeView === "overview" && <DashboardOverview />}
            {activeView === "users" && <UsersTable />}
            {activeView === "logs" && <GenerationLogs />}
            {activeView === "referrals" && <AdminReferrals />}
            {activeView === "broadcast" && <AdminBroadcast />}
          </div>
        </main>
      </div>
    </>
  );
};

export default Admin;