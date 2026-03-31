import sys
import os

file_path = r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\Produtos.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Image Icon inside lucide-react imports
if "ImageIcon" not in content and "lucide-react" in content:
    content = content.replace('import {', 'import { ImageIcon, ', 1)
elif "lucide-react" not in content:
    content = content.replace('import { Button }', 'import { Button }\nimport { ImageIcon } from "lucide-react";')

# 2. emptyProduto
content = content.replace(
    'return { nome: "", categoria: "", preco_venda: 0, estoque: 0 };',
    'return { nome: "", categoria: "", preco_venda: 0, estoque: 0, imagem_url: "" };'
)

# 3. Payload
content = content.replace(
    """          categoria: (form.categoria || "").toString(),
          preco_venda: preco,
          estoque: Number.isFinite(estoque) ? Math.trunc(estoque) : 0,""",
    """          categoria: (form.categoria || "").toString(),
          preco_venda: preco,
          estoque: Number.isFinite(estoque) ? Math.trunc(estoque) : 0,
          imagem_url: form.imagem_url || "","""
)

# 4. Table Header
content = content.replace(
    """              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>""",
    """              <TableHead className="w-16">Img</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>"""
)

# 5. Table Body
content = content.replace(
    """              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.categoria || "—"}</TableCell>""",
    """              <TableRow key={p.id}>
                <TableCell>
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt={p.nome} className="w-10 h-10 rounded-md object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-secondary/50 flex items-center justify-center text-muted-foreground"><ImageIcon className="w-4 h-4"/></div>
                  )}
                </TableCell>
                <TableCell className="font-medium text-foreground">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.categoria || "—"}</TableCell>"""
)

# 6. Colspans for loading
content = content.replace('colSpan={5}', 'colSpan={6}')

# 7. Form inputs
form_html_old = """            <div>
              <label className="text-xs font-medium text-muted-foreground">Estoque</label>
              <Input
                inputMode="numeric"
                value={String(form.estoque ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, estoque: Number(e.target.value) }))}
              />
            </div>
          </div>"""

form_html_new = """            <div>
              <label className="text-xs font-medium text-muted-foreground">Estoque</label>
              <Input
                inputMode="numeric"
                value={String(form.estoque ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, estoque: Number(e.target.value) }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">URL da Imagem</label>
              <div className="flex gap-3 mt-1">
                {form.imagem_url ? (
                  <img src={form.imagem_url} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground shrink-0"><ImageIcon className="w-5 h-5"/></div>
                )}
                <Input value={form.imagem_url || ""} onChange={(e) => setForm((p) => ({ ...p, imagem_url: e.target.value }))} placeholder="https://..." className="flex-1" />
              </div>
            </div>
          </div>"""

content = content.replace(form_html_old, form_html_new)

# Enter to submit in form
if "<form onSubmit" not in content:
    content = content.replace(
        "<DialogHeader>",
        """<form onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
          <DialogHeader>"""
    )
    content = content.replace(
        """<Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
              {saveM.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>""",
        """<Button type="submit" disabled={saveM.isPending}>
              {saveM.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>"""
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Produtos.tsx updated.")
