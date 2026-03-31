import sys

file_path = r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\Calculadora.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add qAcabamentos
old_q = "  const [modalMatOpen, setModalMatOpen] = useState(false);"
new_q = """  const [qAcabamentos, setQAcabamentos] = useState("");
  const filteredAcabamentos = useMemo(() => {
    const all = acabamentosQ.data || [];
    const ql = qAcabamentos.trim().toLowerCase();
    if (!ql) return all;
    return all.filter((a: any) => (a.nome || "").toLowerCase().includes(ql));
  }, [acabamentosQ.data, qAcabamentos]);

  const [modalMatOpen, setModalMatOpen] = useState(false);"""
content = content.replace(old_q, new_q)

# Insert Inputs for Materiais Table
old_mat_table_hd = """      <div className="rounded-2xl border border-border bg-card p-2">
        <div className="flex items-center justify-between p-2">
          <h2 className="font-semibold text-foreground">Materiais</h2>
          <Button variant="outline" size="sm" onClick={abrirNovoMaterial}>+ Novo material</Button>
        </div>"""
new_mat_table_hd = """      <div className="rounded-2xl border border-border bg-card p-2">
        <div className="flex flex-wrap items-center justify-between p-2 gap-3">
          <div className="font-semibold text-foreground">Materiais</div>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar material…" value={qMateriais} onChange={(e) => setQMateriais(e.target.value)} className="w-[200px]" />
            <Button variant="outline" size="sm" onClick={abrirNovoMaterial}>+ Novo material</Button>
          </div>
        </div>"""
content = content.replace(old_mat_table_hd, new_mat_table_hd)

# Update map iterator
content = content.replace("{(materiaisQ.isLoading ? [] : (materiaisQ.data || [])).map((m: any) => (", "{(materiaisQ.isLoading ? [] : filteredMateriais).map((m: any) => (")

# Insert Inputs for Acabamentos Table
old_acb_table_hd = """      <div className="rounded-2xl border border-border bg-card p-2 mt-6">
        <div className="flex items-center justify-between p-2">
          <h2 className="font-semibold text-foreground">Acabamentos</h2>
          <Button variant="outline" size="sm" onClick={abrirNovoAcabamento}>+ Novo acabamento</Button>
        </div>"""
new_acb_table_hd = """      <div className="rounded-2xl border border-border bg-card p-2 mt-6">
        <div className="flex flex-wrap items-center justify-between p-2 gap-3">
          <div className="font-semibold text-foreground">Acabamentos</div>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar acabamento…" value={qAcabamentos} onChange={(e) => setQAcabamentos(e.target.value)} className="w-[200px]" />
            <Button variant="outline" size="sm" onClick={abrirNovoAcabamento}>+ Novo acabamento</Button>
          </div>
        </div>"""
content = content.replace(old_acb_table_hd, new_acb_table_hd)

# Update map iterator
content = content.replace("{(acabamentosQ.isLoading ? [] : (acabamentosQ.data || [])).map((a: any) => (", "{(acabamentosQ.isLoading ? [] : filteredAcabamentos).map((a: any) => (")


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Calculadora.tsx missing searches applied.")
