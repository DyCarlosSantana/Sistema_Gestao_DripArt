import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCalcStore } from "@/store/calcStore";
import { Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL, type OrcamentoRow } from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { parseInputNumber } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    aberto: { label: "Aberto", cls: "bg-info-light text-info border-info/20" },
    aprovado: { label: "Aprovado", cls: "bg-success-light text-success border-success/20" },
    recusado: { label: "Recusado", cls: "bg-coral-light text-coral border-coral/20" },
    cancelado: { label: "Cancelado", cls: "bg-secondary text-muted-foreground" },
  };
  const v = map[status] || { label: status, cls: "bg-secondary text-muted-foreground" };
  return (
    <Badge className={v.cls} variant="secondary">
      {v.label}
    </Badge>
  );
}

export default function OrcamentosPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<string>("");

  // Modal (Novo / Editar orçamento)
  const [modalOpen, setModalOpen] = useState(false);
  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});
  const [payForma, setPayForma] = useState("dinheiro");
  const [confirmModal, setConfirmModal] = useState<{open: boolean, type: 'excluir' | 'locacao' | null, id: number | null}>({open: false, type: null, id: null});
  const [editId, setEditId] = useState<number | null>(null);

  const [clienteNome, setClienteNome] = useState("");
  const [obs, setObs] = useState("");
  const [desconto, setDesconto] = useState<string>("");
  const [valorEntrada, setValorEntrada] = useState<string>("");
  const navigate = useNavigate();

  const [itDesc, setItDesc] = useState("");
  const [itQtd, setItQtd] = useState<string>("1");
  const [itPreco, setItPreco] = useState<string>("");
  const [tipo, setTipo] = useState("produto");
  const [items, setItems] = useState<Array<{ descricao: string; quantidade: number; preco_unitario: number; subtotal: number }>>([]);

  const produtosQ = useQuery({ queryKey: ["produtos"], queryFn: api.produtos });
  const servicosQ = useQuery({ queryKey: ["servicos"], queryFn: () => api.servicos() });
  const itensLocQ = useQuery({ queryKey: ["itens-locacao"], queryFn: api.itensLocacao });
  const kitsQ = useQuery({ queryKey: ["kits"], queryFn: api.kits });

  const orcQ = useQuery({
    queryKey: ["orcamentos"],
    queryFn: api.orcamentos,
  });

  const formasQ = useQuery({
    queryKey: ["formas_pagamento"],
    queryFn: api.formasPagamento,
  });

  const aprovarM = useMutation({
    mutationFn: (id: number) => api.setOrcamentoStatus(id, "aprovado"),
    onSuccess: async () => {
      toast.success("Orçamento aprovado!");
      await qc.invalidateQueries({ queryKey: ["orcamentos"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao aprovar orçamento"),
  });

  const excluirM = useMutation({
    mutationFn: (id: number) => api.excluirOrcamento(id),
    onSuccess: async () => {
      toast.success("Orçamento excluído!");
      await qc.invalidateQueries({ queryKey: ["orcamentos"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao excluir orçamento"),
  });

  const converterM = useMutation({
    mutationFn: ({ id, forma_pagamento }: { id: number; forma_pagamento: string }) =>
      api.converterOrcamentoVenda(id, forma_pagamento),
    onSuccess: async (d: any, variables) => {
      toast.success(`Venda #${d?.venda?.id ?? ""} criada!`);
      await qc.invalidateQueries({ queryKey: ["orcamentos"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["vendas"] });
      if (variables.forma_pagamento === "fiado") {
        navigate("/fiado");
      }
    },
    onError: () => toast.error("Erro ao converter orçamento"),
  });

  const { itemsToAdd, clearCart } = useCalcStore();

  useEffect(() => {
    if (itemsToAdd.length > 0) {
      setItems((prev) => [...prev, ...itemsToAdd.map(i => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        subtotal: i.subtotal,
      }))]);
      setModalOpen(true);
      clearCart();
    }
  }, [itemsToAdd, clearCart]);

  const calcTotals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
    const descVal = parseInputNumber(desconto);
    const totalVal = Math.max(0, subtotal - descVal);
    return { subtotal, totalVal };
  }, [items, desconto]);

  function resetForm() {
    setEditId(null);
    setClienteNome("");
    setObs("");
    setDesconto("");
    setValorEntrada("");
    setItDesc("");
    setItQtd("1");
    setItPreco("");
    setItems([]);
  }

  function abrirNovo() {
    resetForm();
    setModalOpen(true);
  }

  async function abrirEditar(o: OrcamentoRow) {
    setEditId(o.id);
    setClienteNome(o.cliente_nome || "");
    setObs((o as any).obs || "");
    setDesconto(String((o as any).desconto || ""));
    setValorEntrada(String((o as any).valor_entrada || ""));

    try {
      const itens = await api.orcamentoItens(o.id);
      setItems(
        (itens || []).map((i: any) => ({
          descricao: i.descricao,
          quantidade: Number(i.quantidade || 0),
          preco_unitario: Number(i.preco_unitario || 0),
          subtotal: Number(i.subtotal || 0),
        })),
      );
    } catch {
      toast.error("Erro ao carregar itens do orçamento");
    }

    setModalOpen(true);
  }

  function adicionarItem() {
    const desc = itDesc.trim();
    const qtd = parseInputNumber(itQtd);
    const preco = parseInputNumber(itPreco);
    if (!desc) return toast.error("Informe a descrição do item");
    if (!Number.isFinite(qtd) || qtd <= 0) return toast.error("Quantidade inválida");
    if (!Number.isFinite(preco) || preco < 0) return toast.error("Valor inválido");

    const subtotal = qtd * preco;
    setItems((prev) => [...prev, { descricao: desc, quantidade: qtd, preco_unitario: preco, subtotal }]);
    setItDesc("");
    setItQtd("1");
    setItPreco("");
  }

  function removerItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const salvarM = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Adicione ao menos um item");
      const payload = {
        cliente_nome: clienteNome.trim(),
        subtotal: calcTotals.subtotal,
        desconto: parseInputNumber(desconto),
        total: calcTotals.totalVal,
        valor_entrada: parseInputNumber(valorEntrada),
        obs,
        itens: items,
      };
      return api.salvarOrcamento(payload, editId ?? undefined);
    },
    onSuccess: async () => {
      toast.success(editId ? "Orçamento atualizado!" : "Orçamento criado!");
      setModalOpen(false);
      resetForm();
      await qc.invalidateQueries({ queryKey: ["orcamentos"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar orçamento"),
  });

  const converterLocacaoM = useMutation({
    mutationFn: (id: number) => api.converterOrcamentoLocacao(id),
    onSuccess: async () => {
      toast.success("Convertido para Locação com sucesso!");
      await qc.invalidateQueries({ queryKey: ["orcamentos"] });
      await qc.invalidateQueries({ queryKey: ["locacoes"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao converter para locação"),
  });

  const rows = useMemo(() => {
    const all = orcQ.data || [];
    const ql = q.trim().toLowerCase();
    return all.filter((o: OrcamentoRow) => {
      if (ql && !(o.cliente_nome || "").toLowerCase().includes(ql) && !(o.numero || "").toLowerCase().includes(ql)) return false;
      if (st && o.status !== st) return false;
      return true;
    });
  }, [orcQ.data, q, st]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Orçamentos, aprovações e conversões em venda · {orcQ.isLoading ? "carregando…" : `${rows.length} registro(s)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={abrirNovo}>
            + Novo orçamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative max-w-sm flex-1">
          <Input placeholder="Buscar por cliente ou número…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={st || "all"} onValueChange={(v: any) => setSt(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="recusado">Recusados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => orcQ.refetch()} disabled={orcQ.isFetching}>
          Atualizar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcQ.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {orcQ.isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Erro ao carregar orçamentos.
                </TableCell>
              </TableRow>
            )}
            {!orcQ.isLoading && !orcQ.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum orçamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium text-foreground">{o.numero}</TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {o.cliente_nome || "—"}
                    {o.obs ? (
                      <Tooltip>
                        <TooltipTrigger><Info className="h-4 w-4 text-primary opacity-50 hover:opacity-100 transition-opacity" /></TooltipTrigger>
                        <TooltipContent side="right"><p className="max-w-xs">{o.obs}</p></TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(o.validade)}</TableCell>
                <TableCell className="font-medium text-foreground">
                  <div>{brl(o.total)}</div>
                  {(o as any).valor_entrada > 0 && (
                    <div className="text-xs text-muted-foreground font-normal">
                      Restante: {brl(o.total - ((o as any).valor_entrada || 0))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.open(`${API_BASE_URL}/orcamentos/${o.id}/pdf?token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank")}>
                      PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(o)}>
                      Editar
                    </Button>
                    {o.status === "aberto" ? (
                      <Button
                        size="sm"
                        onClick={() => aprovarM.mutate(o.id)}
                        disabled={aprovarM.isPending}
                      >
                        Aprovar
                      </Button>
                    ) : null}
                    {o.status === "aprovado" ? (
                      <Button
                        size="sm"
                        className="bg-gradient-cool text-primary-foreground hover:opacity-90"
                        onClick={() => setPayModal({ open: true, id: o.id })}
                        disabled={converterM.isPending}
                      >
                        Gerar venda
                      </Button>
                    ) : null}
                    {o.status === "aprovado" ? (
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:opacity-90"
                        onClick={() => setConfirmModal({ open: true, type: 'locacao', id: o.id })}
                        disabled={converterLocacaoM.isPending}
                      >
                        Gerar locação
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmModal({ open: true, type: 'excluir', id: o.id })}
                      disabled={excluirM.isPending}
                    >
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={(o) => setModalOpen(o)}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
            <DialogDescription>Crie/edite itens, aplique desconto e salve no backend.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Cliente (opcional)</label>
              <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">Itens do orçamento</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="sm:col-span-4">
                  <div className="mb-2 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="produto" checked={tipo === "produto"} onChange={() => { setTipo("produto"); setItDesc(""); setItPreco(""); }} /> Produto</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="servico" checked={tipo === "servico"} onChange={() => { setTipo("servico"); setItDesc(""); setItPreco(""); }} /> Serviço</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="locacao_item" checked={tipo === "locacao_item"} onChange={() => { setTipo("locacao_item"); setItDesc(""); setItPreco(""); }} /> Item (Aluguel)</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="locacao_kit" checked={tipo === "locacao_kit"} onChange={() => { setTipo("locacao_kit"); setItDesc(""); setItPreco(""); }} /> Kit (Aluguel)</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="diverso" checked={tipo === "diverso"} onChange={() => { setTipo("diverso"); setItDesc(""); setItPreco(""); }} /> Diverso</label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  {tipo === "produto" ? (
                    <>
                      <label className="text-xs font-medium text-muted-foreground">Produto *</label>
                      <Select value={itDesc} onValueChange={(v) => {
                        setItDesc(v);
                        const p = (produtosQ.data || []).find((x: any) => x.nome === v);
                        if (p) { setItPreco(String(p.preco_venda || 0)); }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                        <SelectContent>
                          {(produtosQ.data || []).map((p: any) => (
                            <SelectItem key={p.id} value={p.nome}>{p.nome} (Est: {p.estoque})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : tipo === "servico" ? (
                    <>
                      <label className="text-xs font-medium text-muted-foreground">Serviço *</label>
                      <Select value={itDesc} onValueChange={(v) => {
                        setItDesc(v);
                        const s = (servicosQ.data || []).find((x: any) => x.nome === v);
                        if (s) { setItPreco(String(s.preco || 0)); }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione o serviço..." /></SelectTrigger>
                        <SelectContent>
                          {(servicosQ.data || []).map((s: any) => (
                            <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : tipo === "locacao_item" ? (
                    <>
                      <label className="text-xs font-medium text-muted-foreground">Item de Locação *</label>
                      <Select value={itDesc} onValueChange={(v) => {
                        setItDesc(v);
                        const i = (itensLocQ.data || []).find((x: any) => x.nome === v);
                        if (i) { setItPreco(String(i.preco_diaria || 0)); }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione o item..." /></SelectTrigger>
                        <SelectContent>
                          {(itensLocQ.data || []).map((i: any) => (
                            <SelectItem key={i.id} value={i.nome}>{i.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : tipo === "locacao_kit" ? (
                    <>
                      <label className="text-xs font-medium text-muted-foreground">Kit de Locação *</label>
                      <Select value={itDesc} onValueChange={(v) => {
                        setItDesc(v);
                        const k = (kitsQ.data || []).find((x: any) => x.nome === v);
                        if (k) { setItPreco(String(k.preco_total || 0)); }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione o kit..." /></SelectTrigger>
                        <SelectContent>
                          {(kitsQ.data || []).map((k: any) => (
                            <SelectItem key={k.id} value={k.nome}>{k.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                      <Input value={itDesc} onChange={(e) => setItDesc(e.target.value)} placeholder="Ex: Banner 2x1m" />
                    </>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Qtd *</label>
                  <Input type="text" value={itQtd} onChange={(e) => setItQtd(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Valor un. *</label>
                  <Input type="text" value={itPreco} onChange={(e) => setItPreco(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={adicionarItem} disabled={salvarM.isPending}>
                  + Adicionar
                </Button>
              </div>

              {items.length > 0 && (
                <div className="mt-4 space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-xl bg-secondary/20 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{it.descricao}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.quantidade} x {brl(it.preco_unitario)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-foreground">{brl(it.subtotal)}</div>
                      <Button size="sm" variant="destructive" onClick={() => removerItem(idx)} disabled={salvarM.isPending}>
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{brl(calcTotals.subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Desconto (R$)</span>
                <Input
                  type="text"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="text-right max-w-[120px]"
                />
              </div>

              <div className="flex justify-between items-center text-sm mt-3">
                <span className="text-muted-foreground">Sinal / Entrada (R$)</span>
                <Input
                  type="text"
                  value={valorEntrada}
                  onChange={(e) => setValorEntrada(e.target.value)}
                  className="text-right max-w-[120px]"
                />
              </div>

              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-base font-bold">
                <span>Restante a Pagar</span>
                <span className="text-primary">{brl(calcTotals.totalVal - parseInputNumber(valorEntrada))}</span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={salvarM.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => salvarM.mutate()} disabled={salvarM.isPending}>
              {salvarM.isPending ? "Salvando…" : editId ? "Salvar alterações" : "Salvar orçamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Gerar Venda (Caixa)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Forma de Pagamento</label>
              <Select value={payForma} onValueChange={setPayForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(formasQ.data || []).map((f: any) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, id: null })}>Cancelar</Button>
            <Button onClick={() => {
              if (payModal.id) converterM.mutate({ id: payModal.id, forma_pagamento: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModal.open} onOpenChange={(v) => { if (!v) setConfirmModal({ open: false, type: null, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {confirmModal.type === 'locacao' ? 'Gerar Locação' : 'Excluir Orçamento'}
            </DialogTitle>
            <DialogDescription>
              {confirmModal.type === 'locacao' ? 'Deseja gerar uma nova locação a partir deste orçamento aprovado?' : 'Tem certeza que deseja excluir esse orçamento? Esta ação não pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmModal({ open: false, type: null, id: null })}>
              Cancelar
            </Button>
            <Button 
              variant={confirmModal.type === 'excluir' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmModal.id) {
                   if (confirmModal.type === 'locacao') converterLocacaoM.mutate(confirmModal.id);
                   else if (confirmModal.type === 'excluir') excluirM.mutate(confirmModal.id);
                }
                setConfirmModal({ open: false, type: null, id: null });
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

