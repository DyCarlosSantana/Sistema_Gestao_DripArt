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
import { api, type ProdutoRow, type FornecedorRow } from "@/lib/api";
import { brl } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { ImageIcon, Edit2, Trash2, Plus, Package, Search, AlertTriangle } from "lucide-react";
import { CurrencyInput, NumberInput } from "@/components/ui/currency-input";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function emptyProduto(): Partial<ProdutoRow> {
  return { nome: "", categoria: "", preco_venda: 0, estoque: 0, imagem_url: "" };
}

function emptyFornecedor(): Partial<FornecedorRow> {
  return { nome: "", telefone: "", email: "", cnpj: "", endereco: "", obs: "" };
}

export default function ProdutosPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [estoqueFiltro, setEstoqueFiltro] = useState<"" | "baixo" | "zerado">("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoRow | null>(null);
  const [form, setForm] = useState<Partial<ProdutoRow>>(emptyProduto());

  const produtosQ = useQuery({
    queryKey: ["produtos"],
    queryFn: api.produtos,
  });

  const fornecedoresQ = useQuery({
    queryKey: ["fornecedores"],
    queryFn: api.fornecedores,
  });

  const [tab, setTab] = useState("mercadorias");
  const [fQ, setFQ] = useState("");
  const [openForn, setOpenForn] = useState(false);
  const [editingForn, setEditingForn] = useState<FornecedorRow | null>(null);
  const [formForn, setFormForn] = useState<Partial<FornecedorRow>>(emptyFornecedor());

  const saveM = useMutation({
    mutationFn: async () => {
      if (!form.nome?.trim()) throw new Error("Nome é obrigatório");
      return api.salvarProduto(
        {
          nome: form.nome.trim(),
          categoria: (form.categoria || "").toString(),
          preco_venda: Number(form.preco_venda) || 0,
          estoque: Number(form.estoque) || 0,
          imagem_url: (form.imagem_url || "").toString(),
        },
        editing?.id
      );
    },
    onSuccess: async () => {
      toast.success(editing ? "Mercadoria atualizada!" : "Mercadoria criada!");
      setOpen(false);
      setEditing(null);
      setForm(emptyProduto());
      await qc.invalidateQueries({ queryKey: ["produtos"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.excluirProduto(id),
    onSuccess: async () => {
      toast.success("Produto excluído!");
      await qc.invalidateQueries({ queryKey: ["produtos"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const saveFornM = useMutation({
    mutationFn: async () => {
      if (!formForn.nome?.trim()) throw new Error("Nome é obrigatório");
      return api.salvarFornecedor(
        {
          nome: formForn.nome.trim(),
          telefone: (formForn.telefone || "").toString(),
          email: (formForn.email || "").toString(),
          cnpj: (formForn.cnpj || "").toString(),
          endereco: (formForn.endereco || "").toString(),
          obs: (formForn.obs || "").toString(),
        },
        editingForn?.id
      );
    },
    onSuccess: async () => {
      toast.success(editingForn ? "Fornecedor atualizado!" : "Fornecedor criado!");
      setOpenForn(false);
      setEditingForn(null);
      setFormForn(emptyFornecedor());
      await qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar fornecedor"),
  });

  const deleteFornM = useMutation({
    mutationFn: (id: number) => api.excluirFornecedor(id),
    onSuccess: async () => {
      toast.success("Fornecedor excluído!");
      await qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: () => toast.error("Erro ao excluir fornecedor"),
  });

  const rows = useMemo(() => {
    let data = produtosQ.data || [];
    if (q) {
      const lower = q.toLowerCase();
      data = data.filter((p) => p.nome.toLowerCase().includes(lower));
    }
    if (estoqueFiltro === "baixo") data = data.filter((p) => p.estoque > 0 && p.estoque <= 5);
    if (estoqueFiltro === "zerado") data = data.filter((p) => p.estoque <= 0);
    return data;
  }, [produtosQ.data, q, estoqueFiltro]);

  const fornecedoresRows = useMemo(() => {
    let data = fornecedoresQ.data || [];
    if (fQ) {
      const lower = fQ.toLowerCase();
      data = data.filter((f) => f.nome.toLowerCase().includes(lower) || (f.cnpj || "").toLowerCase().includes(lower));
    }
    return data;
  }, [fornecedoresQ.data, fQ]);

  const { currentData, currentPage, maxPage, next, prev, jump } = usePagination(rows, 12);
  const pForn = usePagination(fornecedoresRows, 12);

  const estoqueColor = (n: number) => {
    if (n <= 0) return "text-destructive bg-destructive/10";
    if (n <= 5) return "text-warning bg-warning-light";
    return "text-success bg-success-light";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Mercadorias</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Catálogo de mercadorias e gerenciamento de fornecedores
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "mercadorias" && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(emptyProduto());
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova Mercadoria
            </Button>
          )}
          {tab === "fornecedores" && (
            <Button
              onClick={() => {
                setEditingForn(null);
                setFormForn(emptyFornecedor());
                setOpenForn(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="mercadorias">Mercadorias</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>

        {/* ── TAB: Mercadorias ── */}
        <TabsContent value="mercadorias" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar mercadoria..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={estoqueFiltro} onValueChange={(v) => setEstoqueFiltro(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="baixo">Estoque Baixo</SelectItem>
                <SelectItem value="zerado">Estoque Zerado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {produtosQ.isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando mercadorias…</div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-30" />
              Nenhuma mercadoria encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {currentData.map((p) => (
                <div
                  key={p.id}
                  className="card-lift group relative rounded-2xl border border-border bg-card overflow-hidden shadow-subtle"
                >
                  {/* Image area */}
                  <div className="relative h-40 bg-muted/30 flex items-center justify-center overflow-hidden">
                    {p.imagem_url ? (
                      <img
                        src={p.imagem_url}
                        alt={p.nome}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-[10px] uppercase tracking-wider">Sem imagem</span>
                      </div>
                    )}

                    {/* Hover overlay actions */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setForm(p);
                            setOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm hover:bg-white transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${p.nome}"?`)) deleteM.mutate(p.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-destructive shadow-sm hover:bg-white transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stock badge */}
                    {p.estoque <= 5 && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className={`text-[10px] font-bold ${estoqueColor(p.estoque)}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {p.estoque <= 0 ? "Sem estoque" : `Estoque: ${p.estoque}`}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {p.nome}
                      </h3>
                    </div>

                    {p.categoria && (
                      <Badge variant="outline" className="text-[10px]">
                        {p.categoria}
                      </Badge>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-display text-lg font-bold text-primary">
                        {brl(p.preco_venda)}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estoqueColor(p.estoque)}`}>
                        {p.estoque > 5 ? `${p.estoque} un.` : p.estoque <= 0 ? "Esgotado" : `${p.estoque} un.`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {maxPage > 1 && (
            <Pagination className="mt-8">
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
        </TabsContent>

        {/* ── TAB: Fornecedores ── */}
        <TabsContent value="fornecedores" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={fQ}
                onChange={(e) => setFQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {fornecedoresQ.isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando fornecedores…</div>
          ) : fornecedoresRows.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-30" />
              Nenhum fornecedor encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pForn.currentData.map((f) => (
                <div
                  key={f.id}
                  className="card-lift group relative rounded-2xl border border-border bg-card overflow-hidden shadow-subtle p-4 space-y-2 flex flex-col"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">
                      {f.nome}
                    </h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingForn(f);
                          setFormForn(f);
                          setOpenForn(true);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded bg-muted text-primary hover:bg-muted/80"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${f.nome}"?`)) deleteFornM.mutate(f.id);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded bg-muted text-destructive hover:bg-muted/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {f.cnpj && (
                    <div className="text-xs text-muted-foreground">CNPJ: {f.cnpj}</div>
                  )}

                  <div className="flex-1 mt-2 text-sm text-muted-foreground space-y-1">
                    {f.telefone && <div>Tel: {f.telefone}</div>}
                    {f.email && <div className="truncate">Email: {f.email}</div>}
                    {f.endereco && <div className="truncate">End: {f.endereco}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pForn.maxPage > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={pForn.prev} className={pForn.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="font-medium">
                    Página {pForn.currentPage} de {pForn.maxPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={pForn.next} className={pForn.currentPage === pForn.maxPage ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Mercadoria */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveM.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Mercadoria" : "Nova Mercadoria"}</DialogTitle>
              <DialogDescription>Informe os dados da mercadoria.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <Input
                  autoFocus
                  value={form.nome || ""}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do produto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Input
                    value={form.categoria || ""}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Ex: Caneca"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">URL da Imagem</label>
                  <Input
                    value={form.imagem_url || ""}
                    onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Preço de Venda *</label>
                  <CurrencyInput
                    value={form.preco_venda || 0}
                    onChange={(v) => setForm({ ...form, preco_venda: v })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Estoque</label>
                  <NumberInput
                    integer
                    value={form.estoque ?? 0}
                    onChange={(v) => setForm({ ...form, estoque: v })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saveM.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveM.isPending}>
                {saveM.isPending ? "Salvando…" : editing ? "Salvar" : "Criar Mercadoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Fornecedor */}
      <Dialog open={openForn} onOpenChange={setOpenForn}>
        <DialogContent className="sm:max-w-[500px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveFornM.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editingForn ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
              <DialogDescription>Informe os dados do fornecedor.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome da Empresa / Contato *</label>
                <Input
                  autoFocus
                  value={formForn.nome || ""}
                  onChange={(e) => setFormForn({ ...formForn, nome: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                  <Input
                    value={formForn.telefone || ""}
                    onChange={(e) => setFormForn({ ...formForn, telefone: e.target.value })}
                    placeholder="Telefone"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">CNPJ/CPF</label>
                  <Input
                    value={formForn.cnpj || ""}
                    onChange={(e) => setFormForn({ ...formForn, cnpj: e.target.value })}
                    placeholder="Documento"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  value={formForn.email || ""}
                  onChange={(e) => setFormForn({ ...formForn, email: e.target.value })}
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Endereço</label>
                <Input
                  value={formForn.endereco || ""}
                  onChange={(e) => setFormForn({ ...formForn, endereco: e.target.value })}
                  placeholder="Endereço"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Observações</label>
                <Input
                  value={formForn.obs || ""}
                  onChange={(e) => setFormForn({ ...formForn, obs: e.target.value })}
                  placeholder="Informações adicionais"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForn(false)} disabled={saveFornM.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveFornM.isPending}>
                {saveFornM.isPending ? "Salvando…" : editingForn ? "Salvar" : "Adicionar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
