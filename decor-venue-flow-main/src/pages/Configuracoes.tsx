import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Building2, Users, Shield, LayoutGrid, Wallet, Settings, Bell, Zap } from "lucide-react";
import EmpresaTab from "@/pages/config/EmpresaTab";
import UsuariosTab from "@/pages/config/UsuariosTab";
import CargosTab from "@/pages/config/CargosTab";
import ModulosTab from "@/pages/config/ModulosTab";
import FinanceiroTab from "@/pages/config/FinanceiroTab";
import SistemaTab from "@/pages/config/SistemaTab";
import NotificacoesTab from "@/pages/config/NotificacoesTab";
import IntegracoesTab from "@/pages/config/IntegracoesTab";

export default function ConfiguracoesPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("empresa");

  const configQ = useQuery({ queryKey: ["configuracoes"], queryFn: api.configuracoes });
  const usuariosQ = useQuery({ queryKey: ["usuarios"], queryFn: api.usuarios });
  const cargosQ = useQuery({ queryKey: ["cargos"], queryFn: api.cargos });
  const modulosQ = useQuery({ queryKey: ["modulos"], queryFn: api.modulos });

  const saveConfigM = useMutation({
    mutationFn: (data: any) => api.salvarConfiguracoes(data),
    onSuccess: () => { showToast.success("Configurações salvas!"); qc.invalidateQueries({ queryKey: ["configuracoes"] }); },
    onError: () => showToast.error("Erro ao salvar configurações"),
  });

  const toggleModuloM = useMutation({
    mutationFn: ({ modulo, ativo }: { modulo: string; ativo: boolean }) => api.toggleModulo(modulo, ativo),
    onSuccess: () => { showToast.success("Módulo atualizado!"); qc.invalidateQueries({ queryKey: ["modulos"] }); },
    onError: () => showToast.error("Erro ao atualizar módulo"),
  });

  const tabs = [
    { value: "empresa", label: "Empresa", icon: Building2 },
    { value: "usuarios", label: "Usuários", icon: Users, badge: usuariosQ.data?.length },
    { value: "cargos", label: "Cargos & Permissões", icon: Shield },
    { value: "modulos", label: "Módulos", icon: LayoutGrid },
    { value: "financeiro", label: "Financeiro", icon: Wallet },
    { value: "notificacoes", label: "Notificações", icon: Bell, badgeText: "Novo", badgeColor: "hsla(var(--success), 0.12)", badgeTextColor: "hsl(var(--success))" },
    { value: "integracoes", label: "Integrações", icon: Zap, badgeText: "Novo", badgeColor: "hsla(var(--success), 0.12)", badgeTextColor: "hsl(var(--success))" },
    { value: "sistema", label: "Sistema", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── SETTINGS HEADER ── */}
      <div className="settings-header">
        <div className="settings-title">
          <Settings className="h-5 w-5 text-primary" />
          Configurações do Sistema
        </div>
        <div className="settings-subtitle">
          Gerencie sua empresa, usuários, módulos e preferências.
        </div>
        
        {/* ── TABS ── */}
        <div className="tabs">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`tab ${activeTab === t.value ? "active" : ""}`}
            >
              <t.icon />
              {t.label}
              {!!t.badge && (
                <span className="tab-badge">{t.badge}</span>
              )}
              {!!t.badgeText && (
                <span className="tab-badge" style={{ background: t.badgeColor, color: t.badgeTextColor }}>
                  {t.badgeText}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="tab-panels">
        {activeTab === "empresa" && <EmpresaTab config={configQ.data || {}} onSave={(d: any) => saveConfigM.mutate(d)} isLoading={saveConfigM.isPending} />}
        {activeTab === "usuarios" && <UsuariosTab usuarios={usuariosQ.data || []} cargos={cargosQ.data || []} />}
        {activeTab === "cargos" && <CargosTab cargos={cargosQ.data || []} />}
        {activeTab === "modulos" && <ModulosTab modulos={modulosQ.data || []} onToggle={(m, a) => toggleModuloM.mutate({ modulo: m, ativo: a })} />}
        {activeTab === "financeiro" && <FinanceiroTab />}
        {activeTab === "notificacoes" && <NotificacoesTab />}
        {activeTab === "integracoes" && <IntegracoesTab />}
        {activeTab === "sistema" && <SistemaTab />}
      </div>
    </div>
  );
}
