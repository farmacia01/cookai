import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SalesPage from "./pages/SalesPage";
import GenerateRecipes from "./pages/GenerateRecipes";
import HowItWorks from "./pages/HowItWorks";
import Auth from "./pages/Auth";
import MyRecipes from "./pages/MyRecipes";
import FAQ from "./pages/FAQ";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import Affiliates from "./pages/Affiliates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/paginadevendas" element={<SalesPage />} />
              <Route path="/gerar-receitas" element={<GenerateRecipes />} />
              <Route path="/como-funciona" element={<HowItWorks />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/minhas-receitas" element={<MyRecipes />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/precos" element={<Pricing />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/afiliado" element={<Affiliates />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;