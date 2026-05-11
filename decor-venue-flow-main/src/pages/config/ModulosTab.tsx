import { Switch } from "@/components/ui/switch";
import { ShoppingCart, Package, ClipboardList, Box, Receipt, Calendar, Calculator, Wrench, LayoutGrid } from "lucide-react";

const MODULOS = [
  { modulo: "vendas", label: "Vendas & PDV", desc: "Caixa, orçamentos e pedidos.", icon: ShoppingCart },
  { modulo: "locacoes", label: "Locações", desc: "Gestão de inventário para aluguel e kits.", icon: Package },
  { modulo: "encomendas", label: "Encomendas", desc: "Controle de produção e prazos.", icon: ClipboardList },
  { modulo: "produtos", label: "Estoque", desc: "Catálogo e controle de quantidades.", icon: Box },
  { modulo: "despesas", label: "Financeiro", desc: "Controle de custos e contas.", icon: Receipt },
  { modulo: "agenda", label: "Agenda", desc: "Calendário de compromissos.", icon: Calendar },
  { modulo: "calculadora", label: "Calculadora", desc: "Cálculos de impressão e materiais.", icon: Calculator },
  { modulo: "servicos", label: "Serviços", desc: "Catálogo de serviços oferecidos.", icon: Wrench },
];

export default function ModulosTab({ modulos, onToggle }: { modulos: any[]; onToggle: (m: string, a: boolean) => void }) {
  const getAtivo = (slug: string) => {
    const found = modulos.find((m: any) => m.modulo === slug);
    return found ? found.ativo === 1 : true; // default is ON for new modules
  };

  const ativosCount = MODULOS.filter(m => getAtivo(m.modulo)).length;

  return (
    <div className="space-y-4">
      <div className="card" style={{ border: "none", background: "transparent" }}>
        <div className="card-head" style={{ padding: "0 0 16px 0", borderBottom: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="card-title" style={{ fontSize: "16px" }}>Módulos do Sistema</div>
          </div>
          <span className="role-card-badge" style={{ background: "hsla(var(--primary), 0.12)", color: "hsl(var(--primary))" }}>
            {ativosCount}/{MODULOS.length} ativos
          </span>
        </div>
        
        <div className="modules-grid">
          {MODULOS.map((m) => {
            const ativo = getAtivo(m.modulo);
            return (
              <div
                key={m.modulo}
                className={`module-card ${ativo ? "active" : ""}`}
                style={{ 
                  borderColor: ativo ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border) / 0.5)",
                  background: ativo ? "hsl(var(--primary) / 0.05)" : "hsl(var(--surface2))",
                  opacity: ativo ? 1 : 0.7,
                  transition: "all 0.3s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div className="module-icon" style={{ 
                    background: ativo ? "hsl(var(--primary) / 0.1)" : "hsl(var(--surface3))",
                    color: ativo ? "hsl(var(--primary))" : "hsl(var(--text-sec))"
                  }}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <Switch checked={ativo} onCheckedChange={(checked) => onToggle(m.modulo, checked)} />
                </div>
                <div className="module-info">
                  <div className="module-name" style={{ color: ativo ? "hsl(var(--primary))" : "hsl(var(--text))" }}>{m.label}</div>
                  <div className="module-desc">{m.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
