import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, VendaRow } from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FiadoPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});
  const [payForma, setPayForma] = useState('dinheiro');

  const dashQ = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
  });

  const fiadoQ = useQuery({
    queryKey: ["fiado", busca],
    queryFn: () => api.vendas({ status: "fiado", q: busca }),
  });

  const formasQ = useQuery({
    queryKey: ["formas_pagamento"],
    queryFn: api.formasPagamento,
  });

  const receberFiadoM = useMutation({
    mutationFn: ({ id, forma_pagamento }: { id: number; forma_pagamento: string }) =>
      api.receberVendaFiado(id, forma_pagamento),
    onSuccess: async () => {
      toast.success("Fiado recebido com sucesso!");
      await qc.invalidateQueries({ queryKey: ["fiado"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: () => toast.error("Erro ao receber fiado"),
  });

  const rows = fiadoQ.data || [];
  const metrics = dashQ.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Contas a Receber</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Contas a receber e pendências de clientes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-subtle">
          <div className="text-xs font-medium text-muted-foreground">Total a Receber (Aberto)</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {metrics ? brl(metrics.fiado_total_valor) : "..."}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {metrics ? `${metrics.fiado_total_count} venda(s)` : ""}
          </div>
        </div>
        <div className="rounded-2xl border border-warning/20 bg-warning-light p-4 shadow-subtle">
          <div className="text-xs font-medium text-warning">Atrasados</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {metrics ? brl(metrics.fiado_atrasado_valor) : "..."}
          </div>
          <div className="mt-1 text-xs text-warning/80">
            {metrics ? `${metrics.fiado_atrasado_count} venda(s) vencida(s)` : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="secondary" onClick={() => fiadoQ.refetch()} disabled={fiadoQ.isFetching}>
          Buscar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venda #</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Total a Pagar</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fiadoQ.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!fiadoQ.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum fiado pendente encontrado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((v: VendaRow) => {
              const isAtrasado = v.data_vencimento && new Date(v.data_vencimento).getTime() < new Date().getTime();
              return (
                <TableRow key={v.id}>
                  <TableCell className="text-muted-foreground">#{v.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{v.cliente_nome || "—"}</TableCell>
                  <TableCell className={isAtrasado ? "text-warning font-medium" : "text-muted-foreground"}>
                    {fmtDate(v.data_vencimento)}
                    {isAtrasado && " (Atrasado)"}
                  </TableCell>
                  <TableCell className="font-medium text-purple">{brl(v.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => setPayModal({ open: true, id: v.id })}
                      disabled={receberFiadoM.isPending}
                    >
                      Receber / Quitar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receber Valor</DialogTitle>
            <DialogDescription>Confirme o recebimento deste valor pendente.</DialogDescription>
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
              if (payModal.id) receberFiadoM.mutate({ id: payModal.id, forma_pagamento: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
