import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { parseInputNumber } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
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
import { ClipboardList, Plus, ChevronRight, FileText, Edit2, Trash2, Clock, AlertTriangle, CheckCircle2, Package } from "lucide-react";

const STEPS = ["pedido", "producao", "pronto", "entregue"];
const LABELS: Record<string, string> = {
  pedido: "Pedido",
  producao: "Produção",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const STEP_COLORS: Record<string, string> = {
  pedido: "bg-muted-foreground",
  producao: "bg-warning",
  pronto: "bg-info",
  entregue: "bg-success",
  cancelado: "bg-destructive",
};
const CARD_ACCENTS: Record<string, string> = {
  pedido: "border-l-muted-foreground/40",
  producao: "border-l-warning",
  pronto: "border-l-info",
  entregue: "border-l-success",
  cancelado: "border-l-destructive/50",
};

export default function EncomendasPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState("pedido");
  const [dataEntrega, setDataEntrega] = useState("");
  const [total, setTotal] = useState<string | number>("");
  const [valorEntrada, setValorEntrada] = useState<string | number>("");
  const [obs, setObs] = useState("");
  const navigate = useNavigate();
  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});
  const [payForma, setPayForma] = useState("dinheiro");

  const encomendasQ = useQuery({
    queryKey: ["encomendas", busca, statusFiltro],
    queryFn: () => api.encomendas({ q: busca, status: statusFiltro }),
  });

  const dashQ = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
  });

  const excluirM = useMutation({
    mutationFn: (id: number) => api.excluirEncomenda(id),
    onSuccess: async () => {
      toast.success("Encomenda excluída!");
      await qc.invalidateQueries({ queryKey: ["encomendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao excluir encomenda"),
  });

  const salvarM = useMutation({
    mutationFn: async () => {
      if (!clienteNome.trim()) throw new Error("Informe o cliente");
      if (!descricao.trim()) throw new Error("Informe a descrição");
      return api.salvarEncomenda(
        { cliente_nome: clienteNome, descricao, data_entrega: dataEntrega, status, total: parseInputNumber(total), valor_entrada: parseInputNumber(valorEntrada), obs },
        editId ?? undefined,
      );
    },
    onSuccess: async () => {
      toast.success(editId ? "Encomenda atualizada!" : "Encomenda criada!");
      setModalOpen(false);
      await qc.invalidateQueries({ queryKey: ["encomendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar encomenda"),
  });

  const alterarStatusM = useMutation({
    mutationFn: ({ id, novoStatus }: { id: number; novoStatus: string }) =>
      api.atualizarStatusEncomenda(id, novoStatus),
    onSuccess: async () => {
      toast.success("Status atualizado!");
      await qc.invalidateQueries({ queryKey: ["encomendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const faturarM = useMutation({
    mutationFn: ({ id, forma_pagamento }: { id: number; forma_pagamento: string }) =>
      api.converterEncomendaVenda(id, forma_pagamento),
    onSuccess: async (d: any, variables) => {
      toast.success(`Encomenda faturada! Venda #${d?.venda?.id ?? ""} criada!`);
      await qc.invalidateQueries({ queryKey: ["encomendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["vendas"] });
      setPayModal({ open: false, id: null });
      if (variables.forma_pagamento === "fiado") {
        navigate("/fiado");
      }
    },
    onError: () => toast.error("Erro ao faturar encomenda"),
  });

  function resetForm() {
    setEditId(null);
    setClienteNome("");
    setDescricao("");
    setStatus("pedido");
    setDataEntrega("");
    setTotal("");
    setValorEntrada("");
    setObs("");
  }

  function abrirNovo() { resetForm(); setModalOpen(true); }
  function abrirEditar(e: any) {
    setEditId(e.id);
    setClienteNome(e.cliente_nome || "");
    setDescricao(e.descricao || "");
    setStatus(e.status || "pedido");
    setDataEntrega(e.data_entrega || "");
    setTotal(e.total || "");
    setValorEntrada(e.valor_entrada || "");
    setObs(e.obs || "");
    setObs(e.obs || "");
    setModalOpen(true);
  }

  function avancarStatus(id: number, atual: string) {
    const idx = STEPS.indexOf(atual);
    if (idx >= 0 && idx < STEPS.length - 1) {
      alterarStatusM.mutate({ id, novoStatus: STEPS[idx + 1] });
    }
  }

  const rows = encomendasQ.data || [];
  const pendentesCount = dashQ.data?.encomendas_pendentes ?? 0;
  const atrasadasCount = dashQ.data?.encomendas_atrasadas ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Encomendas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acompanhe os pedidos personalizados e prazos de entrega
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" /> Nova Encomenda
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-subtle">
          <div className="text-xs font-medium text-muted-foreground">Em Andamento</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{pendentesCount}</div>
        </div>
        <div className="rounded-2xl border border-warning/20 bg-warning-light p-4 shadow-subtle">
          <div className="text-xs font-medium text-warning">Atrasadas</div>
          <div className="mt-1 text-2xl font-bold text-warning">{atrasadasCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Qualquer Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos</SelectItem>
            <SelectItem value="pedido">Pedido</SelectItem>
            <SelectItem value="producao">Produção</SelectItem>
            <SelectItem value="pronto">Pronto</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Encomendas Cards Grid */}
      {encomendasQ.isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Carregando encomendas…</div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-12 w-12 mb-3 opacity-30" />
          Nenhuma encomenda encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((enc: any) => {
            const isAtrasado =
              enc.data_entrega &&
              new Date(enc.data_entrega).getTime() < new Date().getTime() &&
              enc.status !== "entregue" && enc.status !== "cancelado";
            const stepIdx = STEPS.indexOf(enc.status);
            const progress = enc.status === "cancelado" ? 0 : ((stepIdx + 1) / STEPS.length) * 100;

            return (
              <div
                key={enc.id}
                className={`card-lift rounded-2xl border border-border bg-card shadow-subtle overflow-hidden border-l-4 ${CARD_ACCENTS[enc.status] || ""}`}
              >
                {/* Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-foreground truncate">
                        {enc.cliente_nome}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        #{enc.numero || enc.id}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold flex-shrink-0 ${
                        enc.status === "entregue"
                          ? "bg-success-light text-success"
                          : enc.status === "cancelado"
                            ? "bg-destructive/10 text-destructive"
                            : isAtrasado
                              ? "bg-warning-light text-warning"
                              : "bg-secondary text-foreground"
                      }`}
                    >
                      {isAtrasado && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {LABELS[enc.status] || enc.status}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{enc.descricao}</p>
                </div>

                {/* Progress bar */}
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-1 mb-1.5">
                    {STEPS.map((step, i) => (
                      <div key={step} className="flex items-center flex-1">
                        <div
                          className={`h-1.5 w-full rounded-full transition-colors ${
                            i <= stepIdx && enc.status !== "cancelado"
                              ? STEP_COLORS[enc.status]
                              : "bg-border"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                    <span>Pedido</span>
                    <span>Produção</span>
                    <span>Pronto</span>
                    <span>Entregue</span>
                  </div>
                </div>

                <div className="px-4 pb-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span className={isAtrasado ? "text-warning font-semibold" : ""}>
                        {enc.data_entrega ? fmtDate(enc.data_entrega) : "Sem prazo"}
                        {isAtrasado && " (!)"}
                      </span>
                    </div>
                    <span>Total: {brl(enc.total)}</span>
                  </div>
                  {enc.valor_entrada > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Sinal Pago:</span>
                      <span className="text-success">{brl(enc.valor_entrada)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-display text-sm font-bold text-foreground mt-1 border-t border-border/50 pt-1.5">
                    <span>Restante:</span>
                    <span>{brl(enc.total - (enc.valor_entrada || 0))}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border px-4 py-2.5 flex items-center justify-between gap-1">
                  {STEPS.includes(enc.status) && enc.status !== "entregue" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-primary"
                      onClick={() => avancarStatus(enc.id, enc.status)}
                      disabled={alterarStatusM.isPending}
                    >
                      Avançar <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  ) : enc.status === "entregue" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 bg-success/10 text-success border-success/20 hover:bg-success/20 hover:text-success"
                      onClick={() => setPayModal({ open: true, id: enc.id })}
                    >
                      Gerar Faturamento
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(`${API_BASE_URL}/encomendas/${enc.id}/pdf?token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank")}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => abrirEditar(enc)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Deseja excluir esta encomenda?")) excluirM.mutate(enc.id);
                      }}
                      disabled={excluirM.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <form onSubmit={(e) => { e.preventDefault(); salvarM.mutate(); }}>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Encomenda" : "Nova Encomenda"}</DialogTitle>
              <DialogDescription>Preencha os dados do pedido personalizado.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Cliente *</label>
                <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" autoFocus />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Descrição do Pedido *</label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: 50 Canecas personalizadas" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data de Entrega</label>
                <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Total (R$)</label>
                <Input type="text" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Entrada / Sinal (R$)</label>
                <Input type="text" value={valorEntrada} onChange={(e) => setValorEntrada(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pedido">Pedido</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="pronto">Pronto</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Observações</label>
                <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="(opcional)" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={salvarM.isPending}>Cancelar</Button>
              <Button type="submit" disabled={salvarM.isPending}>
                {salvarM.isPending ? "Salvando…" : editId ? "Salvar" : "Criar Encomenda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal Faturamento */}
      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Faturar Encomenda</DialogTitle>
            <DialogDescription>Selecione a forma de pagamento do restante para gerar a venda.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pagamento</label>
            <Select value={payForma} onValueChange={setPayForma}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credito">Cartão de Crédito</SelectItem>
                <SelectItem value="debito">Cartão de Débito</SelectItem>
                <SelectItem value="fiado">Fiado (A Prazo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, id: null })}>Cancelar</Button>
            <Button disabled={faturarM.isPending} onClick={() => {
              if (payModal.id) faturarM.mutate({ id: payModal.id, forma_pagamento: payForma });
            }}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
