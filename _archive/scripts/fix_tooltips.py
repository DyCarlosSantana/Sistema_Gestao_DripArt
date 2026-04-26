import sys
import os

def patch_file(file_path, var_name):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import Info icon
    if "Info" not in content and "lucide-react" in content:
        content = content.replace('import {', 'import { Info, ', 1)
    
    # Import tooltips
    if "TooltipProvider" not in content and "Tooltip" not in content:
        content = content.replace(
            'import { Button }',
            'import { Button }\nimport { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";\n'
        )

    # Inject Tooltip in table
    # For PDV.tsx: {v.cliente_nome || "—"}
    # For Locacoes.tsx: {l.cliente_nome || "—"}
    # For Orcamentos.tsx: {o.cliente_nome || "—"}
    
    if var_name == "v":
        target = '<TableCell className="font-medium text-foreground">{v.id}</TableCell>'
        replacement = f"""<TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    #{{v.id}}
                    {{v.obs ? (
                      <Tooltip>
                        <TooltipTrigger><Info className="h-4 w-4 text-primary opacity-50 hover:opacity-100 transition-opacity" /></TooltipTrigger>
                        <TooltipContent side="right"><p className="max-w-xs">{'{v.obs}'}</p></TooltipContent>
                      </Tooltip>
                    ) : null}}
                  </div>
                </TableCell>"""
        content = content.replace(target, replacement)
        
    elif var_name == "l":
        target = '<TableCell className="font-medium text-foreground">{l.cliente_nome || "—"}</TableCell>'
        replacement = f"""<TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {{l.cliente_nome || "—"}}
                    {{l.obs ? (
                      <Tooltip>
                        <TooltipTrigger><Info className="h-4 w-4 text-primary opacity-50 hover:opacity-100 transition-opacity" /></TooltipTrigger>
                        <TooltipContent side="right"><p className="max-w-xs">{'{l.obs}'}</p></TooltipContent>
                      </Tooltip>
                    ) : null}}
                  </div>
                </TableCell>"""
        content = content.replace(target, replacement)
        
    elif var_name == "o":
        target = '<TableCell className="text-muted-foreground">{o.cliente_nome || "—"}</TableCell>'
        replacement = f"""<TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {{o.cliente_nome || "—"}}
                    {{o.obs ? (
                      <Tooltip>
                        <TooltipTrigger><Info className="h-4 w-4 text-primary opacity-50 hover:opacity-100 transition-opacity" /></TooltipTrigger>
                        <TooltipContent side="right"><p className="max-w-xs">{'{o.obs}'}</p></TooltipContent>
                      </Tooltip>
                    ) : null}}
                  </div>
                </TableCell>"""
        content = content.replace(target, replacement)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"{os.path.basename(file_path)} tooltips updated.")

patch_file(r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\PDV.tsx', "v")
patch_file(r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\Locacoes.tsx', "l")
patch_file(r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\decor-venue-flow-main\src\pages\Orcamentos.tsx', "o")
