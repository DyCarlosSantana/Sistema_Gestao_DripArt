import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePagination } from "@/hooks/use-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function UsuariosTab({ usuarios, cargos: cargosInicial }: { usuarios: any[]; cargos: any[] }) {
  const qc = useQueryClient();
  // Query interna para reagir imediatamente à criação/exclusão de cargos
  const { data: cargosData } = useQuery({ queryKey: ["cargos"], queryFn: api.cargos });
  const cargos = cargosData ?? cargosInicial;
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ nome: "", email: "", role: "operador", senha: "", cargo_id: "" });
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ senha_atual: "", nova_senha: "" });

  const { currentData, currentPage, maxPage, next, prev } = usePagination(usuarios, 10);

  const saveM = useMutation({
    mutationFn: (data: any) => editId ? api.editarUsuario(editId, data) : api.salvarUsuario(data),
    onSuccess: () => { showToast.success(editId ? "Usuário atualizado!" : "Usuário criado!"); setOpen(false); setEditId(null); qc.invalidateQueries({ queryKey: ["usuarios"] }); },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro"),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.excluirUsuario(id),
    onSuccess: () => { showToast.success("Usuário removido."); qc.invalidateQueries({ queryKey: ["usuarios"] }); },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao remover"),
  });

  const senhaM = useMutation({
    mutationFn: () => api.alterarMinhaSenha(senhaForm.senha_atual, senhaForm.nova_senha),
    onSuccess: () => { showToast.success("Senha alterada!"); setSenhaOpen(false); setSenhaForm({ senha_atual: "", nova_senha: "" }); },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao alterar senha"),
  });

  const openNew = () => { setEditId(null); setForm({ nome: "", email: "", role: "operador", senha: "", cargo_id: "" }); setOpen(true); };
  const openEdit = (u: any) => { setEditId(u.id); setForm({ nome: u.nome, email: u.email, role: u.role, cargo_id: u.cargo_id || "", senha: "" }); setOpen(true); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div><CardTitle>Usuários</CardTitle><CardDescription>Gerencie quem acessa o sistema.</CardDescription></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSenhaOpen(true)}>Minha Senha</Button>
            <Button size="sm" onClick={openNew}>Novo Usuário</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {currentData.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{(u.nome || "?")[0].toUpperCase()}</div>
                      <div><div className="font-medium">{u.nome}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{u.cargo_id && cargos.find((c: any) => c.id === u.cargo_id) ? cargos.find((c: any) => c.id === u.cargo_id).nome : u.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("Remover usuario?")) deleteM.mutate(u.id); }}>Excluir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {maxPage > 1 && (
            <Pagination className="mt-6">
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
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Nível</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="operador">Operador</option><option value="gerente">Gerente</option><option value="admin">Administrador</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Cargo Customizado</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.cargo_id || ""} onChange={(e) => setForm({ ...form, cargo_id: e.target.value ? Number(e.target.value) : "" })}>
                <option value="">Nenhum (Usa Nível)</option>
                {cargos.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {!editId && <Input placeholder="Senha (padrão 123456)" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />}
          </div>
          <DialogFooter><Button onClick={() => saveM.mutate(form)} disabled={saveM.isPending}>{saveM.isPending ? "Salvando..." : editId ? "Salvar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog minha senha */}
      <Dialog open={senhaOpen} onOpenChange={setSenhaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Minha Senha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Senha atual" type="password" value={senhaForm.senha_atual} onChange={(e) => setSenhaForm({ ...senhaForm, senha_atual: e.target.value })} />
            <Input placeholder="Nova senha" type="password" value={senhaForm.nova_senha} onChange={(e) => setSenhaForm({ ...senhaForm, nova_senha: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={() => senhaM.mutate()} disabled={senhaM.isPending}>{senhaM.isPending ? "Alterando..." : "Alterar Senha"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
