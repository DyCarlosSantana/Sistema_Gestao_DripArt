import sys

file_path = r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
"""import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";""",
"""import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";""")

# 2. Add dreQ and welcome states
old_queries = """  const evoQ = useQuery({
    queryKey: ["dashboard-evolucao"],
    queryFn: api.dashboardEvolucao,
    refetchInterval: 60_000,
  });

  const d = dashQ.data;
  const evolucao = evoQ.data || [];"""

new_queries = """  const evoQ = useQuery({
    queryKey: ["dashboard-evolucao"],
    queryFn: api.dashboardEvolucao,
    refetchInterval: 60_000,
  });
  
  const dreQ = useQuery({
    queryKey: ["dashboard-dre"],
    queryFn: api.dre,
    refetchInterval: 300_000,
  });

  const d = dashQ.data;
  const evolucao = evoQ.data || [];
  const dre = dreQ.data || [];

  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("welcome_shown") && d) {
      if ((d.alertas_locacao && d.alertas_locacao.length > 0) || (d.locacoes_atrasadas && d.locacoes_atrasadas > 0) || (d.encomendas_atrasadas && d.encomendas_atrasadas > 0)) {
        setShowWelcome(true);
      }
      sessionStorage.setItem("welcome_shown", "true");
    }
  }, [d]);"""

content = content.replace(old_queries, new_queries)

# 3. Add DRE component
old_ultimas = """      <motion.div custom={11} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Últimas Movimentações
            </h3>"""

new_dre = """      <motion.div custom={11} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">
              DRE Mês-a-Mês (Demonstrativo de Resultados)
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Receitas vs Despesas e Lucro
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dre} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 12%, 91%)" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(220, 8%, 50%)" }} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(220, 8%, 50%)" }} />
              <Tooltip 
                 formatter={(v: number) => brl(v)}
                 contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 12%, 91%)", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(328, 85%, 56%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(185, 75%, 48%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro Líquido" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div custom={12} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Últimas Movimentações
            </h3>"""

content = content.replace(old_ultimas, new_dre)

# 4. Add Dialog
new_dialog = """    </div>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resumo de Pendências 🔔</DialogTitle>
            <DialogDescription>Bem-vindo de volta! Aqui estão os alertas prioritários:</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {(d?.alertas_locacao?.length || 0) > 0 && (
              <div className="flex flex-col gap-1 rounded-lg border border-warning/20 bg-warning-light/30 p-3">
                <span className="text-sm font-semibold text-warning-foreground">Locações Atrasadas</span>
                <span className="text-xs text-muted-foreground">Você possui {d?.locacoes_atrasadas} locação(ões) em atraso e {d?.locacoes_vencendo} vencendo em breve!</span>
              </div>
            )}
            {(d?.encomendas_atrasadas || 0) > 0 && (
              <div className="flex flex-col gap-1 rounded-lg border border-coral/20 bg-coral-light/30 p-3">
                <span className="text-sm font-semibold text-coral-foreground">Encomendas Atrasadas</span>
                <span className="text-xs text-muted-foreground">Você possui {d?.encomendas_atrasadas} encomenda(s) aguardando finalização fora do prazo estipulado!</span>
              </div>
            )}
            {!(d?.alertas_locacao?.length) && !(d?.encomendas_atrasadas) && (
              <div className="text-sm text-success">
                Tudo em dia! Nenhuma pendência urgente detectada.
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowWelcome(false)}>Entendi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}"""

content = content.replace("    </div>\n  );\n}", new_dialog)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Dashboard.tsx updated.")
