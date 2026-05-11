import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type DespesaRow } from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Removed static catLabels

function emptyDespesa(): Partial<DespesaRow> {
  const hoje = new Date().toISOString().slice(0, 10);
  return { data: hoje, descricao: "", categoria: "geral", valor: "" as any, forma_pagamento: "dinheiro", obs: "" };
}

export default function DespesasPage() {
  const qc = useQueryClient();
  const hoje = new Date();
  const iniPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fimPadrao = hoje.toISOString().slice(0, 10);
  const [ini, setIni] = useState(iniPadrao);
  const [fim, setFim] = useState(fimPadrao);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DespesaRow | null>(null);
  const [form, setForm] = useState<Partial<DespesaRow>>(emptyDespesa());

  const despQ = useQuery({
    queryKey: ["despesas", ini, fim],
    queryFn: () => api.despesas({ data_ini: ini, data_fim: fim }),
  });

  const categQ = useQuery({
    queryKey: ["categorias_despesa"],
    queryFn: api.categoriasDespesa,
  });

  const formasQ = useQuery({
    queryKey: ["formas_pagamento"],
    queryFn: api.formasPagamento,
  });

  const saveM = useMutation({
    mutationFn: async () => {
      if (!form.descricao?.trim()) throw new Error("Descrição é obrigatória");
      const valor = parseInputNumber(form.valor as any);
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Valor inválido");
      const payload = {
        data: form.data || new Date().toISOString().slice(0, 10),
        descricao: form.descricao?.trim(),
        valor,
        categoria: form.categoria || "geral",
        forma_pagamento: form.forma_pagamento || "dinheiro",
        obs: form.obs || "",
      };
      return api.salvarDespesa(payload, editing?.id);
    },
    onSuccess: async () => {
      toast.success(editing ? "Despesa atualizada!" : "Despesa registrada!");
      setOpen(false);
      setEditing(null);
      setForm(emptyDespesa());
      await qc.invalidateQueries({ queryKey: ["despesas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar despesa"),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.excluirDespesa(id),
    onSuccess: async () => {
      toast.success("Despesa excluída!");
      await qc.invalidateQueries({ queryKey: ["despesas"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao excluir despesa"),
  });

  const rows = despQ.data || [];
  const total = useMemo(() => rows.reduce((s, d) => s + (d.valor || 0), 0), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Despesas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Saídas do período · {despQ.isLoading ? "carregando…" : `${rows.length} lançamentos · Total ${brl(total)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setForm(emptyDespesa());
              setOpen(true);
            }}
          >
            + Nova despesa
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
        <Button variant="secondary" onClick={() => despQ.refetch()} disabled={despQ.isFetching}>
          Filtrar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {despQ.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {despQ.isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Erro ao carregar despesas.
                </TableCell>
              </TableRow>
            )}
            {!despQ.isLoading && !despQ.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma despesa no período.
                </TableCell>
              </TableRow>
            )}
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-muted-foreground">{fmtDate(d.data)}</TableCell>
                <TableCell className="font-medium text-foreground">{d.descricao}</TableCell>
                <TableCell>
                  {(() => {
                    const catStr = d.categoria?.toLowerCase() || "";
                    const match = (categQ.data || []).find((c: any) => c.nome.toLowerCase() === catStr || c.nome === d.categoria);
                    if (match && match.cor) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: match.cor }}></div>
                          <span className="text-sm font-medium">{match.nome}</span>
                        </div>
                      );
                    }
                    return <Badge variant="secondary">{d.categoria}</Badge>;
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground">{d.forma_pagamento}</TableCell>
                <TableCell className="font-medium text-coral">- {brl(d.valor)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(d);
                        setForm(d);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Excluir esta despesa?")) deleteM.mutate(d.id);
                      }}
                      disabled={deleteM.isPending}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar despesa" : "Nova despesa"}</DialogTitle>
            <DialogDescription>Registro de saída (despesa) para o financeiro.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <Input type="date" value={form.data || ""} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor *</label>
              <Input
                inputMode="decimal"
                value={form.valor === undefined ? "" : String(form.valor)}
                onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value as any }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
              <Input value={form.descricao || ""} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={(form.categoria as string) || "geral"} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(categQ.data || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.nome}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.cor }}></div>
                        {c.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
              <Select value={(form.forma_pagamento as string) || "dinheiro"} onValueChange={(v) => setForm((p) => ({ ...p, forma_pagamento: v }))}>
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
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <Input value={form.obs || ""} onChange={(e) => setForm((p) => ({ ...p, obs: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saveM.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
              {saveM.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

