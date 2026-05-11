import { useEffect, useMemo, useState } from "react";
import { useCalcStore } from "@/store/calcStore";
import { Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL, type VendaRow } from "@/lib/api";
import { brl, fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pago: { label: "Pago", cls: "bg-success-light text-success border-success/20" },
    fiado: { label: "Fiado", cls: "bg-warning-light text-warning border-warning/20" },
    cancelado: { label: "Cancelado", cls: "bg-secondary text-muted-foreground" },
  };
  const v = map[status] || { label: status, cls: "bg-secondary text-muted-foreground" };
  return <Badge className={v.cls} variant="secondary">{v.label}</Badge>;
}

export default function PDVPage() {
  const qc = useQueryClient();
  const hoje = new Date();
  const iniPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fimPadrao = hoje.toISOString().slice(0, 10);
  const [ini, setIni] = useState(iniPadrao);
  const [fim, setFim] = useState(fimPadrao);

  // Modal (Nova venda / Editar venda)
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});
  const [payForma, setPayForma] = useState('dinheiro');

  const [clienteNome, setClienteNome] = useState("");
  const [tipo, setTipo] = useState<"impressao" | "produto" | "servico" | "outro">("impressao");
  const [formaPagamento, setFormaPagamento] = useState<string>("dinheiro");
  const [status, setStatus] = useState<string>("pago");
  const [vencimento, setVencimento] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [desconto, setDesconto] = useState<number>(0);

  const [itDesc, setItDesc] = useState<string>("");
  const [itQtd, setItQtd] = useState<number>(1);
  const [itPreco, setItPreco] = useState<number>(0);
  const [itProdId, setItProdId] = useState<number | "">("");
  const [itServId, setItServId] = useState<number | "">("");
  const [items, setItems] = useState<
    Array<{ descricao: string; quantidade: number; preco_unitario: number; subtotal: number; produto_id?: number | null; servico_id?: number | null }>
  >([]);

  const produtosQ = useQuery({ queryKey: ["produtos"], queryFn: api.produtos, enabled: tipo === "produto" });
  const servicosQ = useQuery({ queryKey: ["servicos"], queryFn: () => api.servicos(), enabled: tipo === "servico" });

  const vendasQ = useQuery({
    queryKey: ["vendas", ini, fim],
    queryFn: () => api.vendas({ data_ini: ini, data_fim: fim }),
  });

  const formasQ = useQuery({
    queryKey: ["formas_pagamento"],
    queryFn: api.formasPagamento,
  });

  const excluirM = useMutation({
    mutationFn: (id: number) => api.excluirVenda(id),
    onSuccess: async () => {
      toast.success("Venda excluída!");
      await qc.invalidateQueries({ queryKey: ["vendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao excluir venda"),
  });

  const receberFiadoM = useMutation({
    mutationFn: ({ id, forma_pagamento }: { id: number; forma_pagamento: string }) =>
      api.receberVendaFiado(id, forma_pagamento),
    onSuccess: async () => {
      toast.success("Fiado recebido!");
      await qc.invalidateQueries({ queryKey: ["vendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao receber fiado"),
  });

  const { itemsToAdd, clearCart } = useCalcStore();

  useEffect(() => {
    if (itemsToAdd.length > 0) {
      setItems((prev) => [...prev, ...itemsToAdd.map(i => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        subtotal: i.subtotal,
        produto_id: null,
        servico_id: null,
      }))]);
      setModalOpen(true);
      clearCart();
    }
  }, [itemsToAdd, clearCart]);

  const calcTotals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
    const descVal = Number(desconto) || 0;
    const totalCalc = Math.max(0, subtotal - descVal);
    return { subtotal, total: totalCalc };
  }, [items, desconto]);

  function resetForm() {
    setEditId(null);
    setClienteNome("");
    setTipo("impressao");
    setFormaPagamento("dinheiro");
    setStatus("pago");
    setVencimento("");
    setObs("");
    setDesconto(0);
    setItDesc("");
    setItQtd(1);
    setItPreco(0);
    setItProdId("");
    setItServId("");
    setItems([]);
  }

  async function abrirEditar(v: VendaRow) {
    setEditId(v.id);
    setClienteNome(v.cliente_nome || "");
    setTipo((v.tipo as any) || "impressao");
    setFormaPagamento(v.forma_pagamento || "dinheiro");
    setStatus(v.status || "pago");
    setObs((v as any).obs || "");
    setDesconto(Number((v as any).desconto || 0));
    setVencimento((v as any).data_vencimento ? String((v as any).data_vencimento).slice(0, 10) : "");

    try {
      const itens = await api.vendaItens(v.id);
      setItems(
        (itens || []).map((i: any) => ({
          descricao: i.descricao,
          quantidade: Number(i.quantidade || 0),
          preco_unitario: Number(i.preco_unitario || 0),
          subtotal: Number(i.subtotal || 0),
        })),
      );
    } catch {
      toast.error("Erro ao carregar itens da venda");
    }

    setModalOpen(true);
  }

  function abrirNova() {
    resetForm();
    setModalOpen(true);
  }

  function adicionarItem() {
    const desc = (tipo === "produto" && itProdId) ? itDesc : (tipo === "servico" && itServId) ? itDesc : itDesc.trim();
    const qtd = Number(itQtd);
    const preco = Number(itPreco);
    
    if (tipo === "produto" && !itProdId) return toast.error("Selecione um produto");
    if (tipo === "servico" && !itServId) return toast.error("Selecione um serviço");
    if (!desc) return toast.error("Informe a descrição do item");
    if (!Number.isFinite(qtd) || qtd <= 0) return toast.error("Quantidade inválida");
    if (!Number.isFinite(preco) || preco < 0) return toast.error("Valor inválido");

    const subtotal = qtd * preco;
    setItems((prev) => [...prev, { 
      descricao: desc, 
      quantidade: qtd, 
      preco_unitario: preco, 
      subtotal,
      produto_id: tipo === "produto" ? Number(itProdId) : null,
      servico_id: tipo === "servico" ? Number(itServId) : null
    }]);
    
    setItDesc("");
    setItQtd(1);
    setItPreco(0);
    setItProdId("");
    setItServId("");
  }

  function removerItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const salvarM = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Adicione ao menos um item");
      const subtotal = calcTotals.subtotal;
      const descVal = Number(desconto) || 0;
      const totalVal = Math.max(0, subtotal - descVal);
      const payload = {
        cliente_nome: clienteNome.trim(),
        tipo,
        subtotal,
        desconto: descVal,
        total: totalVal,
        forma_pagamento: formaPagamento,
        status,
        obs,
        data_vencimento: formaPagamento === "fiado" ? (vencimento || null) : null,
        itens: items,
      };
      return api.salvarVenda(payload, editId ?? undefined);
    },
    onSuccess: async () => {
      toast.success(editId ? "Venda atualizada!" : "Venda registrada!");
      setModalOpen(false);
      resetForm();
      await qc.invalidateQueries({ queryKey: ["vendas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar venda"),
  });

  const rows = vendasQ.data || [];
  const totalPagos = useMemo(() => rows.reduce((s, v) => (v.status !== 'fiado' ? s + (v.total || 0) : s), 0), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Caixa / PDV</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vendasQ.isLoading ? "Carregando…" : `${rows.length} venda(s) · Total Pago ${brl(totalPagos)} (Fiados Não Somam no Fechamento)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.open(`${API_BASE_URL}/vendas/exportar?token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank")}>
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={abrirNova}>
            + Nova venda
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
        <Button variant="secondary" onClick={() => vendasQ.refetch()} disabled={vendasQ.isFetching}>
          Filtrar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendasQ.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {vendasQ.isError && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Erro ao carregar vendas. Verifique o backend.
                </TableCell>
              </TableRow>
            )}
            {!vendasQ.isLoading && !vendasQ.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhuma venda encontrada no período.
                </TableCell>
              </TableRow>
            )}
            {rows.map((v: VendaRow) => (
              <TableRow key={v.id} className={v.status === 'fiado' ? "bg-amber-500/10 dark:bg-amber-900/10 border-l-[3px] border-amber-500" : ""}>
                <TableCell className="text-muted-foreground">#{v.id}</TableCell>
                <TableCell className="font-medium text-foreground">
                  {v.cliente_nome || "—"}
                  {v.status === 'fiado' && <span className="ml-2 text-[10px] uppercase font-bold text-amber-500">A Receber</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {v.tipo === 'sinal' ? <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Sinal / Haver</Badge> : v.tipo}
                </TableCell>
                <TableCell className="text-muted-foreground">{v.forma_pagamento}</TableCell>
                <TableCell className="font-medium text-foreground">{brl(v.total)}</TableCell>
                <TableCell>{statusBadge(v.status)}</TableCell>
                <TableCell className="text-muted-foreground">{fmtDateTime(v.criado_em)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(v)}>
                      Editar
                    </Button>
                    {String(v.status) === "fiado" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPayForma("dinheiro");
                          setPayModal({ open: true, id: v.id });
                        }}
                        disabled={receberFiadoM.isPending}
                      >
                        Receber
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => window.open(`${API_BASE_URL}/vendas/${v.id}/pdf?token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank")}>
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Excluir esta venda?")) excluirM.mutate(v.id);
                      }}
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

      <Dialog open={modalOpen} onOpenChange={(o) => { if(!o) setModalOpen(false); else setModalOpen(true); }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={(e) => { e.preventDefault(); salvarM.mutate(); }}>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar venda" : "Nova venda"}</DialogTitle>
            <DialogDescription>Registre uma venda com itens, desconto e (opcional) fiado.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Cliente (opcional)</label>
              <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impressao">Impressão gráfica</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
              <Select value={formaPagamento} onValueChange={(v: any) => setFormaPagamento(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formasQ.data || []).map((f: any) => (
                    <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="fiado">Fiado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formaPagamento === "fiado" && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Data de vencimento</label>
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Itens</div>
              <div className="text-xs text-muted-foreground">{items.length} item(ns)</div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                {tipo === "produto" ? (
                  <>
                    <label className="text-xs font-medium text-muted-foreground">Produto *</label>
                    <Select value={itProdId ? String(itProdId) : "none"} onValueChange={(v) => {
                      const id = v === "none" ? "" : Number(v);
                      setItProdId(id);
                      const p = (produtosQ.data || []).find((x: any) => x.id === id);
                      if (p) {
                        setItDesc(p.nome);
                        setItPreco(Number(p.preco_venda || 0));
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione…</SelectItem>
                        {(produtosQ.data || []).map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.nome} (Est: {p.estoque})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : tipo === "servico" ? (
                  <>
                    <label className="text-xs font-medium text-muted-foreground">Serviço *</label>
                    <Select value={itServId ? String(itServId) : "none"} onValueChange={(v) => {
                      const id = v === "none" ? "" : Number(v);
                      setItServId(id);
                      const s = (servicosQ.data || []).find((x: any) => x.id === id);
                      if (s) {
                        setItDesc(s.nome);
                        setItPreco(Number(s.preco || 0));
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o serviço..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione…</SelectItem>
                        {(servicosQ.data || []).map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
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
                <label className="text-xs font-medium text-muted-foreground">Qtd</label>
                <NumberInput integer value={itQtd} onChange={(v) => setItQtd(v)} placeholder="1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valor unit.</label>
                <CurrencyInput value={itPreco} onChange={(v) => setItPreco(v)} placeholder="0,00" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={adicionarItem} disabled={salvarM.isPending}>
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
                    <Button type="button" size="sm" variant="destructive" onClick={() => removerItem(idx)} disabled={salvarM.isPending}>
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">{brl(calcTotals.subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Desconto (R$)</span>
              <CurrencyInput value={desconto} onChange={(v) => setDesconto(v)} placeholder="0,00" />
            </div>
            <div className="mt-2 flex items-center justify-between text-base font-bold">
              <span>TOTAL</span>
              <span>{brl(calcTotals.total)}</span>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={salvarM.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarM.isPending}>
              {salvarM.isPending ? "Salvando…" : editId ? "Salvar alterações" : "Registrar venda"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receber Valor</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Forma de Pagamento</label>
              <Select value={payForma} onValueChange={setPayForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(formasQ.data || []).map((f: any) => (
                    <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, id: null })}>Cancelar</Button>
            <Button onClick={() => {
              if (payModal.id) receberFiadoM.mutate({ id: payModal.id, forma_pagamento: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

