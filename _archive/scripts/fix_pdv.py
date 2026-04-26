import sys

file_path = r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\PDV.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace State
old_state = """  const [items, setItems] = useState<
    Array<{ descricao: string; quantidade: number; preco_unitario: number; subtotal: number }>
  >([]);"""
new_state = """  const [itProdId, setItProdId] = useState<number | "">("");
  const [itServId, setItServId] = useState<number | "">("");
  const [items, setItems] = useState<
    Array<{ descricao: string; quantidade: number; preco_unitario: number; subtotal: number; produto_id?: number | null; servico_id?: number | null }>
  >([]);

  const produtosQ = useQuery({ queryKey: ["produtos"], queryFn: api.produtos, enabled: tipo === "produto" });
  const servicosQ = useQuery({ queryKey: ["servicos"], queryFn: () => api.servicos(), enabled: tipo === "servico" });"""

content = content.replace(old_state, new_state)

# Replace Add Item
old_add = """  function adicionarItem() {
    const desc = itDesc.trim();
    const qtd = Number(itQtd);
    const preco = Number(itPreco);
    if (!desc) return toast.error("Informe a descrição do item");
    if (!Number.isFinite(qtd) || qtd <= 0) return toast.error("Quantidade inválida");
    if (!Number.isFinite(preco) || preco < 0) return toast.error("Valor inválido");

    const subtotal = qtd * preco;
    setItems((prev) => [...prev, { descricao: desc, quantidade: qtd, preco_unitario: preco, subtotal }]);
    setItDesc("");
    setItQtd(1);
    setItPreco(0);
  }"""
new_add = """  function adicionarItem() {
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
  }"""

content = content.replace(old_add, new_add)

# Replace Reset
old_reset = """    setItPreco(0);
    setItems([]);
  }"""
new_reset = """    setItPreco(0);
    setItProdId("");
    setItServId("");
    setItems([]);
  }"""
content = content.replace(old_reset, new_reset)

# Replace Type Input
old_ui = """            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Input value={itDesc} onChange={(e) => setItDesc(e.target.value)} placeholder="Ex: Banner 2x1m" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Qtd</label>
                <Input type="number" value={itQtd} step={0.01} min={0} onChange={(e) => setItQtd(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valor unit.</label>
                <Input type="number" value={itPreco} step={0.01} min={0} onChange={(e) => setItPreco(Number(e.target.value))} />
              </div>
            </div>"""

new_ui = """            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
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
                        setItPreco(Number(s.preco_base || 0));
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
                <Input type="number" value={itQtd} step={0.01} min={0} onChange={(e) => setItQtd(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valor unit.</label>
                <Input type="number" value={itPreco} step={0.01} min={0} onChange={(e) => setItPreco(Number(e.target.value))} />
              </div>
            </div>"""

content = content.replace(old_ui, new_ui)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("PDV.tsx updated.")
