import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ClientesPage from "@/pages/Clientes";
import ProdutosPage from "@/pages/Produtos";
import PDVPage from "@/pages/PDV";
import LocacoesPage from "@/pages/Locacoes";
import OrcamentosPage from "@/pages/Orcamentos";
import DespesasPage from "@/pages/Despesas";
import CalculadoraPage from "@/pages/Calculadora";
import ItensLocacaoPage from "@/pages/ItensLocacao";
import FluxoDeCaixaPage from "@/pages/FluxoDeCaixa";
import FiadoPage from "@/pages/Fiado";
import AgendaPage from "@/pages/Agenda";
import EncomendasPage from "@/pages/Encomendas";
import ServicosPage from "@/pages/Servicos";
import RelatoriosPage from "@/pages/Relatorios";
import ConfiguracoesPage from "@/pages/Configuracoes";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "./pages/NotFound.tsx";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModulosProvider } from "@/contexts/ModulosContext";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

import { AccessDenied } from "@/components/AccessDenied";

const ProtectedRoute = ({ children, requireRole, requirePermission }: { children: React.ReactNode, requireRole?: 'admin' | 'gerente', requirePermission?: string }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  const hasRole = !requireRole || 
                  (requireRole === 'admin' && user.role === 'admin') || 
                  (requireRole === 'gerente' && ['admin', 'gerente'].includes(user.role));
                  
  const userPerms = user.permissoes || [];
  const isMaster = user.role === 'admin' || userPerms.includes('*');
  const hasPerm = !requirePermission || isMaster || userPerms.includes(requirePermission);

  if (!hasRole || !hasPerm) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<ProtectedRoute requirePermission="dashboard_view"><Dashboard /></ProtectedRoute>} />
              <Route path="/pdv" element={<ProtectedRoute requirePermission="vendas_view"><PDVPage /></ProtectedRoute>} />
              <Route path="/locacoes" element={<ProtectedRoute requirePermission="locacoes_view"><LocacoesPage /></ProtectedRoute>} />
              <Route path="/orcamentos" element={<ProtectedRoute requirePermission="vendas_view"><OrcamentosPage /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute requireRole="gerente"><RelatoriosPage /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute requirePermission="clientes_view"><ClientesPage /></ProtectedRoute>} />
              <Route path="/produtos" element={<ProtectedRoute requirePermission="vendas_view"><ProdutosPage /></ProtectedRoute>} />
              <Route path="/itens-locacao" element={<ProtectedRoute requirePermission="locacoes_view"><ItensLocacaoPage /></ProtectedRoute>} />
              <Route path="/calculadora" element={<ProtectedRoute requirePermission="vendas_view"><CalculadoraPage /></ProtectedRoute>} />
              <Route path="/despesas" element={<ProtectedRoute requirePermission="despesas_view"><DespesasPage /></ProtectedRoute>} />
              <Route path="/fluxo" element={<ProtectedRoute requirePermission="despesas_view"><FluxoDeCaixaPage /></ProtectedRoute>} />
              <Route path="/fiado" element={<ProtectedRoute requirePermission="vendas_view"><FiadoPage /></ProtectedRoute>} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/encomendas" element={<ProtectedRoute requirePermission="encomendas_view"><EncomendasPage /></ProtectedRoute>} />
              <Route path="/servicos" element={<ProtectedRoute requirePermission="vendas_view"><ServicosPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute requireRole="admin"><ConfiguracoesPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ModulosProvider>
            <AppRoutes />
          </ModulosProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
