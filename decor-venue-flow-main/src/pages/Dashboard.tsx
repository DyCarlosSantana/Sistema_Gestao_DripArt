import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { TimeFilter } from "@/components/TimeFilter";
import { startOfMonth, endOfMonth, format } from "date-fns";
import {
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
import { Button } from "@/components/ui/button";

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pago: "bg-success-light text-success",
    ativo: "bg-cyan-light text-cyan",
    fiado: "bg-warning-light text-warning",
    pendente: "bg-secondary text-muted-foreground",
    atrasada: "bg-coral-light text-coral",
    hoje: "bg-warning-light text-warning",
    em_breve: "bg-cyan-light text-cyan",
    devolvido: "bg-secondary text-muted-foreground",
    aberto: "bg-info-light text-info",
    aprovado: "bg-success-light text-success",
    recusado: "bg-coral-light text-coral",
    cancelado: "bg-secondary text-muted-foreground",
  };
  return map[status] || "bg-secondary text-muted-foreground";
};

export default function Dashboard() {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [dataIni, setDataIni] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const dashQ = useQuery({
    queryKey: ["dashboard", dataIni, dataFim],
    queryFn: () => api.dashboard({ data_ini: dataIni, data_fim: dataFim }),
    refetchInterval: 30_000,
  });
  const evoQ = useQuery({
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
  }, [d]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bem-vindo ao Dycore
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeFilter 
            defaultOption="este_mes"
            onFilterChange={(ini, fim) => {
              setDataIni(ini);
              setDataFim(fim);
            }} 
          />
          <div className="rounded-xl border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
            {dashQ.isLoading
              ? "Carregando…"
              : dashQ.isError
                ? "Erro ao carregar"
                : "Atualizado"}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Nova Venda", path: "/pdv", gradient: "bg-gradient-brand" },
            { label: "Novo Orçamento", path: "/orcamentos", gradient: "bg-gradient-cool" },
            { label: "Nova Locação", path: "/locacoes", gradient: "bg-gradient-warm" },
            { label: "Registrar Despesa", path: "/despesas", gradient: "bg-secondary" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => (window.location.href = a.path)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all hover:opacity-85 hover:shadow-md ${
                a.gradient === "bg-secondary"
                  ? "bg-secondary text-foreground"
                  : `${a.gradient} text-white`
              }`}
            >
              <span className="text-sm">+</span>
              {a.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Receita",
            value: brl(d?.receita_mes),
            subtitle: "no período",
            subtitleColor: "muted" as const,
            icon: DollarSign,
            gradient: "bg-gradient-brand",
          },
          {
            label: "Vendas",
            value: brl(d?.vendas_hoje_total),
            subtitle: d ? `${d.vendas_hoje_count} pedidos no período` : "—",
            subtitleColor: "muted" as const,
            icon: ShoppingBag,
            gradient: "bg-gradient-cool",
          },
          {
            label: "Locações ativas",
            value: String(d?.locacoes_ativas ?? "—"),
            subtitle: d?.locacoes_atrasadas
              ? `${d.locacoes_atrasadas} atrasada(s)`
              : d?.locacoes_vencendo
                ? `${d.locacoes_vencendo} vencendo`
                : "nenhuma vencendo",
            subtitleColor: d?.locacoes_atrasadas
              ? ("coral" as const)
              : d?.locacoes_vencendo
                ? ("warning" as const)
                : ("muted" as const),
            icon: Package,
            gradient: "bg-gradient-warm",
          },
          {
            label: "Orçamentos abertos",
            value: String(d?.orcamentos_abertos ?? "—"),
            subtitle: "aguardando resposta",
            subtitleColor: "warning" as const,
            icon: FileText,
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <MetricCard {...m} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Saldo do mês",
            value: brl(d?.saldo_mes),
            subtitle: "receita - despesas",
            subtitleColor:
              (d?.saldo_mes ?? 0) >= 0 ? ("success" as const) : ("coral" as const),
            icon: TrendingUp,
          },
          {
            label: "Saídas do mês",
            value: brl(d?.mes_saidas),
            subtitle: "despesas registradas",
            subtitleColor: "coral" as const,
            icon: TrendingDown,
          },
          {
            label: "Encomendas ativas",
            value: String(d?.encomendas_pendentes ?? "—"),
            subtitle: d?.encomendas_atrasadas
              ? `${d.encomendas_atrasadas} atrasada(s)`
              : "em andamento",
            subtitleColor: d?.encomendas_atrasadas
              ? ("coral" as const)
              : ("muted" as const),
            icon: ClipboardList,
          },
          {
            label: "Fiado em aberto",
            value: brl(d?.fiado_total_valor),
            subtitle: d ? `${d.fiado_total_count} venda(s) em aberto` : "—",
            subtitleColor: d?.fiado_total_count
              ? ("warning" as const)
              : ("muted" as const),
            icon: CreditCard,
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            custom={i + 4}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <MetricCard {...m} />
          </motion.div>
        ))}
      </div>

      {!!d?.alertas_locacao?.length && (
        <motion.div custom={8} initial="hidden" animate="visible" variants={fadeIn}>
          <div className="rounded-2xl border border-warning/20 bg-warning-light/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-display text-sm font-semibold text-foreground">
                Alertas de Locação
              </h3>
            </div>
            <div className="space-y-2">
              {d.alertas_locacao.map((a, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-subtle"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">
                      {a.cliente_nome}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      Devolução: {fmtDate(a.data_devolucao)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {brl(a.total)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge(
                        a.urgencia,
                      )}`}
                    >
                      {a.urgencia === "atrasada"
                        ? "Atrasada"
                        : a.urgencia === "hoje"
                          ? "Hoje"
                          : "Em breve"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          custom={9}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="lg:col-span-2"
        >
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Receita vs Despesas
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Últimos 6 meses
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={evolucao.map((r) => ({
                  mes: r.mes,
                  receita: r.receita,
                  despesas: r.despesa,
                }))}
              >
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(328, 85%, 56%)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(328, 85%, 56%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(185, 75%, 48%)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(185, 75%, 48%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220, 12%, 91%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(220, 12%, 91%)",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="hsl(328, 85%, 56%)"
                  fill="url(#gradReceita)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="hsl(185, 75%, 48%)"
                  fill="url(#gradDespesas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-5">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" /> Receita
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-cyan" /> Despesas
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div custom={10} initial="hidden" animate="visible" variants={fadeIn}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
            <h3 className="mb-4 font-display text-sm font-semibold text-foreground">
              Por Categoria
            </h3>
            <div className="space-y-2">
              {(d?.receita_categorias || []).slice(0, 8).map((c) => (
                <div
                  key={c.tipo}
                  className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-2"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.tipo}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {brl(c.total)}
                  </span>
                </div>
              ))}
              {!d?.receita_categorias?.length && (
                <div className="text-sm text-muted-foreground">Sem dados</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div custom={11} initial="hidden" animate="visible" variants={fadeIn}>
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
            </h3>
            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {(d?.ultimas_movimentacoes || []).slice(0, 8).map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-secondary/20 px-4 py-3 text-sm shadow-subtle"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {m.cliente_nome || "Cliente não informado"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.descricao}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {brl(m.total)}
                    </div>
                    <div
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge(
                        m.status,
                      )}`}
                    >
                      {m.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!d?.ultimas_movimentacoes?.length && (
              <div className="text-sm text-muted-foreground">
                Nenhuma movimentação
              </div>
            )}
          </div>
        </div>
      </motion.div>

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
}
