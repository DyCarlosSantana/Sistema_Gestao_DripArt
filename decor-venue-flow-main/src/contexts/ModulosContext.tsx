/**
 * ModulosContext.tsx — Contexto global de módulos e permissões do Dycore
 * =========================================================================
 * Carrega os módulos ativos do tenant e o role do usuário logado,
 * disponibilizando-os para toda a aplicação via hook useModulos().
 *
 * Uso:
 *   const { modulos, role, hasModulo, isAdmin } = useModulos();
 *   if (!hasModulo('locacoes')) return null;
 */

import React, { createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ModulosContextType {
  hasModulo: (modulo: string) => boolean;
  isAdmin: boolean;
  isGerente: boolean;
  loading: boolean;
}

const ModulosContext = createContext<ModulosContextType>({
  hasModulo: () => true,
  isAdmin: false,
  isGerente: false,
  loading: false,
});

export function ModulosProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  const { data: tenantModulos, isLoading } = useQuery({
    queryKey: ['modulos'],
    queryFn: api.modulos,
    enabled: isAuthenticated,
  });

  const hasMap: any = {
    "dashboard": "dashboard_view",
    "pdv": "vendas_view",
    "orcamentos": "vendas_view",
    "calculadora": "vendas_view",
    "locacoes": "locacoes_view",
    "itens_locacao": "locacoes_view",
    "clientes": "clientes_view",
    "produtos": "vendas_view",
    "despesas": "despesas_view",
    "fluxo_caixa": "despesas_view",
    "fiado": "vendas_view",
    "agenda": "dashboard_view",
    "encomendas": "encomendas_view",
    "servicos": "vendas_view",
    "relatorios": "dashboard_view",
    "configuracoes": "config_view"
  };

  const hasModulo = (modulo: string) => {
    if (!user) return false;

    // 1. Check global tenant module toggle first
    if (tenantModulos) {
      // Find the module matching the slug. If it's explicitly disabled (ativo === 0), hide it.
      // Note: the hasMap keys are sometimes different from modulo names.
      // E.g. "pdv" is part of "vendas", "locacoes" is "locacoes".
      // We map the navigation id to the DB modulo name:
      let dbModulo = modulo;
      if (['pdv', 'orcamentos', 'fiado'].includes(modulo)) dbModulo = 'vendas';
      if (['itens_locacao'].includes(modulo)) dbModulo = 'locacoes';
      if (['fluxo_caixa'].includes(modulo)) dbModulo = 'despesas';

      const found = tenantModulos.find((m: any) => m.modulo === dbModulo);
      if (found && found.ativo === 0) return false;
    }

    // 2. Check RBAC permissions
    if (user.role === 'admin') return true;
    
    const requiredPermission = hasMap[modulo];
    if (!requiredPermission) return true; // fallback open if not mapped

    // If custom permissions array exists, check it
    if (user.permissoes) {
      if (user.permissoes.includes('*')) return true;
      if (user.permissoes.includes(requiredPermission)) return true;
    }

    return false;
  };

  const isAdmin = user?.role === 'admin';
  const isGerente = user?.role === 'admin' || user?.role === 'gerente';

  return (
    <ModulosContext.Provider value={{
      hasModulo,
      isAdmin,
      isGerente,
      loading: isLoading,
    }}>
      {children}
    </ModulosContext.Provider>
  );
}

export const useModulos = () => useContext(ModulosContext);
