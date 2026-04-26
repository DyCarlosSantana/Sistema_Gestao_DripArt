import sys
import re

file_path = r'c:\Users\edyca\OneDrive\Documentos\Projetos_GitHub\Projeto_Gestao_DripArt\pdf_generator.py'

# We'll completely replace the repetitive blocks.
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add Image to imports
if 'from reportlab.platypus import Image' not in text:
    text = text.replace(
        "from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable",
        "from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image\nimport urllib.request, ssl\nfrom io import BytesIO"
    )

helper_code = """
def build_header(config, color=None):
    if not color: color = PURPLE
    nome = config.get('empresa_nome', 'DripArt')
    cnpj = f"<b>CNPJ:</b> {config['empresa_cnpj']}<br/>" if config.get('empresa_cnpj') else ""
    endereco = f"{config['empresa_endereco']}<br/>" if config.get('empresa_endereco') else ""
    tel = config.get('empresa_telefone', '')
    whats = f"WA: {config['empresa_whatsapp']}" if config.get('empresa_whatsapp') else ""
    telefone_str = f"{tel} {('| ' + whats) if whats else ''}".strip()
    if telefone_str: telefone_str += "<br/>"
    email = f"<b>E-mail:</b> {config['empresa_email']}<br/>" if config.get('empresa_email') else ""
    insta = f"@{config['empresa_instagram'].replace('@','')}<br/>" if config.get('empresa_instagram') else ""
    site = f"{config['empresa_site']}" if config.get('empresa_site') else ""
    
    right_text = f"{cnpj}{endereco}{telefone_str}{email}{insta}{site}"

    left_content = []
    logo_path = config.get('logo_path', '').strip()
    if logo_path:
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            req = urllib.request.urlopen(logo_path, context=ctx)
            img_data = BytesIO(req.read())
            img = Image(img_data, width=3.5*cm, height=3.5*cm, kind='proportional')
            left_content.append(img)
        except Exception as e:
            pass

    left_content.append(Paragraph(f"<b>{nome}</b>", ParagraphStyle('th', fontSize=22, textColor=color, fontName='Helvetica-Bold')))

    header_data = [[
        left_content,
        Paragraph(right_text, ParagraphStyle('tr', fontSize=9, textColor=TEXT, alignment=TA_RIGHT, leading=13))
    ]]
    
    ht = Table(header_data, colWidths=[9*cm, 8*cm])
    ht.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),15), ('ALIGN', (0,0), (0,0), 'LEFT')]))
    return [ht, HRFlowable(width="100%", thickness=1.5, color=color), Spacer(1, 0.5*cm)]
"""

if "def build_header(config" not in text:
    text = text.replace("def gerar_orcamento_pdf", helper_code + "\ndef gerar_orcamento_pdf")

# Regex to remove old headers
# ORCAMENTO header
orcamento_regex = r"    header_data = \[\[.*?story\.append\(Spacer\(1, 0\.4\*cm\)\)"
text = re.sub(orcamento_regex, "    story.extend(build_header(config))", text, count=0, flags=re.DOTALL)

# VENDA header
venda_regex = r"    # Header igual ao orçamento.*?story\.append\(Spacer\(1, 0\.4\*cm\)\)"
text = re.sub(venda_regex, "    story.extend(build_header(config))", text, count=0, flags=re.DOTALL)

# RELATORIO header
relatorio_regex = r"    header_data = \[\[.*?story\.append\(Spacer\(1, 0\.4\*cm\)\)"
text = re.sub(relatorio_regex, "    story.extend(build_header(config))", text, count=0, flags=re.DOTALL)

# ENCOMENDA header
encomenda_header_regex = r"    # Header\s+hd = \[\[.*?story\.append\(Spacer\(1, 0\.4\*cm\)\)"
text = re.sub(encomenda_header_regex, "    story.extend(build_header(config))", text, count=0, flags=re.DOTALL)

# Update the footer logic to be nicer
old_footer = r"    story\.append\(Paragraph\(\s*f\"[^\"]+\" \+ config\.get\('empresa_nome','DripArt'\)?[^\)]+,\s*ParagraphStyle\('footer', fontSize=7, textColor=GRAY, alignment=TA_CENTER\)\)\s*\)"
new_footer = r"""    story.append(Paragraph(
        f"Documento gerado digitalmente pelo sistema DripArt App em {datetime.datetime.now().strftime('%d/%m/%Y às %H:%M')}",
        ParagraphStyle('footer', fontSize=8, textColor=GRAY, alignment=TA_CENTER)
    ))"""
text = re.sub(r"story\.append\(Paragraph\([\s\S]*?ParagraphStyle\('footer'[\s\S]*?\)\)", r"""story.append(Paragraph(
        f"Documento gerado digitalmente em {datetime.datetime.now().strftime('%d/%m/%Y às %H:%M')} — {config.get('empresa_nome','DripArt')}",
        ParagraphStyle('footer', fontSize=8, textColor=GRAY, alignment=TA_CENTER)
    ))""", text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("pdf_generator headers successfully rewritten!")
