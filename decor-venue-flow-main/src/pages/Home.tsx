import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Package,
  ShoppingCart,
  ClipboardList,
  ArrowRight,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.nome?.split(" ")[0] || "Usuário";

  const dashQ = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
    refetchInterval: 30_000,
  });
  const d = dashQ.data;

  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Fetch agenda for the current month to show dots on the calendar
  const currentMonthStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';
  const agendaQ = useQuery({
    queryKey: ["agenda", currentMonthStr],
    queryFn: () => api.agenda({ mes: currentMonthStr }),
    enabled: !!currentMonthStr,
  });
  const monthEvents = agendaQ.data || [];

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
    { name: "Orçamentos", path: "/orcamentos", icon: ClipboardList, color: "text-blue-500 bg-blue-500/10", hoverBorder: "hover:border-blue-500/50" },
  ];

  // Custom Day renderer for the calendar
  const CustomDayContent = (props: any) => {
    const { date, displayMonth } = props;
    if (date.getMonth() !== displayMonth.getMonth()) return <span>{date.getDate()}</span>;
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayEvents = monthEvents.filter((e: any) => e.data_inicio === dateStr || e.data_fim === dateStr);
    
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <span>{date.getDate()}</span>
        {dayEvents.length > 0 && (
          <div className="absolute bottom-1 flex gap-0.5 justify-center w-full">
            {dayEvents.slice(0, 3).map((ev: any, i: number) => (
              <div key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: ev.cor || '#f43f5e' }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
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
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Encomendas */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-500" />
                <h3 className="font-display text-base font-semibold text-foreground">Gestão Rápida de Encomendas</h3>
              </div>
              <Link to="/encomendas" className="text-xs text-primary hover:underline font-semibold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Ver Painel Completo</Link>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
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

        {/* RIGHT COLUMN: Quick Access & Calendar */}
        <div className="flex flex-col gap-6">
          
          {/* Quick Access Hub */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex-none">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickAccess.map((s) => (
                <Link
                  key={s.name}
                  to={s.path}
                  className={`group flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-3 transition-all ${s.hoverBorder} text-center`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-[12px] font-bold text-foreground leading-tight">{s.name}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Agenda & Calendar Tabs */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle flex flex-col h-full">
            <Tabs defaultValue="lista" className="flex flex-col w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-rose-500" />
                  <h3 className="font-display text-base font-semibold text-foreground">Agenda</h3>
                </div>
                <TabsList className="h-8">
                  <TabsTrigger value="lista" className="text-xs">Lista de Hoje</TabsTrigger>
                  <TabsTrigger value="calendario" className="text-xs">Calendário</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="lista" className="flex-1 flex flex-col gap-3 m-0 mt-2">
                {!d?.agenda_hoje?.length ? (
                  <div className="text-center text-sm text-muted-foreground py-12 flex flex-col items-center">
                    <Calendar className="h-10 w-10 opacity-20 mb-3" />
                    Nenhum evento agendado para hoje.
                  </div>
                ) : (
                  d.agenda_hoje.map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-xl bg-background border border-border p-3 hover:border-rose-500/30 transition-colors">
                      <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: ev.cor || '#f43f5e' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-foreground truncate">{ev.titulo}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{ev.cliente_nome || "Sem cliente"}</div>
                      </div>
                      <div className="text-[11px] font-bold text-foreground whitespace-nowrap bg-secondary px-2 py-1 rounded-md">
                        {ev.hora_inicio}
                      </div>
                    </div>
                  ))
                )}
                <Link to="/agenda" className="text-xs text-center text-primary hover:underline mt-2">Ver Agenda Completa</Link>
              </TabsContent>

              <TabsContent value="calendario" className="flex-1 flex flex-col items-center justify-center m-0 mt-2 w-full">
                <div className="bg-background rounded-xl border border-border p-4 w-full flex justify-center shadow-sm">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => { if(d) setDate(d); }}
                    onMonthChange={setDate}
                    components={{
                      IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                      IconRight: () => <ChevronRight className="h-4 w-4" />,
                      DayContent: CustomDayContent
                    }}
                    className="rounded-md w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center w-full",
                      month: "space-y-4 w-full",
                      table: "w-full border-collapse space-y-1 mx-auto",
                      head_row: "flex w-full justify-between",
                      head_cell: "text-muted-foreground w-full font-normal text-[0.8rem] text-center",
                      row: "flex w-full mt-2 justify-between",
                      cell: "w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20 h-10",
                      day: "w-full h-full p-0 font-normal aria-selected:opacity-100 flex items-center justify-center hover:bg-accent rounded-md transition-colors",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                    }}
                  />
                </div>
                <div className="mt-5 flex gap-4 text-[11px] text-muted-foreground font-bold uppercase tracking-wider justify-center bg-card/50 px-4 py-2 rounded-full border border-border/50">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-sm"></div> Locação</div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#534AB7] shadow-sm"></div> Encomenda</div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-sm"></div> Geral</div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>

      </div>
    </div>
  );
}
