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
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import { parseInputNumber } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Package, Trash2, Box, Search, Plus } from "lucide-react";

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

  const [tab, setTab] = useState("itens");

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

  const pItens = usePagination(filteredItens, 12);
  const pKits = usePagination(filteredKits, 12);

  // -------- Item modal --------
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [ilNome, setIlNome] = useState("");
  const [ilCategoria, setIlCategoria] = useState("");
  const [ilPreco, setIlPreco] = useState<string | number>("");
  const [ilQtdTotal, setIlQtdTotal] = useState<string | number>("");

  function resetItemForm() {
    setEditItemId(null);
    setIlNome("");
    setIlCategoria("");
    setIlPreco("");
    setIlQtdTotal("");
  }

  function abrirNovoItem() {
    resetItemForm();
    setItemModalOpen(true);
  }

  function abrirEditarItem(it: ItemLocRow) {
    setEditItemId(it.id);
    setIlNome(it.nome || "");
    setIlCategoria(it.categoria || "");
    setIlPreco(it.preco_diaria || "");
    setIlQtdTotal(it.quantidade_total || "");
    setItemModalOpen(true);
  }

  const salvarItemM = useMutation({
    mutationFn: () => {
      if (!ilNome.trim()) throw new Error("Informe o nome do item");
      const preco = parseInputNumber(ilPreco);
      if (preco < 0) throw new Error("Preço inválido");
      const payload = {
        nome: ilNome.trim(),
        categoria: ilCategoria.trim(),
        preco_diaria: preco,
        quantidade_total: parseInputNumber(ilQtdTotal) || 1,
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
  const [kitPreco, setKitPreco] = useState<string | number>("");

  const [kitItems, setKitItems] = useState<Array<{ item_id: number; nome: string; quantidade: number }>>([]);
  const [kitSelItemId, setKitSelItemId] = useState<number | "">("");
  const [kitSelQtd, setKitSelQtd] = useState<string | number>(1);

  function resetKitForm() {
    setEditKitId(null);
    setKitNome("");
    setKitPreco("");
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
    setKitPreco(k.preco_total || "");
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
    const qtd = parseInputNumber(kitSelQtd);
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
      const preco = parseInputNumber(kitPreco);
      if (preco < 0) throw new Error("Preço inválido");
      if (kitItems.length === 0) throw new Error("Adicione ao menos um item no kit");
      const payload = { nome: kitNome.trim(), preco_total: preco, itens: kitItems };
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
          <h1 className="font-display text-2xl font-bold text-foreground">Itens para Locação</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie itens avulsos e kits usados nas locações
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "itens" && (
            <Button onClick={abrirNovoItem}>
              <Plus className="mr-2 h-4 w-4" /> Novo Item
            </Button>
          )}
          {tab === "kits" && (
            <Button onClick={abrirNovoKit}>
              <Plus className="mr-2 h-4 w-4" /> Novo Kit
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="itens">Itens Individuais</TabsTrigger>
          <TabsTrigger value="kits">Kits</TabsTrigger>
        </TabsList>

        {/* ── TAB: Itens Individuais ── */}
        <TabsContent value="itens" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar item..."
                value={qItens}
                onChange={(e) => setQItens(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {itensQ.isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando itens…</div>
          ) : filteredItens.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-30" />
              Nenhum item encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pItens.currentData.map((it) => (
                <div
                  key={it.id}
                  className="card-lift group relative rounded-2xl border border-border bg-card overflow-hidden shadow-subtle"
                >
                  {/* Icon area */}
                  <div className="relative h-24 bg-muted/30 flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground/30" />

                    {/* Hover overlay actions */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirEditarItem(it)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm hover:bg-white transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${it.nome}"?`)) excluirItemM.mutate(it.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-destructive shadow-sm hover:bg-white transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-display text-sm font-semibold text-foreground leading-tight line-clamp-2">
                      {it.nome}
                    </h3>

                    {it.categoria && (
                      <Badge variant="outline" className="text-[10px]">
                        {it.categoria}
                      </Badge>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-display text-lg font-bold text-primary">
                        {brl(it.preco_diaria || 0)}
                        <span className="text-xs font-normal text-muted-foreground">/dia</span>
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {it.quantidade_total || 0} un.
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pItens.maxPage > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={pItens.prev} className={pItens.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="font-medium">
                    Página {pItens.currentPage} de {pItens.maxPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={pItens.next} className={pItens.currentPage === pItens.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>

        {/* ── TAB: Kits ── */}
        <TabsContent value="kits" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar kit..."
                value={qKits}
                onChange={(e) => setQKits(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {kitsQ.isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando kits…</div>
          ) : filteredKits.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Box className="mx-auto h-12 w-12 mb-3 opacity-30" />
              Nenhum kit encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pKits.currentData.map((k: KitRow) => (
                <div
                  key={k.id}
                  className="card-lift group relative rounded-2xl border border-border bg-card overflow-hidden shadow-subtle"
                >
                  {/* Icon area */}
                  <div className="relative h-24 bg-primary/5 flex items-center justify-center">
                    <Box className="h-10 w-10 text-primary/30" />

                    {/* Hover overlay actions */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirEditarKit(k)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm hover:bg-white transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${k.nome}"?`)) excluirKitM.mutate(k.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-destructive shadow-sm hover:bg-white transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-display text-sm font-semibold text-foreground leading-tight line-clamp-2 flex items-center gap-1">
                      <Box className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {k.nome}
                    </h3>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-display text-lg font-bold text-primary">
                        {brl(k.preco_total || 0)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {(k.itens || []).length} {(k.itens || []).length === 1 ? "item" : "itens"}
                      </span>
                    </div>

                    {(k.itens || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(k.itens || []).slice(0, 3).map((i, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] text-muted-foreground bg-card">
                            {i.quantidade}x {i.nome}
                          </Badge>
                        ))}
                        {(k.itens || []).length > 3 && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            +{(k.itens || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pKits.maxPage > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={pKits.prev} className={pKits.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="font-medium">
                    Página {pKits.currentPage} de {pKits.maxPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={pKits.next} className={pKits.currentPage === pKits.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>

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
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={ilPreco}
                onChange={(e) => setIlPreco(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Quantidade total</label>
              <Input
                inputMode="numeric"
                placeholder="1"
                value={ilQtdTotal}
                onChange={(e) => setIlQtdTotal(e.target.value)}
              />
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
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={kitPreco}
                onChange={(e) => setKitPreco(e.target.value)}
              />
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
                  <Input
                    inputMode="numeric"
                    placeholder="1"
                    value={kitSelQtd}
                    onChange={(e) => setKitSelQtd(e.target.value)}
                  />
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
