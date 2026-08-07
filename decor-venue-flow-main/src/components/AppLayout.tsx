import { AppSidebar } from "./AppSidebar";
import { Search, LogOut, Bell, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const dashQ = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
    refetchInterval: 30_000,
  });
  const d = dashQ.data;

  const notifications = [
    ...(d?.locacoes_vencem_hoje ? [{ id: 1, title: `${d.locacoes_vencem_hoje} locações vencem hoje`, time: "Hoje", type: "error", icon: Clock }] : []),
    ...(d?.locacoes_em_breve ? [{ id: 11, title: `${d.locacoes_em_breve} locações vencem nos próximos dias`, time: "Em breve", type: "warning", icon: Clock }] : []),
    ...(d?.encomendas_atrasadas ? [{ id: 2, title: `${d.encomendas_atrasadas} encomendas atrasadas`, time: "Alta", type: "error", icon: Clock }] : []),
    ...(d?.vendas_hoje_count ? [{ id: 3, title: `${d.vendas_hoje_count} novas vendas registradas hoje`, time: "Hoje", type: "success", icon: CheckCircle2 }] : [])
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-6">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-1 hidden sm:flex">
              <span className="text-sm font-semibold truncate max-w-[120px]">{user?.nome}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{user?.role}</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
              {user?.nome?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-semibold text-sm">Notificações</h3>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{notifications.length} novos</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="text-center text-[11px] text-muted-foreground py-8">Tudo tranquilo por aqui.</div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors cursor-default">
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
              </PopoverContent>
            </Popover>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <button
              onClick={logout}
              title="Sair do Sistema"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
