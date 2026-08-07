import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Shield, ShieldCheck } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const TODAS_PERMISSOES = [
  { id: "dashboard_view", label: "Ver Dashboard", group: "Acesso" },
  { id: "vendas_view", label: "Acessar Caixa/PDV", group: "Vendas" },
  { id: "vendas_add", label: "Registrar Vendas", group: "Vendas" },
  { id: "locacoes_view", label: "Acessar Locações", group: "Locações" },
  { id: "encomendas_view", label: "Acessar Encomendas", group: "Produção" },
  { id: "despesas_view", label: "Acessar Despesas", group: "Financeiro" },
  { id: "clientes_view", label: "Acessar Clientes", group: "CRM" },
  { id: "config_view", label: "Acessar Configurações", group: "Sistema" },
];

export default function CargosTab({ cargos: cargosInicial }: { cargos: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ id: null, nome: "", descricao: "", permissoes: [] as string[] });

  // Fetch cargos inside component so it reacts to invalidation automatically
  const { data: cargosData } = useQuery({ queryKey: ["cargos"], queryFn: api.cargos });
  const cargos = cargosData ?? cargosInicial;

  const { currentData, currentPage, maxPage, next, prev } = usePagination(cargos, 6);

  const saveM = useMutation({
    mutationFn: (data: any) => {
      const { id, ...payload } = data;
      return api.salvarCargo(payload, id || undefined);
    },
    onSuccess: () => {
      showToast.success("Cargo salvo com sucesso!");
      setOpen(false);
      setForm({ id: null, nome: "", descricao: "", permissoes: [] });
      qc.invalidateQueries({ queryKey: ["cargos"] });
    },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao salvar cargo"),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.excluirCargo(id),
    onSuccess: () => { showToast.success("Cargo removido."); qc.invalidateQueries({ queryKey: ["cargos"] }); },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao remover"),
  });

  const togglePerm = (p: string) => {
    setForm((old: any) => ({
      ...old,
      permissoes: old.permissoes.includes(p) ? old.permissoes.filter((x: string) => x !== p) : [...old.permissoes, p],
    }));
  };

  const selectAll = () => {
    setForm((old: any) => ({ ...old, permissoes: TODAS_PERMISSOES.map(p => p.id) }));
  };

  const clearAll = () => {
    setForm((old: any) => ({ ...old, permissoes: [] }));
  };

  const openForm = (c: any = null) => {
    setForm(c ? { id: c.id, nome: c.nome, descricao: c.descricao || "", permissoes: c.permissoes || [] } : { id: null, nome: "", descricao: "", permissoes: [] });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="card" style={{ border: "none", background: "transparent" }}>
        <div className="card-head" style={{ padding: "0 0 16px 0", borderBottom: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="card-title" style={{ fontSize: "16px" }}>Gerenciamento de Cargos</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openForm(null)}>
            <Plus className="h-3.5 w-3.5" /> Criar Novo Cargo
          </button>
        </div>
        
        {cargos.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum cargo customizado criado ainda.</p>
            <p className="text-xs text-muted-foreground">Crie cargos para definir permissões específicas para seus funcionários.</p>
          </div>
        ) : (
          <div className="role-grid">
            {currentData.map((c: any) => (
              <div key={c.id} className="role-card">
                <div className="role-card-head">
                  <div>
                    <div className="role-card-name">{c.nome}</div>
                    <div className="role-card-count">{c.descricao || "Sem descrição"}</div>
                  </div>
                  <span className="role-card-badge" style={{ background: "hsla(var(--primary), 0.12)", color: "hsl(var(--primary))" }}>
                    {(c.permissoes || []).length} Permissões
                  </span>
                </div>
                <div className="role-card-perms">
                  {(c.permissoes || []).length === 0 && (
                    <span className="text-[11px] text-muted-foreground italic">Nenhuma permissão definida</span>
                  )}
                  {(c.permissoes || []).map((p: string) => {
                    const pInfo = TODAS_PERMISSOES.find(x => x.id === p);
                    return (
                      <span key={p} className="perm-chip on">{pInfo?.label || p}</span>
                    );
                  })}
                </div>
                <div className="role-card-foot">
                  <button className="btn btn-ghost btn-xs" style={{ flex: 1 }} onClick={() => openForm(c)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button className="btn btn-ghost btn-xs" style={{ color: "hsl(var(--destructive))" }} onClick={() => { if (confirm("Remover cargo?")) deleteM.mutate(c.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {maxPage > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={prev} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink className="font-medium">
                  Página {currentPage} de {maxPage}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext onClick={next} className={currentPage === maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-[hsl(var(--background))] border-[hsl(var(--border))] rounded-lg">
          <DialogHeader className="p-6 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-bold">{form.id ? "Editar Cargo" : "Criar Cargo"}</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground mt-1">Defina o nome e selecione as permissões que este cargo terá.</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Nome do Cargo</label>
                <input className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" placeholder="Ex: Vendedor Sênior" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Descrição (Opcional)</label>
                <input className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" placeholder="Sobre as funções..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-[13px] text-foreground">Permissões de Acesso</h4>
                <div className="flex gap-2">
                  <button className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={selectAll}>Marcar Todas</button>
                  <button className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={clearAll}>Limpar</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TODAS_PERMISSOES.map((p) => {
                  const isOn = form.permissoes.includes(p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-md border transition-colors cursor-pointer select-none ${isOn ? 'bg-[hsl(330,80%,60%,0.08)] border-[hsl(330,80%,60%,0.3)]' : 'bg-surface2 border-border hover:border-[hsl(var(--border-hover))]'}`} onClick={() => togglePerm(p.id)}>
                      <label className="toggle flex-shrink-0 cursor-pointer pointer-events-none">
                        <input type="checkbox" checked={isOn} readOnly />
                        <div className="toggle-track"></div><div className="toggle-thumb"></div>
                      </label>
                      <div className="flex flex-col">
                        <div className="text-[13px] font-semibold transition-colors" style={{ color: isOn ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>{p.label}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">{p.group}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t border-white/5 bg-surface">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-white/5">Cancelar</Button>
            <Button onClick={() => saveM.mutate(form)} disabled={saveM.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6">
              {saveM.isPending ? "Salvando..." : "Salvar Cargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
