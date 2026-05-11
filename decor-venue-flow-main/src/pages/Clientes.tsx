import { useMemo, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ClienteRow } from "@/lib/api";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Phone, Mail, FileText } from "lucide-react";

function emptyCliente(): Partial<ClienteRow> {
  return { nome: "", telefone: "", email: "", cpf_cnpj: "", endereco: "", obs: "" };
}

export default function ClientesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteRow | null>(null);
  const [form, setForm] = useState<Partial<ClienteRow>>(emptyCliente());

  const clientesQ = useQuery({
    queryKey: ["clientes", q],
    queryFn: () => api.clientes(q),
  });

  const saveM = useMutation({
    mutationFn: async () => {
      if (!form.nome?.trim()) throw new Error("Nome é obrigatório");
      const id = editing?.id;
      return api.salvarCliente(
        {
          nome: form.nome?.trim(),
          telefone: (form.telefone || "").toString(),
          email: (form.email || "").toString(),
          cpf_cnpj: (form.cpf_cnpj || "").toString(),
          endereco: (form.endereco || "").toString(),
          obs: (form.obs || "").toString(),
        },
        id,
      );
    },
    onSuccess: async () => {
      toast.success(editing ? "Cliente atualizado!" : "Cliente criado!");
      setOpen(false);
      setEditing(null);
      setForm(emptyCliente());
      await qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar cliente"),
  });

  const rows = clientesQ.data || [];
  const count = rows.length;

  const { currentData, currentPage, maxPage, next, prev, jump } = usePagination(rows, 12);

  const title = useMemo(() => (editing ? "Editar cliente" : "Novo cliente"), [editing]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Clientes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cadastro e gerenciamento de clientes · {clientesQ.isLoading ? "carregando…" : `${count} encontrado(s)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setForm(emptyCliente());
              setOpen(true);
            }}
          >
            + Novo cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative max-w-sm flex-1">
          <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => clientesQ.refetch()} disabled={clientesQ.isFetching}>
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {clientesQ.isLoading && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            Carregando…
          </div>
        )}
        {clientesQ.isError && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            Erro ao carregar. Verifique se o backend está rodando em <span className="font-mono">localhost:5000</span>.
          </div>
        )}
        {!clientesQ.isLoading && !clientesQ.isError && rows.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
        {currentData.map((c) => (
          <Card key={c.id} className="flex flex-col shadow-subtle hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{c.nome}</CardTitle>
              <CardDescription className="text-xs">{c.cpf_cnpj ? `CPF/CNPJ: ${c.cpf_cnpj}` : "Sem documento registrado"}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
              {c.telefone && (
                <div className="flex items-center text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  {c.telefone}
                </div>
              )}
              {c.email && (
                <div className="flex items-center text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.endereco && (
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4 min-w-4" />
                  <span className="truncate">{c.endereco}</span>
                </div>
              )}
              {c.obs && (
                <div className="flex items-start text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4 min-w-4 mt-0.5" />
                  <span className="line-clamp-2">{c.obs}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEditing(c);
                  setForm(c);
                  setOpen(true);
                }}
              >
                Editar
              </Button>
              {c.telefone && (
                <Button
                  size="sm"
                  className="bg-[#25D366] text-white hover:bg-[#1EBE5D] w-full"
                  onClick={() => window.open(`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`, "_blank")}
                >
                  WhatsApp
                </Button>
              )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Dados básicos do cliente. Campos opcionais podem ficar em branco.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nome *</label>
              <Input value={form.nome || ""} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telefone</label>
              <Input value={form.telefone || ""} onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">CPF/CNPJ</label>
              <Input value={form.cpf_cnpj || ""} onChange={(e) => setForm((p) => ({ ...p, cpf_cnpj: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Endereço</label>
              <Input value={form.endereco || ""} onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))} />
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

