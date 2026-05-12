import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Tarefa } from "@/lib/api";
import { useState } from "react";
import {
  ShoppingCart,
  Package,
  Calendar,
  ClipboardList,
  Clock,
  CheckCircle2,
  ArrowRight,
  Shield,
  ListTodo,
  Plus,
  Check,
  Trash2,
  Bell,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const firstName = user?.nome?.split(" ")[0] || "Usuário";

  const dashQ = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
    refetchInterval: 30_000,
  });
  const d = dashQ.data;

  const tarefasQ = useQuery({
    queryKey: ["tarefas"],
    queryFn: () => api.tarefas(),
    refetchInterval: 30_000,
  });
  const tarefas = tarefasQ.data || [];

  const [novaTarefa, setNovaTarefa] = useState("");

  const criarTarefa = useMutation({
    mutationFn: (titulo: string) => api.criarTarefa(titulo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      setNovaTarefa("");
    },
  });

  const toggleTarefa = useMutation({
    mutationFn: ({ id, concluida }: { id: number; concluida: number }) => api.atualizarTarefa(id, { concluida }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas"] }),
  });

  const deletarTarefa = useMutation({
    mutationFn: (id: number) => api.excluirTarefa(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas"] }),
  });

  const handleAddTarefa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefa.trim()) return;
    criarTarefa.mutate(novaTarefa);
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const quickAccess = [
    { name: "Nova Venda", path: "/pdv", icon: ShoppingCart, color: "text-emerald-500 bg-emerald-500/10", hoverBorder: "hover:border-emerald-500/50" },
    { name: "Nova Locação", path: "/locacoes", icon: Package, color: "text-cyan-500 bg-cyan-500/10", hoverBorder: "hover:border-cyan-500/50" },
    { name: "Encomendas", path: "/encomendas", icon: ClipboardList, color: "text-indigo-500 bg-indigo-500/10", hoverBorder: "hover:border-indigo-500/50" },
    { name: "Recebimentos", path: "/financeiro", icon: Wallet, color: "text-amber-500 bg-amber-500/10", hoverBorder: "hover:border-amber-500/50" },
    { name: "Orçamentos", path: "/orcamentos", icon: ClipboardList, color: "text-blue-500 bg-blue-500/10", hoverBorder: "hover:border-blue-500/50" },
    { name: "Agenda", path: "/agenda", icon: Calendar, color: "text-rose-500 bg-rose-500/10", hoverBorder: "hover:border-rose-500/50" }
  ];

  const notifications = [
    ...(d?.locacoes_vencendo ? [{ id: 1, title: `${d.locacoes_vencendo} locações vencem hoje`, time: "Agora", type: "warning", icon: Clock }] : []),
    ...(d?.encomendas_atrasadas ? [{ id: 2, title: `${d.encomendas_atrasadas} encomendas atrasadas`, time: "Alta", type: "error", icon: Clock }] : []),
    ...(d?.vendas_hoje_count ? [{ id: 3, title: `${d.vendas_hoje_count} novas vendas registradas hoje`, time: "Hoje", type: "success", icon: CheckCircle2 }] : [])
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden gap-6">
      {/* ── Page Header ── */}
      <div className="flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Olá, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{today}</p>
        </div>
        {(user as any)?.cargo_nome && (
          <div className="inline-flex items-center gap-2 rounded-full bg-info/10 border border-info/20 px-3.5 py-1.5 text-xs font-semibold text-info">
            <Shield className="h-3.5 w-3.5" />
            {(user as any).cargo_nome}
          </div>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6 min-h-0">
          
          {/* Top Panels: Notifications & Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-[280px] flex-none">
            
            {/* Notifications */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold text-foreground">Avisos & Notificações</h3>
                </div>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{notifications.length} novos</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {notifications.length === 0 ? (
                   <div className="text-center text-[11px] text-muted-foreground py-8">Tudo tranquilo por aqui.</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                      <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                        n.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <n.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-foreground leading-tight">{n.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <ListTodo className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold text-foreground">Tarefas de Hoje</h3>
              </div>
              
              <form onSubmit={handleAddTarefa} className="flex gap-2 mb-4">
                <Input 
                  value={novaTarefa}
                  onChange={(e) => setNovaTarefa(e.target.value)}
                  placeholder="Adicionar nova tarefa..." 
                  className="text-xs h-9 bg-background focus:bg-background"
                  disabled={criarTarefa.isPending}
                />
                <Button size="icon" className="h-9 w-9 shrink-0" type="submit" disabled={criarTarefa.isPending || !novaTarefa.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {tarefas.length === 0 ? (
                  <div className="text-center text-[11px] text-muted-foreground py-4">Sua lista de tarefas está vazia.</div>
                ) : (
                  tarefas.map(t => (
                    <div key={t.id} className={`group flex items-start gap-2.5 p-2 rounded-lg border ${t.concluida ? 'bg-secondary/20 border-transparent opacity-50' : 'bg-background border-border hover:border-primary/20'} transition-all`}>
                      <button 
                        onClick={() => toggleTarefa.mutate({ id: t.id, concluida: t.concluida ? 0 : 1 })}
                        className={`mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-[4px] border ${t.concluida ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary/50'}`}
                      >
                        {t.concluida ? <Check className="h-3 w-3" /> : null}
                      </button>
                      <span className={`text-[13px] leading-tight flex-1 ${t.concluida ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {t.titulo}
                      </span>
                      <button 
                        onClick={() => deletarTarefa.mutate(t.id)}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Encomendas Widget */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-500" />
                <h3 className="font-display text-base font-semibold text-foreground">Gestão Rápida de Encomendas</h3>
              </div>
              <Link to="/encomendas" className="text-xs text-primary hover:underline font-semibold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Ver Painel Completo</Link>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
              {!d?.proximas_encomendas?.length ? (
                <div className="col-span-full text-center text-sm text-muted-foreground py-12 flex flex-col items-center">
                  <ClipboardList className="h-10 w-10 opacity-20 mb-3" />
                  Nenhuma encomenda pendente no momento.
                </div>
              ) : (
                d.proximas_encomendas.map((e: any) => (
                  <div key={e.id} className="flex flex-col gap-2 rounded-xl bg-background border border-border p-4 hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[14px] text-foreground truncate">{e.cliente_nome || "Cliente não informado"}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.descricao}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize whitespace-nowrap ${
                          e.status === 'producao' ? 'bg-indigo-500/10 text-indigo-500' : 
                          e.status === 'pronto' ? 'bg-emerald-500/10 text-emerald-500' : 
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {e.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {e.data_entrega ? `Entrega: ${new Date(e.data_entrega).toLocaleDateString('pt-BR')}` : 'Sem prazo'}
                        </span>
                      </div>
                      <Link to={`/encomendas`} className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        Atualizar <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6 min-h-0">
          
          {/* Quick Access Hub */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex-none">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickAccess.map((s) => (
                <Link
                  key={s.name}
                  to={s.path}
                  className={`group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-background p-3 text-center transition-all ${s.hoverBorder}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] font-bold text-foreground">{s.name}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Mini Calendar / Agenda */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Agenda Diária
              </h3>
              <Link to="/agenda" className="text-[10px] text-muted-foreground hover:text-primary font-bold uppercase tracking-wider transition-colors bg-primary/10 px-2 py-1 rounded-md">Abrir Completa</Link>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Calendar Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button className="h-6 w-6 rounded border border-border bg-surface2 text-muted-foreground hover:bg-surface3 hover:text-foreground flex items-center justify-center transition-colors">
                  &lsaquo;
                </button>
                <div className="font-display text-[13px] font-semibold text-foreground uppercase tracking-wide">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
                <button className="h-6 w-6 rounded border border-border bg-surface2 text-muted-foreground hover:bg-surface3 hover:text-foreground flex items-center justify-center transition-colors">
                  &rsaquo;
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 mb-4">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                  <div key={day} className="text-center text-[9.5px] font-bold text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: 30 }).map((_, i) => {
                  const dayNum = i + 1;
                  const isToday = dayNum === new Date().getDate();
                  const hasEvent = d?.agenda_hoje?.some((a: any) => new Date(a.data_inicio).getDate() === dayNum);
                  
                  return (
                    <div 
                      key={i} 
                      className={`relative text-center text-[11.5px] py-1.5 rounded cursor-pointer transition-colors
                        ${isToday ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:bg-surface3 hover:text-foreground'}
                        ${[0, 6].includes((i + 1) % 7) ? 'text-muted-foreground/60' : ''}
                      `}
                    >
                      {dayNum}
                      {hasEvent && (
                        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-primary' : 'bg-primary/60'}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Agenda Preview List */}
              <div className="flex flex-col gap-[7px] pt-[14px] border-t border-border">
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                  HOJE
                </div>
                {!d?.agenda_hoje?.length ? (
                  <div className="text-center text-[11px] text-muted-foreground py-4 flex flex-col items-center">
                    Sua agenda está livre para hoje.
                  </div>
                ) : (
                  d.agenda_hoje.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-[9px] p-2 bg-surface2 border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer">
                      <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: a.cor || 'hsl(var(--primary))' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-foreground truncate">{a.titulo}</div>
                        <div className="text-[11px] text-muted-foreground mt-[1px] truncate">{a.cliente_nome || "Sem cliente"}</div>
                      </div>
                      <div className="text-[10.5px] font-semibold text-muted-foreground shrink-0">{a.hora_inicio}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
