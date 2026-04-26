import sys

file_path = r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\Locacoes.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useEffect for recalc
old_eff = "  const locTotals = useMemo(() => {"
new_eff = """  useEffect(() => {
    if (locItems.length === 0) return;
    const dias = calcDiasLocacao();
    setLocItems(prev => prev.map(it => {
      // Re-calcula dependendo do tipo (item diário vs kit valor fixo)
      // Como não guardamos o tipo do item na array, mas kits têm kit_id e itens têm item_id:
      if (it.item_id) {
        return { ...it, subtotal: it.preco_unitario * it.quantidade * dias };
      } else {
        // Kit é preço fixo por locação (não multiplica por dias na UI atual, ou multiplica? No código anterior era preco*qtd para kit)
        return { ...it, subtotal: it.preco_unitario * it.quantidade };
      }
    }));
  }, [dataRetirada, dataDevolucao]);

  const locTotals = useMemo(() => {"""
content = content.replace(old_eff, new_eff)

# Fiado / data de vencimento UI
old_ui_fiado = """            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
              <Select value={formaPagamento} onValueChange={(v: any) => setFormaPagamento(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
                  <SelectItem value="fiado">Fiado / prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>"""
new_ui_fiado = """            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
              <Select value={formaPagamento} onValueChange={(v: any) => setFormaPagamento(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
                  <SelectItem value="fiado">Fiado / prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formaPagamento === "fiado" && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Vencimento (Fiado)</label>
                <Input type="date" value={obs.match(/Vence em: (.*)/) ? obs.split("Vence em: ")[1] : ""} onChange={(e) => setObs("Vence em: " + e.target.value)} />
              </div>
            )}"""
content = content.replace(old_ui_fiado, new_ui_fiado)

# Form Wrapper
content = content.replace('<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">', '<form onSubmit={(e) => { e.preventDefault(); salvarM.mutate(); }}><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">')
content = content.replace('</DialogContent>', '</form></DialogContent>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Locacoes.tsx updated.")
