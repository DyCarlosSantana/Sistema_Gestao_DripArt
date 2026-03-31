import re
import os

BASE = r"c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages"

def replace_in_file(filename, replacements):
    path = os.path.join(BASE, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        if callable(old):
            content = old(content)
        else:
            content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Orcamentos.tsx
replace_in_file("Orcamentos.tsx", [
    (
        "  const [modalOpen, setModalOpen] = useState(false);",
        "  const [modalOpen, setModalOpen] = useState(false);\n  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});\n  const [payForma, setPayForma] = useState('pix');"
    ),
    (
        """                        onClick={() => {
                          const forma = prompt("Forma de pagamento:\\ndinheiro / pix / cartao_debito / cartao_credito / fiado", "pix");
                          if (forma === null) return;
                          converterM.mutate({ id: o.id, forma_pagamento: forma || "dinheiro" });
                        }}""",
        """                        onClick={() => setPayModal({ open: true, id: o.id })}"""
    ),
    (
        "</DialogContent>\n      </Dialog>\n    </div>",
        """</DialogContent>
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
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="fiado">Fiado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, id: null })}>Cancelar</Button>
            <Button onClick={() => {
              if (payModal.id) converterM.mutate({ id: payModal.id, forma_pagamento: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>"""
    )
])

# Locacoes.tsx: Add converterVenda logic
# we need to add the mutation and the button, and the modal.
def inject_locacao_deps(c):
    # Import mutation from api
    if "converterLocacaoVenda" not in c:
        pass # It's imported as `api` already, so `api.converterLocacaoVenda` is available!
    
    # Add mutation and state
    state_injection = """  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});
  const [payForma, setPayForma] = useState('pix');
  const converterVendaM = useMutation({
    mutationFn: (data: { id: number; forma: string }) => api.converterLocacaoVenda(data.id, data.forma),
    onSuccess: async () => {
      toast.success("Venda gerada no PDV!");
      await qc.invalidateQueries({ queryKey: ["locacoes"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao converter para venda")
  });
"""
    if "const [payModal, setPayModal]" not in c:
        c = c.replace("  const salvarM = useMutation({", state_injection + "\n  const salvarM = useMutation({")
        
    # Add button to rows
    btn_target = """<div className="inline-flex flex-wrap justify-end gap-2">"""
    btn_injection = """<div className="inline-flex flex-wrap justify-end gap-2">
                    {l.status !== "faturado" ? (
                      <Button size="sm" className="bg-gradient-cool text-primary-foreground" onClick={() => setPayModal({ open: true, id: l.id })}>
                        Faturar Caixa
                      </Button>
                    ) : null}"""
    if "Faturar Caixa" not in c:
        c = c.replace(btn_target, btn_injection)
        
    # Add Dialog at the end
    dialog_target = """</DialogContent>\n      </Dialog>\n    </div>"""
    dialog_injection = """</DialogContent>
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
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="fiado">Fiado</SelectItem>
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
    </div>"""
    if "Faturar Locação" not in c:
        c = c.replace(dialog_target, dialog_injection)
        
    return c

replace_in_file("Locacoes.tsx", [(inject_locacao_deps, None)])

# PDV.tsx
def inject_pdv(c):
    if "const [payModal, setPayModal]" not in c:
        c = c.replace("  const [editId, setEditId] = useState<number | null>(null);", "  const [editId, setEditId] = useState<number | null>(null);\n  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});\n  const [payForma, setPayForma] = useState('dinheiro');")
    
    btn_target = """                        onClick={() => {
                          const forma = prompt("Forma de pagamento para quitar (dinheiro / pix / cartao_debito / cartao_credito):", "dinheiro");
                          if (forma === null) return;
                          quitarFiadoM.mutate({ id: v.id, forma_pagamento: forma || "dinheiro" });
                        }}"""
    c = c.replace(btn_target, """onClick={() => setPayModal({ open: true, id: v.id })}""")
    
    dialog = """</DialogContent>
      </Dialog>

      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Quitar Fiado</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Forma de Pagamento</label>
              <Select value={payForma} onValueChange={setPayForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, id: null })}>Cancelar</Button>
            <Button onClick={() => {
              if (payModal.id) quitarFiadoM.mutate({ id: payModal.id, forma_pagamento: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>"""
    if "Quitar Fiado" not in c:
        c = c.replace("</DialogContent>\n      </Dialog>\n    </div>", dialog)
    return c
    
replace_in_file("PDV.tsx", [(inject_pdv, None)])

# Fiado.tsx
def inject_fiado(c):
    if "const [payModal, setPayModal]" not in c:
        c = c.replace("  const [q, setQ] = useState(\"\");", "  const [q, setQ] = useState(\"\");\n  const [payModal, setPayModal] = useState<{open: boolean; id: number | null}>({open: false, id: null});\n  const [payForma, setPayForma] = useState('dinheiro');")
        
    btn_target = """                        onClick={() => {
                        const forma = window.prompt("Forma de pagamento para quitar (dinheiro / pix / cartao_debito / cartao_credito):", "dinheiro");
                        if (forma === null) return;
                        quitarFiadoM.mutate({ id: v.id, forma_pagamento: forma || "dinheiro" });
                      }}"""
    c = c.replace(btn_target, """onClick={() => setPayModal({ open: true, id: v.id })}""")
    
    dialog = """      <Dialog open={payModal.open} onOpenChange={(v) => { if (!v) setPayModal({ open: false, id: null }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receber Fiado</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Forma de Pagamento</label>
              <Select value={payForma} onValueChange={setPayForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, id: null })}>Cancelar</Button>
            <Button onClick={() => {
              if (payModal.id) quitarFiadoM.mutate({ id: payModal.id, forma_pagamento: payForma });
              setPayModal({ open: false, id: null });
            }}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>"""
    if "Receber Fiado" not in c:
        # Fiado.tsx doesn't have a trailing Dialog, just a div
        c = c.replace("      </div>\n    </div>", "      </div>\n" + dialog)
    return c
    
replace_in_file("Fiado.tsx", [(inject_fiado, None)])

print("Modals fixed successfully!")
