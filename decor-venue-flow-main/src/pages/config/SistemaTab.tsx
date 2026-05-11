import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Database, Download, Info, Moon, Sun, HardDrive, Shield, Cpu, Code2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function SistemaTab() {
  const { theme, toggleTheme } = useTheme();

  const backupM = useMutation({
    mutationFn: () => api.fazerBackupManual(),
    onSuccess: (res: any) => showToast.success(res.mensagem || "Backup concluído!"),
    onError: () => showToast.error("Erro ao gerar backup"),
  });

  return (
    <div className="space-y-6">
      {/* Aparência */}
      <div className="card">
        <div className="card-head" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(var(--primary), 0.1)", color: "hsl(var(--primary))" }}>
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
            <div>
              <div className="card-title" style={{ fontSize: "15px" }}>Aparência</div>
              <div style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Personalize o visual do sistema.</div>
            </div>
          </div>
        </div>
        
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface2)" }}>
            <div>
              <h4 style={{ fontWeight: 600, fontSize: "14px", color: "var(--text)" }}>Tema do Sistema</h4>
              <p style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "4px" }}>
                Atualmente: <strong>{theme === "dark" ? "Modo Escuro 🌙" : "Modo Claro ☀️"}</strong>
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={toggleTheme} style={{ display: "flex", gap: "8px" }}>
              {theme === "dark" ? (
                <><Sun className="h-4 w-4" /> Modo Claro</>
              ) : (
                <><Moon className="h-4 w-4" /> Modo Escuro</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Manutenção */}
      <div className="card">
        <div className="card-head" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(210, 100%, 50%, 0.1)", color: "hsl(210, 100%, 50%)" }}>
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: "15px" }}>Manutenção & Segurança</div>
              <div style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Backup e exportação de dados.</div>
            </div>
          </div>
        </div>
        
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Database className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
              <div>
                <h4 style={{ fontWeight: 600, fontSize: "14px", color: "var(--text)" }}>Backup Manual</h4>
                <p style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Gera um snapshot imediato do banco de dados.</p>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => backupM.mutate()} disabled={backupM.isPending}>
              {backupM.isPending ? "Processando..." : "Gerar Backup"}
            </button>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px dashed var(--border)", borderRadius: "12px", background: "var(--surface2)", opacity: 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Download className="h-5 w-5" style={{ color: "var(--text-sec)" }} />
              <div>
                <h4 style={{ fontWeight: 600, fontSize: "14px", color: "var(--text)" }}>Exportar para Excel</h4>
                <p style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Baixar registros (Vendas, Locações, Clientes).</p>
              </div>
            </div>
            <span className="role-tag" style={{ background: "var(--surface3)", borderColor: "var(--border)", color: "var(--text-sec)" }}>Em breve</span>
          </div>
        </div>
      </div>

      {/* Info do sistema */}
      <div className="card">
        <div className="card-head" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(145, 63%, 49%, 0.1)", color: "hsl(145, 63%, 49%)" }}>
              <Info className="h-4 w-4" />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: "15px" }}>Informações do Sistema</div>
              <div style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Detalhes técnicos da sua instalação.</div>
            </div>
          </div>
        </div>
        
        <div style={{ padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
            {[
              { icon: Shield, label: "Versão", value: "Dycore v2.0.0 SaaS" },
              { icon: Cpu, label: "Arquitetura", value: "Multi-Tenant Isolado" },
              { icon: Database, label: "Backend", value: "Flask + SQLite/PostgreSQL" },
              { icon: Code2, label: "Frontend", value: "React + TypeScript + Vite" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface2)" }}>
                <item.icon className="h-4 w-4" style={{ color: "var(--text-sec)", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", color: "var(--text-sec)", letterSpacing: "0.05em" }}>{item.label}</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
