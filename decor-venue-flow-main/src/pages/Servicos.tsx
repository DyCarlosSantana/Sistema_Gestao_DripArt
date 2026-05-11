import { useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, Trash2 } from "lucide-react";

export default function ServicosPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoPreco, setTipoPreco] = useState("fixo");
  const [preco, setPreco] = useState<number>(0);

  const servicosQ = useQuery({
    queryKey: ["servicos", busca],
    queryFn: () => api.servicos({ q: busca }),
  });

  const excluirM = useMutation({
    mutationFn: (id: number) => api.excluirServico(id),
    onSuccess: async () => {
      toast.success("Serviço inativado!");
      await qc.invalidateQueries({ queryKey: ["servicos"] });
    },
    onError: () => toast.error("Erro ao inativar serviço"),
  });

  const salvarM = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do serviço");
      return api.salvarServico(
        {
          nome,
          descricao,
          categoria,
          tipo_preco: tipoPreco,
          preco,
        },
        editId ?? undefined
      );
    },
    onSuccess: async () => {
      toast.success(editId ? "Serviço atualizado!" : "Serviço cadastrado!");
      setModalOpen(false);
      await qc.invalidateQueries({ queryKey: ["servicos"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar serviço"),
  });

  function resetForm() {
    setEditId(null);
    setNome("");
    setDescricao("");
    setCategoria("");
    setTipoPreco("fixo");
    setPreco(0);
  }

  function abrirNovo() {
    resetForm();
    setModalOpen(true);
  }

  function abrirEditar(s: any) {
    setEditId(s.id);
    setNome(s.nome || "");
    setDescricao(s.descricao || "");
    setCategoria(s.categoria || "");
    setTipoPreco(s.tipo_preco || "fixo");
    setPreco(s.preco || 0);
    setModalOpen(true);
  }

  const rows = servicosQ.data || [];
  const { currentData, currentPage, maxPage, next, prev, jump } = usePagination(rows, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Catálogo de Serviços</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie os serviços prestados, como instalação, arte digital e artes finais.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar serviço por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={() => servicosQ.refetch()} disabled={servicosQ.isFetching}>
          Buscar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {servicosQ.isLoading && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            Carregando serviços…
          </div>
        )}
        {!servicosQ.isLoading && rows.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            Nenhum serviço cadastrado ainda.
          </div>
        )}
        {currentData.map((s: any) => (
          <Card key={s.id} className="flex flex-col shadow-subtle hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{s.nome}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {s.categoria ? <Badge variant="outline">{s.categoria}</Badge> : <span className="text-muted-foreground">Sem categoria</span>}
                  </CardDescription>
                </div>
                <Badge variant={s.tipo_preco === "fixo" ? "secondary" : "outline"} className="capitalize">
                  {s.tipo_preco === "fixo" ? "Fixo" : "Variável/Hora"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
              <div className="text-muted-foreground text-sm line-clamp-2 min-h-[40px]">
                {s.descricao || "Sem descrição"}
              </div>
              <div className="mt-4">
                <span className="text-xs text-muted-foreground block mb-1">Preço Base</span>
                <span className="font-medium text-foreground text-lg">
                  {s.preco > 0 ? brl(s.preco) : "A Combinar"}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t bg-muted/20 flex justify-end gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => abrirEditar(s)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm(`Deseja inativar o serviço ${s.nome}?`)) excluirM.mutate(s.id);
                }}
                disabled={excluirM.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={(e) => { e.preventDefault(); salvarM.mutate(); }}>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            <DialogDescription>Cadastre as informações deste serviço prestado pela DripArt.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome do Serviço *</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Criação de Arte para Banner"
                autoFocus
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Instalação, Arte Digital, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo de Cobrança</label>
                <Select value={tipoPreco} onValueChange={setTipoPreco}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Preço Fixo</SelectItem>
                    <SelectItem value="variavel">Orçamento Variável</SelectItem>
                    <SelectItem value="hora">Por Hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
                <CurrencyInput
                  value={preco}
                  onChange={(v) => setPreco(v)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição / Notas Internas</label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes ou observações (opcional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={salvarM.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarM.isPending}>
              {salvarM.isPending ? "Salvando…" : editId ? "Salvar alterações" : "Cadastrar Serviço"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
