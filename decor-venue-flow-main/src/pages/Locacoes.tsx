import { useMemo, useState, useEffect } from "react";
import { Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, LocacaoRow, API_BASE_URL } from "@/lib/api";
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
    ativo: { label: "Ativo", cls: "bg-cyan-light text-cyan border-cyan/20" },
    devolvido: { label: "Devolvido", cls: "bg-secondary text-muted-foreground" },
    atrasado: { label: "Atrasado", cls: "bg-coral-light text-coral border-coral/20" },
  };
  const v = map[status] || { label: status, cls: "bg-secondary text-muted-foreground" };
  return (
    <Badge className={v.cls} variant="secondary">
      {v.label}
    </Badge>
  );
}

export default function LocacoesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [ini, setIni] = useState("");
  const [fim, setFim] = useState("");

  // Modal (Nova locação / Editar locação)
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [clienteNome, setClienteNome] = useState("");
  const [modalTipo, setModalTipo] = useState<"item" | "kit">("item");
  const [dataRetirada, setDataRetirada] = useState("");
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [obs, setObs] = useState("");
  const [desconto, setDesconto] = useState<number | string>("");
  const [valorEntrada, setValorEntrada] = useState<number | string>("");

  const [locItems, setLocItems] = useState<
    Array<{ nome: string; item_id?: number; kit_id?: number; quantidade: number; preco_unitario: number; subtotal: number }>
  >([]);

  const [selId, setSelId] = useState<number | "">("");
  const [selQtd, setSelQtd] = useState<string>("1");
  const [selPreco, setSelPreco] = useState<string>("");

  const locQ = useQuery({
    queryKey: ["locacoes", status],
    queryFn: () => api.locacoes(status || undefined),
  });

  const formasQ = useQuery({
    queryKey: ["formas_pagamento"],
    queryFn: api.formasPagamento,
  });

  const itensLocQ = useQuery({
    queryKey: ["itens-locacao"],
    queryFn: api.itensLocacao,
    enabled: modalOpen,
  });

  const kitsQ = useQuery({
    queryKey: ["kits"],
    queryFn: api.kits,
    enabled: modalOpen,
  });

  const devolverM = useMutation({
    mutationFn: (id: number) => api.setLocacaoStatus(id, "devolvido"),
    onSuccess: async () => {
      toast.success("Locação devolvida!");
      await qc.invalidateQueries({ queryKey: ["locacoes"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao devolver locação"),
  });

  const excluirM = useMutation({
    mutationFn: (id: number) => api.excluirLocacao(id),
    onSuccess: async () => {
      toast.success("Locação excluída!");
      await qc.invalidateQueries({ queryKey: ["locacoes"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao excluir locação"),
  });

  function calcDiasLocacao() {
    if (dataRetirada && dataDevolucao) {
      const dias = Math.max(1, Math.round((new Date(dataDevolucao).getTime() - new Date(dataRetirada).getTime()) / 86400000));
      return dias;
    }
    return 1;
  }

  function resetModalForm() {
    setEditId(null);
    setClienteNome("");
    setModalTipo("item");
    setDataRetirada("");
    setDataDevolucao("");
    setFormaPagamento("dinheiro");
    setObs("");
    setDesconto("");
    setValorEntrada("");
    setLocItems([]);
    setSelId("");
    setSelQtd("1");
    setSelPreco("");
  }

  async function abrirNova() {
    resetModalForm();
    setModalOpen(true);
  }

  async function abrirEditar(l: LocacaoRow) {
    setEditId(l.id);
    setClienteNome(l.cliente_nome || "");
    setModalTipo((l.tipo as any) === "kit" ? "kit" : "item");
    setDataRetirada(l.data_retirada || "");
    setDataDevolucao(l.data_devolucao || "");
    setFormaPagamento((l as any).forma_pagamento || "dinheiro");
    setObs((l as any).obs || "");
    setDesconto(Number((l as any).desconto || 0));
    setValorEntrada(Number((l as any).valor_entrada || 0));

    try {
      const itens = await api.locacaoItens(l.id);
      setLocItems(
        (itens || []).map((i: any) => ({
          nome: i.nome,
          item_id: i.item_id,
          kit_id: i.kit_id,
          quantidade: Number(i.quantidade || 0),
          preco_unitario: Number(i.preco_unitario || 0),
          subtotal: Number(i.subtotal || 0),
        })),
      );
    } catch {
      toast.error("Erro ao carregar itens da locação");
    }

    setModalOpen(true);
  }

  function adicionarItemModal() {
    const id = selId;
    if (!id) return toast.error("Selecione um item/kit");
    const qtd = parseInputNumber(selQtd);
    const preco = parseInputNumber(selPreco);
    const dias = calcDiasLocacao();
    if (!Number.isFinite(qtd) || qtd <= 0) return toast.error("Quantidade inválida");
    if (!Number.isFinite(preco) || preco < 0) return toast.error("Preço inválido");

    if (modalTipo === "item") {
      const item = (itensLocQ.data || []).find((x: any) => x.id === id);
      if (!item) return toast.error("Item não encontrado");
      const subtotal = preco * qtd * dias;
      setLocItems((prev) => [
        ...prev,
        { nome: item.nome, item_id: item.id, quantidade: qtd, preco_unitario: preco, subtotal },
      ]);
    } else {
      const kit = (kitsQ.data || []).find((x: any) => x.id === id);
      if (!kit) return toast.error("Kit não encontrado");
      const subtotal = preco * qtd;
      setLocItems((prev) => [
        ...prev,
        { nome: kit.nome, kit_id: kit.id, quantidade: qtd, preco_unitario: preco, subtotal },
      ]);
    }
  }

  function removerLocItem(idx: number) {
    setLocItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});
  const [payForma, setPayForma] = useState('pix');
  const converterVendaM = useMutation({
    mutationFn: (data: { id: number; forma: string }) => api.converterLocacaoVenda(data.id, data.forma),
    onSuccess: async (data, variables) => {
      toast.success("Venda gerada no PDV!");
      await qc.invalidateQueries({ queryKey: ["locacoes"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao converter para venda")
  });

  const salvarM = useMutation({
    mutationFn: async () => {
      if (!clienteNome.trim()) throw new Error("Cliente é obrigatório");
      if (locItems.length === 0) throw new Error("Adicione itens à locação");
      const subtotal = locItems.reduce((s, i) => s + (i.subtotal || 0), 0);
      const descVal = parseInputNumber(desconto) || 0;
      const totalVal = Math.max(0, subtotal - descVal);

      const payload = {
        cliente_nome: clienteNome.trim(),
        tipo: modalTipo,
        data_retirada: dataRetirada,
        data_devolucao: dataDevolucao,
        subtotal,
        desconto: descVal,
        total: totalVal,
        valor_entrada: parseInputNumber(valorEntrada) || 0,
        forma_pagamento: formaPagamento,
        obs,
        itens: locItems.map((it) => ({
          nome: it.nome,
          item_id: it.item_id,
          kit_id: it.kit_id,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          subtotal: it.subtotal,
        })),
      };

      return api.salvarLocacao(payload, editId ?? undefined);
    },
    onSuccess: async () => {
      toast.success(editId ? "Locação atualizada!" : "Locação registrada!");
      setModalOpen(false);
      resetModalForm();
      await qc.invalidateQueries({ queryKey: ["locacoes"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar locação"),
  });

  const rows = useMemo(() => {
    const all = locQ.data || [];
    const ql = q.trim().toLowerCase();
    return all.filter((l: LocacaoRow) => {
      if (ql && !(l.cliente_nome || "").toLowerCase().includes(ql)) return false;
      if (ini && l.data_retirada < ini) return false;
      if (fim && l.data_devolucao > fim) return false;
      return true;
    });
  }, [locQ.data, q, ini, fim]);

  useEffect(() => {
    if (locItems.length === 0) return;
    const dias = calcDiasLocacao();
    setLocItems(prev => prev.map(it => {
      if (it.item_id) {
        return { ...it, subtotal: it.preco_unitario * it.quantidade * dias };
      } else {
        return { ...it, subtotal: it.preco_unitario * it.quantidade };
      }
    }));
  }, [dataRetirada, dataDevolucao]);

  const locTotals = useMemo(() => {
    const subtotal = locItems.reduce((s, i) => s + (i.subtotal || 0), 0);
    const descVal = parseInputNumber(desconto) || 0;
    const totalVal = Math.max(0, subtotal - descVal);
    return { subtotal, totalVal };
  }, [locItems, desconto]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Locações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Controle de locações e devoluções · {locQ.isLoading ? "carregando…" : `${rows.length} registro(s)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.open(`${API_BASE_URL}/locacoes/exportar?token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank")}>
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={abrirNova}>
            + Nova locação
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={status === "" ? "default" : "secondary"} onClick={() => setStatus("")}>
          Todas
        </Button>
        <Button variant={status === "ativo" ? "default" : "secondary"} onClick={() => setStatus("ativo")}>
          Ativas
        </Button>
        <Button variant={status === "devolvido" ? "default" : "secondary"} onClick={() => setStatus("devolvido")}>
          Devolvidas
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative max-w-sm flex-1">
          <Input placeholder="Buscar por cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} />
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => locQ.refetch()} disabled={locQ.isFetching}>
          Atualizar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Retirada</TableHead>
              <TableHead>Devolução</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locQ.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {locQ.isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Erro ao carregar locações.
                </TableCell>
              </TableRow>
            )}
            {!locQ.isLoading && !locQ.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhuma locação encontrada.
                </TableCell>
              </TableRow>
            )}
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">#{l.id}</TableCell>
                <TableCell className="font-medium text-foreground">{l.cliente_nome}</TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(l.data_retirada)}</TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(l.data_devolucao)}</TableCell>
                <TableCell className="font-medium text-foreground">{brl(l.total)}</TableCell>
                <TableCell>{statusBadge(l.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    {l.status !== "faturado" ? (
                      <Button size="sm" className="bg-gradient-cool text-primary-foreground" onClick={() => setPayModal({ open: true, id: l.id })}>
                        Faturar Caixa
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(l)}>
                      Editar
                    </Button>
                    {String(l.status) === "ativo" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirm("Confirmar devolução?")) devolverM.mutate(l.id);
                        }}
                        disabled={devolverM.isPending}
                      >
                        Devolver
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => window.open(`${API_BASE_URL}/locacoes/${l.id}/pdf?token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank")}>
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Excluir esta locação?")) excluirM.mutate(l.id);
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

      <Dialog open={modalOpen} onOpenChange={(o) => setModalOpen(o)}>
        <DialogContent className="sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar locação" : "Nova locação"}</DialogTitle>
            <DialogDescription>Crie/edite locações com itens ou kits e salve no backend.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); salvarM.mutate(); }}><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Cliente *</label>
              <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de locação</label>
              <Select value={modalTipo} onValueChange={(v: any) => setModalTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Itens individuais</SelectItem>
                  <SelectItem value="kit">Kit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Data de retirada *</label>
              <Input type="date" value={dataRetirada} onChange={(e) => setDataRetirada(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Data de devolução *</label>
              <Input type="date" value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
              <Select value={formaPagamento} onValueChange={(v: any) => setFormaPagamento(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formasQ.data || []).map((f: any) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Desconto (R$)</label>
              <Input type="text" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">
                Adicionar item/kit — <span className="text-primary font-semibold">{calcDiasLocacao()} dias</span>
              </div>
              <div className="text-xs text-muted-foreground">{locItems.length} item(ns)</div>
            </div>

            {modalTipo === "item" ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Item</label>
                  <Select
                    value={selId ? String(selId) : "none"}
                    onValueChange={(v: any) => {
                      const id = (v === "none" || !v) ? "" : Number(v);
                      setSelId(id);
                      const item = (itensLocQ.data || []).find((x: any) => x.id === id);
                      setSelPreco(String(item?.preco_diaria || 0));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione…</SelectItem>
                      {(itensLocQ.data || []).map((it: any) => (
                        <SelectItem key={it.id} value={String(it.id)}>
                          {it.nome} - {brl(it.preco_diaria || 0)}/dia
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
                  <Input type="text" value={selQtd} onChange={(e) => setSelQtd(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
                  <Input type="text" value={selPreco} onChange={(e) => setSelPreco(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Kit</label>
                  <Select
                    value={selId ? String(selId) : "none"}
                    onValueChange={(v: any) => {
                      const id = (v === "none" || !v) ? "" : Number(v);
                      setSelId(id);
                      const kit = (kitsQ.data || []).find((x: any) => x.id === id);
                      setSelPreco(String(kit?.preco_total || 0));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione…</SelectItem>
                      {(kitsQ.data || []).map((k: any) => (
                        <SelectItem key={k.id} value={String(k.id)}>
                          {k.nome} - {brl(k.preco_total || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
                  <Input type="text" value={selQtd} onChange={(e) => setSelQtd(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
                  <Input type="text" value={selPreco} onChange={(e) => setSelPreco(e.target.value)} />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={adicionarItemModal}>
                + Adicionar
              </Button>
            </div>

            {locItems.length > 0 && (
              <div className="mt-4 space-y-2">
                {locItems.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl bg-secondary/20 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{it.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.quantidade} x {brl(it.preco_unitario)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{brl(it.subtotal)}</div>
                    <Button type="button" size="sm" variant="destructive" onClick={() => removerLocItem(idx)}>
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
              <span className="font-semibold text-foreground">{brl(locTotals.subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium mt-1 text-muted-foreground">
              <span>Sinal / Entrada:</span>
              <div className="flex items-center gap-2 max-w-[150px]">
                <span className="text-muted-foreground">R$</span>
                <Input
                  type="text"
                  className="h-8 w-24 text-right"
                  value={valorEntrada}
                  onChange={(e) => setValorEntrada(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-base font-bold border-t border-border/50 pt-2">
              <span>Restante a Pagar</span>
              <span className="text-primary">{brl(locTotals.totalVal - parseInputNumber(valorEntrada))}</span>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={salvarM.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarM.isPending}>
              {salvarM.isPending ? "Salvando…" : editId ? "Salvar alterações" : "Registrar locação"}
            </Button>
          </DialogFooter>
        </form></DialogContent>
      </Dialog>

      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Faturar Locação (Gerar Venda)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Isso gerará uma Venda no Caixa/PDV correspondente a esta Locação, marcando-a como faturada.</p>
            <div>
              <label className="text-sm font-medium mb-1 block">Forma de Pagamento Base</label>
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
              if (payModal.id) converterVendaM.mutate({ id: payModal.id, forma: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

