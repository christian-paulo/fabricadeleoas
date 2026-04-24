import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import PlanoProtocolo from "./pages/PlanoProtocolo";
import TreinoDetalhe from "./pages/TreinoDetalhe";
import Evolucao from "./pages/Evolucao";
import Perfil from "./pages/Perfil";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import TreinoClassicoDetalhe from "./pages/TreinoClassicoDetalhe";
import AdminLogin from "./pages/AdminLogin";
import Feed from "./pages/Feed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <OnboardingProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/onboarding/:step" element={<Onboarding />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/treinos" element={<PlanoProtocolo />} />
                <Route path="/treinos/detalhe" element={<TreinoDetalhe />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/evolucao" element={<Evolucao />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/treinos-classicos/:category/:muscleGroup" element={<TreinoClassicoDetalhe />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </OnboardingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
