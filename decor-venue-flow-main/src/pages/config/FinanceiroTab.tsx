import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Palette, CreditCard } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function FinanceiroTab() {
  const qc = useQueryClient();
  const categQ = useQuery({ queryKey: ["categorias_despesa"], queryFn: api.categoriasDespesa });
  const formasQ = useQuery({ queryKey: ["formas_pagamento"], queryFn: api.formasPagamento });

  // Deduplicate by nome (case-insensitive)
  const categorias = (categQ.data || []).filter((c: any, i: number, arr: any[]) =>
    i === arr.findIndex((x: any) => x.nome.toLowerCase() === c.nome.toLowerCase())
  );
  const formas = (formasQ.data || []).filter((f: any, i: number, arr: any[]) =>
    i === arr.findIndex((x: any) => x.nome.toLowerCase() === f.nome.toLowerCase())
  );

  const pagCat = usePagination(categorias, 6);
  const pagFrm = usePagination(formas, 6);

  // Categorias state
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ nome: "", cor: "#6B7280" });

  const catSaveM = useMutation({
    mutationFn: () => api.criarCategoriaDespesa(catForm),
    onSuccess: () => { showToast.success("Categoria criada!"); setCatOpen(false); setCatForm({ nome: "", cor: "#6B7280" }); qc.invalidateQueries({ queryKey: ["categorias_despesa"] }); },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao criar categoria"),
  });
  const catDeleteM = useMutation({
    mutationFn: (id: number) => api.excluirCategoriaDespesa(id),
    onSuccess: () => { showToast.success("Categoria removida."); qc.invalidateQueries({ queryKey: ["categorias_despesa"] }); },
    onError: () => showToast.error("Erro ao remover"),
  });

  // Formas state
  const [frmOpen, setFrmOpen] = useState(false);
  const [frmForm, setFrmForm] = useState({ nome: "", tipo: "outros" });

  const frmSaveM = useMutation({
    mutationFn: () => api.criarFormaPagamento(frmForm),
    onSuccess: () => { showToast.success("Forma criada!"); setFrmOpen(false); setFrmForm({ nome: "", tipo: "outros" }); qc.invalidateQueries({ queryKey: ["formas_pagamento"] }); },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao criar forma de pagamento"),
  });
  const frmDeleteM = useMutation({
    mutationFn: (id: number) => api.excluirFormaPagamento(id),
    onSuccess: () => { showToast.success("Forma removida."); qc.invalidateQueries({ queryKey: ["formas_pagamento"] }); },
    onError: () => showToast.error("Erro ao remover"),
  });

  const tipoLabel: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    debito: "Débito",
    credito: "Crédito",
    boleto: "Boleto",
    transferencia: "Transferência",
    fiado: "Fiado",
    outros: "Outros",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Categorias de Despesa */}
      <div className="card h-full flex flex-col">
        <div className="card-head" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(11, 80%, 60%, 0.1)", color: "hsl(11, 80%, 60%)" }}>
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: "15px" }}>Categorias de Despesa</div>
              <div style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Organize seus gastos por categoria.</div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setCatOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </button>
        </div>
        
        <div className="finance-list flex-1 flex flex-col">
          {categorias.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma categoria criada.</div>
          )}
          {pagCat.currentData.map((c: any) => (
            <div key={c.id} className="group flex justify-between items-center py-3 border-b border-border/50 hover:bg-white/[0.02] px-4 transition-colors rounded-sm">
              <div className="flex items-center gap-3">
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: c.cor }}></div>
                <div className="font-semibold text-[13.5px] text-foreground">{c.nome}</div>
                {c.padrao === 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-surface3 border-border text-muted-foreground">Padrão</span>}
              </div>
              <div className="flex gap-1">
                {c.padrao !== 1 && (
                  <button className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--destructive))" }} onClick={() => { if (confirm("Remover?")) catDeleteM.mutate(c.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="mt-auto pt-4">
            {pagCat.maxPage > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={pagCat.prev} className={pagCat.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink className="font-medium text-xs">Página {pagCat.currentPage} de {pagCat.maxPage}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext onClick={pagCat.next} className={pagCat.currentPage === pagCat.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>

      {/* Formas de Pagamento */}
      <div className="card h-full flex flex-col">
        <div className="card-head" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(145, 63%, 49%, 0.1)", color: "hsl(145, 63%, 49%)" }}>
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: "15px" }}>Formas de Pagamento</div>
              <div style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Configure as formas aceitas no PDV.</div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setFrmOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </button>
        </div>
        
        <div className="finance-list flex-1 flex flex-col">
          {formas.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma forma de pagamento.</div>
          )}
          {pagFrm.currentData.map((f: any) => (
            <div key={f.id} className="group flex justify-between items-center py-3 border-b border-border/50 hover:bg-white/[0.02] px-4 transition-colors rounded-sm">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-[13.5px] text-foreground">{f.nome}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-surface2 border-border text-muted-foreground">{tipoLabel[f.tipo] || f.tipo}</span>
                {f.padrao === 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-surface3 border-border text-muted-foreground">Padrão</span>}
              </div>
              <div className="flex gap-1">
                {f.padrao !== 1 && (
                  <button className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--destructive))" }} onClick={() => { if (confirm("Remover?")) frmDeleteM.mutate(f.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="mt-auto pt-4">
            {pagFrm.maxPage > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={pagFrm.prev} className={pagFrm.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink className="font-medium text-xs">Página {pagFrm.currentPage} de {pagFrm.maxPage}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext onClick={pagFrm.next} className={pagFrm.currentPage === pagFrm.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>

      {/* Dialog categoria */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria de Despesa</DialogTitle>
            <DialogDescription>Adicione uma categoria para organizar suas despesas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Nome</label>
              <Input placeholder="Ex: Marketing, Aluguel, Material" value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium uppercase text-muted-foreground">Cor</label>
              <input type="color" value={catForm.cor} onChange={(e) => setCatForm({ ...catForm, cor: e.target.value })} className="h-10 w-14 rounded border cursor-pointer" />
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: catForm.cor }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>Cancelar</Button>
            <Button onClick={() => catSaveM.mutate()} disabled={catSaveM.isPending || !catForm.nome}>
              {catSaveM.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog forma */}
      <Dialog open={frmOpen} onOpenChange={setFrmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Forma de Pagamento</DialogTitle>
            <DialogDescription>Adicione uma nova forma de pagamento para usar no PDV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Nome</label>
              <Input placeholder="Ex: PIX QR Code, Cartão Corporate" value={frmForm.nome} onChange={(e) => setFrmForm({ ...frmForm, nome: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Tipo</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={frmForm.tipo} onChange={(e) => setFrmForm({ ...frmForm, tipo: e.target.value })}>
                {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFrmOpen(false)}>Cancelar</Button>
            <Button onClick={() => frmSaveM.mutate()} disabled={frmSaveM.isPending || !frmForm.nome}>
              {frmSaveM.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
