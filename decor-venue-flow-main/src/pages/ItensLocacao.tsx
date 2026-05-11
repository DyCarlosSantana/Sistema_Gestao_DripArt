import { useMemo, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type VendaRow } from "@/lib/api";
import { brl } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CurrencyInput, NumberInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Edit2, Package, Trash2, Box } from "lucide-react";

type ItemLocRow = {
  id: number;
  nome: string;
  categoria?: string;
  preco_diaria?: number;
  quantidade_total?: number;
};

type KitRow = {
  id: number;
  nome: string;
  preco_total?: number;
  itens?: Array<{ item_id?: number; id?: number; nome?: string; quantidade?: number }>;
};

export default function ItensLocacaoPage() {
  const qc = useQueryClient();
  const itensQ = useQuery({ queryKey: ["itens-locacao"], queryFn: api.itensLocacao });
  const kitsQ = useQuery({ queryKey: ["kits"], queryFn: api.kits });

  const [qItens, setQItens] = useState("");
  const filteredItens = useMemo(() => {
    const all = (itensQ.data || []) as ItemLocRow[];
    const ql = qItens.trim().toLowerCase();
    if (!ql) return all;
    return all.filter((it) => (it.nome || "").toLowerCase().includes(ql) || (it.categoria || "").toLowerCase().includes(ql));
  }, [itensQ.data, qItens]);

  const [qKits, setQKits] = useState("");
  const filteredKits = useMemo(() => {
    const all = (kitsQ.data || []) as KitRow[];
    const ql = qKits.trim().toLowerCase();
    if (!ql) return all;
    return all.filter((k) => (k.nome || "").toLowerCase().includes(ql));
  }, [kitsQ.data, qKits]);

  const pItens = usePagination(filteredItens, 8);
  const pKits = usePagination(filteredKits, 8);

  // -------- Item modal --------
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [ilNome, setIlNome] = useState("");
  const [ilCategoria, setIlCategoria] = useState("");
  const [ilPreco, setIlPreco] = useState<number>(0);
  const [ilQtdTotal, setIlQtdTotal] = useState<number>(1);

  function resetItemForm() {
    setEditItemId(null);
    setIlNome("");
    setIlCategoria("");
    setIlPreco(0);
    setIlQtdTotal(1);
  }

  function abrirNovoItem() {
    resetItemForm();
    setItemModalOpen(true);
  }

  function abrirEditarItem(it: ItemLocRow) {
    setEditItemId(it.id);
    setIlNome(it.nome || "");
    setIlCategoria(it.categoria || "");
    setIlPreco(Number(it.preco_diaria || 0));
    setIlQtdTotal(Number(it.quantidade_total || 1));
    setItemModalOpen(true);
  }

  const salvarItemM = useMutation({
    mutationFn: () => {
      if (!ilNome.trim()) throw new Error("Informe o nome do item");
      if (!Number.isFinite(ilPreco) || ilPreco < 0) throw new Error("Preço inválido");
      const payload = {
        nome: ilNome.trim(),
        categoria: ilCategoria.trim(),
        preco_diaria: Number(ilPreco),
        quantidade_total: Number(ilQtdTotal) || 1,
      };
      return api.salvarItemLocacao(payload, editItemId ?? undefined);
    },
    onSuccess: async () => {
      toast.success(editItemId ? "Item atualizado!" : "Item criado!");
      setItemModalOpen(false);
      resetItemForm();
      await qc.invalidateQueries({ queryKey: ["itens-locacao"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar item"),
  });

  const excluirItemM = useMutation({
    mutationFn: (id: number) => api.excluirItemLocacao(id),
    onSuccess: async () => {
      toast.success("Item excluído!");
      await qc.invalidateQueries({ queryKey: ["itens-locacao"] });
    },
    onError: () => toast.error("Erro ao excluir item"),
  });

  // -------- Kit modal --------
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [editKitId, setEditKitId] = useState<number | null>(null);
  const [kitNome, setKitNome] = useState("");
  const [kitPreco, setKitPreco] = useState<number>(0);

  const [kitItems, setKitItems] = useState<Array<{ item_id: number; nome: string; quantidade: number }>>([]);
  const [kitSelItemId, setKitSelItemId] = useState<number | "">("");
  const [kitSelQtd, setKitSelQtd] = useState<number>(1);

  function resetKitForm() {
    setEditKitId(null);
    setKitNome("");
    setKitPreco(0);
    setKitItems([]);
    setKitSelItemId("");
    setKitSelQtd(1);
  }

  function abrirNovoKit() {
    resetKitForm();
    setKitModalOpen(true);
  }

  function abrirEditarKit(k: KitRow) {
    setEditKitId(k.id);
    setKitNome(k.nome || "");
    setKitPreco(Number(k.preco_total || 0));
    setKitItems(
      (k.itens || []).map((i) => ({
        item_id: Number(i.item_id ?? i.id),
        nome: String(i.nome || ""),
        quantidade: Number(i.quantidade || 1),
      })),
    );
    setKitModalOpen(true);
  }

  function adicionarItemAoKit() {
    if (!kitSelItemId) return toast.error("Selecione um item");
    const qtd = Number(kitSelQtd);
    if (!Number.isFinite(qtd) || qtd <= 0) return toast.error("Quantidade inválida");
    const item = (itensQ.data || []).find((x: any) => x.id === kitSelItemId);
    if (!item) return toast.error("Item não encontrado");
    setKitItems((prev) => [...prev, { item_id: Number(item.id), nome: String(item.nome || ""), quantidade: qtd }]);
    setKitSelQtd(1);
  }

  function removerKitItem(idx: number) {
    setKitItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const salvarKitM = useMutation({
    mutationFn: () => {
      if (!kitNome.trim()) throw new Error("Informe o nome do kit");
      if (!Number.isFinite(kitPreco) || kitPreco < 0) throw new Error("Preço inválido");
      if (kitItems.length === 0) throw new Error("Adicione ao menos um item no kit");
      const payload = { nome: kitNome.trim(), preco_total: Number(kitPreco), itens: kitItems };
      return api.salvarKit(payload, editKitId ?? undefined);
    },
    onSuccess: async () => {
      toast.success(editKitId ? "Kit atualizado!" : "Kit criado!");
      setKitModalOpen(false);
      resetKitForm();
      await qc.invalidateQueries({ queryKey: ["kits"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar kit"),
  });

  const excluirKitM = useMutation({
    mutationFn: (id: number) => api.excluirKit(id),
    onSuccess: async () => {
      toast.success("Kit excluído!");
      await qc.invalidateQueries({ queryKey: ["kits"] });
    },
    onError: () => toast.error("Erro ao excluir kit"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Itens / Kits de locação</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie itens avulsos e kits usados nas locações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={abrirNovoKit}>
            + Novo kit
          </Button>
          <Button variant="outline" onClick={abrirNovoItem}>
            + Novo item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-sm font-semibold">Itens</div>
            <Input placeholder="Buscar item…" value={qItens} onChange={(e) => setQItens(e.target.value)} className="w-[260px]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itensQ.isLoading && (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                Carregando itens…
              </div>
            )}
            {!itensQ.isLoading && filteredItens.length === 0 ? (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                Nenhum item encontrado
              </div>
            ) : null}
            {pItens.currentData.map((it) => (
              <Card key={it.id} className="flex flex-col shadow-subtle hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{it.nome}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {it.categoria ? <Badge variant="secondary" className="bg-secondary text-muted-foreground">{it.categoria}</Badge> : "Sem categoria"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm pb-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Diária</span>
                    <span className="font-medium text-foreground">{brl(it.preco_diaria || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Qtd Total</span>
                    <span className="font-medium text-foreground">{it.quantidade_total || 0}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => abrirEditarItem(it)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Excluir este item?")) excluirItemM.mutate(it.id);
                    }}
                    disabled={excluirItemM.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {pItens.maxPage > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={pItens.prev} className={pItens.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="font-medium">
                    {pItens.currentPage} / {pItens.maxPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={pItens.next} className={pItens.currentPage === pItens.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-sm font-semibold mb-3">Kits</div>
            <Input placeholder="Buscar kit…" value={qKits} onChange={(e) => setQKits(e.target.value)} className="w-[260px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kitsQ.isLoading && (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                Carregando kits…
              </div>
            )}
            {!kitsQ.isLoading && filteredKits.length === 0 ? (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                Nenhum kit cadastrado
              </div>
            ) : null}
            {pKits.currentData.map((k: KitRow) => (
              <Card key={k.id} className="flex flex-col shadow-subtle hover:shadow-md transition-shadow bg-muted/10">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center"><Box className="w-4 h-4 mr-2 text-primary" /> {k.nome}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm pb-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Preço Total</span>
                    <span className="font-medium text-foreground">{brl(k.preco_total || 0)}</span>
                  </div>
                  <div>
                    <span className="text-xs block text-muted-foreground mb-1">Itens inclusos</span>
                    <div className="text-xs flex flex-wrap gap-1">
                      {(k.itens || []).map((i, idx) => (
                        <Badge key={idx} variant="outline" className="text-muted-foreground bg-card">
                          {i.quantidade}x {i.nome}
                        </Badge>
                      ))}
                      {(k.itens || []).length === 0 ? <span className="text-muted-foreground">—</span> : null}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => abrirEditarKit(k)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Excluir este kit?")) excluirKitM.mutate(k.id);
                    }}
                    disabled={excluirKitM.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {pKits.maxPage > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={pKits.prev} className={pKits.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="font-medium">
                    {pKits.currentPage} / {pKits.maxPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={pKits.next} className={pKits.currentPage === pKits.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Modal Item */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{editItemId ? "Editar item de locação" : "Novo item de locação"}</DialogTitle>
            <DialogDescription>Cadastre itens avulsos usados nas locações.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nome *</label>
              <Input value={ilNome} onChange={(e) => setIlNome(e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Input value={ilCategoria} onChange={(e) => setIlCategoria(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Preço/diária *</label>
              <CurrencyInput value={ilPreco} onChange={(v) => setIlPreco(v)} placeholder="0,00" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Quantidade total</label>
              <NumberInput integer value={ilQtdTotal} onChange={(v) => setIlQtdTotal(Math.trunc(v))} placeholder="1" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setItemModalOpen(false)} disabled={salvarItemM.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => salvarItemM.mutate()} disabled={salvarItemM.isPending}>
              {salvarItemM.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Kit */}
      <Dialog open={kitModalOpen} onOpenChange={setKitModalOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editKitId ? "Editar kit de locação" : "Novo kit de locação"}</DialogTitle>
            <DialogDescription>Monte um kit com itens e quantidade.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nome do kit *</label>
              <Input value={kitNome} onChange={(e) => setKitNome(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Preço total do kit *</label>
              <CurrencyInput value={kitPreco} onChange={(v) => setKitPreco(v)} placeholder="0,00" />
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold mb-3">Itens do kit</div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="text-xs font-medium text-muted-foreground">Item *</label>
                  <Select
                    value={kitSelItemId ? String(kitSelItemId) : "none"}
                    onValueChange={(v: any) => setKitSelItemId(v === "none" ? "" : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione item…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione item…</SelectItem>
                      {(itensQ.data || []).map((it: any) => (
                        <SelectItem key={it.id} value={String(it.id)}>
                          {it.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground">Qtd</label>
                  <NumberInput integer value={kitSelQtd} onChange={(v) => setKitSelQtd(Math.trunc(v))} placeholder="1" />
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={adicionarItemAoKit}>
                  + Adicionar
                </Button>
              </div>

              {kitItems.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {kitItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/20 px-4 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {it.quantidade}x {it.nome}
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="destructive" onClick={() => removerKitItem(idx)}>
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">Adicione itens para montar o kit.</div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setKitModalOpen(false)} disabled={salvarKitM.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => salvarKitM.mutate()} disabled={salvarKitM.isPending}>
              {salvarKitM.isPending ? "Salvando…" : editKitId ? "Salvar alterações" : "Salvar kit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

