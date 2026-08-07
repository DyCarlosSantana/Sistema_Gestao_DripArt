from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget
import os, datetime, base64
from io import BytesIO
from PIL import Image as PILImage

# --- PALETA PREMIUM ---
BRAND    = colors.HexColor('#E8186D')
BRAND_DK = colors.HexColor('#B01050')
BRAND_LT = colors.HexColor('#FDF2F7')
DARK     = colors.HexColor('#1A1A2E')
GRAY     = colors.HexColor('#6B7280')
GRAY_LT  = colors.HexColor('#F9FAFB')
WHITE    = colors.white

# Estilos Globais
P_H1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=18, textColor=DARK, leading=22)
P_H2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=12, textColor=DARK, leading=16)
P_NOR = ParagraphStyle('NOR', fontName='Helvetica', fontSize=10, textColor=GRAY, leading=14)
P_NOR_B = ParagraphStyle('NOR_B', fontName='Helvetica-Bold', fontSize=10, textColor=DARK, leading=14)
P_TH_L = ParagraphStyle('TH_L', fontName='Helvetica-Bold', fontSize=10, textColor=WHITE, leading=14)
P_TH_C = ParagraphStyle('TH_C', fontName='Helvetica-Bold', fontSize=10, textColor=WHITE, alignment=TA_CENTER)
P_TH_R = ParagraphStyle('TH_R', fontName='Helvetica-Bold', fontSize=10, textColor=WHITE, alignment=TA_RIGHT)
P_R = ParagraphStyle('R', fontName='Helvetica', fontSize=10, textColor=GRAY, alignment=TA_RIGHT)
P_R_B = ParagraphStyle('R_B', fontName='Helvetica-Bold', fontSize=10, textColor=DARK, alignment=TA_RIGHT)
P_CENTER = ParagraphStyle('CENTER', fontName='Helvetica', fontSize=10, textColor=GRAY, alignment=TA_CENTER)
P_BRAND = ParagraphStyle('BRAND', fontName='Helvetica-Bold', fontSize=10, textColor=BRAND, alignment=TA_RIGHT)

def get_base64_image(b64str, width=3*cm, height=3*cm):
    try:
        if "," in b64str: b64str = b64str.split(",")[1]
        img_data = base64.b64decode(b64str)
        img = PILImage.open(BytesIO(img_data))
        aspect = img.width / img.height
        calc_height = width / aspect
        if calc_height > height:
            calc_width = height * aspect
            calc_height = height
        else:
            calc_width = width
        return Image(BytesIO(img_data), width=calc_width, height=calc_height)
    except:
        return None

def criar_cabecalho(config, titulo, doc_ref):
    logo_flow = None
    if config.get('logo'):
        logo_flow = get_base64_image(config['logo'])
    
    endereco = config.get('endereco', '')
    telefone = config.get('telefone', '')
    nome = config.get('nome', 'Sua Empresa')
    cnpj = config.get('cnpj', '')
    
    info_empresa = f"<b>{nome}</b>"
    if cnpj: info_empresa += f"<br/>CNPJ: {cnpj}"
    if telefone: info_empresa += f"<br/>Tel: {telefone}"
    if endereco: info_empresa += f"<br/>{endereco}"

    info_p = Paragraph(info_empresa, P_NOR)
    titulo_p = Paragraph(f"<font size='16'><b>{titulo}</b></font><br/><font size='10' color='#E8186D'>{doc_ref}</font>", P_R_B)

    header_data = [[logo_flow if logo_flow else "", info_p, titulo_p]]
    col_widths = [4*cm, 8.5*cm, 5*cm] if logo_flow else [0.5*cm, 11*cm, 6*cm]
    t = Table(header_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (2,0), (2,0), 'RIGHT'),
    ]))
    return t

def render_qr_code(link):
    qrw = QrCodeWidget(link)
    b = qrw.getBounds()
    w = b[2]-b[0]
    h = b[3]-b[1]
    d = Drawing(w, h, transform=[70/w,0,0,70/h,0,0])
    d.add(qrw)
    return d

def crc16(payload):
    crc = 0xFFFF
    for byte in payload.encode('utf-8'):
        crc ^= byte << 8
        for _ in range(8):
            if (crc & 0x8000):
                crc = (crc << 1) ^ 0x1021
            else:
                crc = crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"

import unicodedata

def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return u"".join([c for c in nfkd_form if not unicodedata.combining(c)])

def build_pix_payload(chave, nome="Recebedor", cidade="Cidade", valor=0, pix_tipo="aleatoria"):
    chave = str(chave).strip()
    if pix_tipo == "telefone":
        import re
        chave = re.sub(r'\D', '', chave)
        if len(chave) in [10, 11]:
            chave = "+55" + chave
    elif pix_tipo == "cpf_cnpj":
        import re
        chave = re.sub(r'\D', '', chave)
        
    nome = remove_accents(str(nome)[:25].strip().upper())
    cidade = remove_accents(str(cidade)[:15].strip().upper())
    if not nome: nome = "RECEBEDOR"
    if not cidade: cidade = "CIDADE"
    merch_acc = f"0014br.gov.bcb.pix01{len(chave):02d}{chave}"
    payload = "000201" + f"26{len(merch_acc):02d}{merch_acc}" + "52040000" + "5303986"
    
    if valor and float(valor) > 0:
        val_str = f"{float(valor):.2f}"
        payload += f"54{len(val_str):02d}{val_str}"
        
    payload += "5802BR" + f"59{len(nome):02d}{nome}" + f"60{len(cidade):02d}{cidade}" + "62070503***" + "6304"
    return payload + crc16(payload)

def adicionar_rodape(story, doc_ref, config, valor=0):
    chave_pix = config.get('chaves_pix')
    pix_tipo = config.get('pix_tipo', 'aleatoria')
    pix_identificador = config.get('pix_identificador')
    pix_instituicao = config.get('pix_instituicao')
    
    if chave_pix:
        try:
            nome_empresa = pix_identificador or config.get('empresa_nome') or config.get('nome') or 'Empresa'
            cidade_empresa = config.get('empresa_cidade') or config.get('cidade') or 'Cidade'
            payload = build_pix_payload(chave_pix, nome_empresa, cidade_empresa, valor, pix_tipo)
            qr_pix = render_qr_code(payload)
            
            info_html = f"<b>Pagamento via PIX</b><br/>Chave: {chave_pix}"
            if pix_identificador:
                info_html += f"<br/>Titular: {pix_identificador}"
            if pix_instituicao:
                info_html += f"<br/>Instituição: {pix_instituicao}"
            info_html += "<br/>Abra o app do seu banco e escaneie o código QR."
            
            t_pix = Table([
                [qr_pix, Paragraph(info_html, P_NOR)]
            ], colWidths=[2.5*cm, 14.9*cm])
        except Exception as e:
            t_pix = Table([
                ["", Paragraph(f"<b>Pagamento via PIX</b><br/>Chave: {chave_pix}<br/><i>(Erro ao gerar QR Code: {str(e)})</i>", P_NOR)]
            ], colWidths=[2.5*cm, 14.9*cm])
    else:
        t_pix = Table([
            ["", Paragraph("<b>Pagamento via PIX</b><br/><i>Chave PIX não configurada nas Configurações da Empresa.</i>", P_NOR)]
        ], colWidths=[2.5*cm, 14.9*cm])

    t_pix.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), GRAY_LT),
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(t_pix)
    story.append(Spacer(1, 10))

def formatar_moeda(valor):
    if valor is None: valor = 0
    return f"R$ {float(valor):,.2f}".replace(',','_').replace('.',',').replace('_','.')

def gerar_orcamento_pdf(orcamento, itens, config):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(out, exist_ok=True)
    fp = os.path.join(out, f"orcamento_{orcamento['numero']}.pdf")
    doc = SimpleDocTemplate(fp, pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.5*cm, bottomMargin=2*cm)

    story = []
    story.append(criar_cabecalho(config, "ORÇAMENTO", orcamento['numero']))
    story.append(Spacer(1, 0.8*cm))

    cli_data = [
        [Paragraph("<b>Dados do Cliente</b>", P_H2)],
        [Paragraph(f"<b>Nome:</b> {orcamento.get('cliente_nome', 'Cliente Padrão')}", P_NOR)],
        [Paragraph(f"<b>Emissão:</b> {datetime.datetime.now().strftime('%d/%m/%Y')} &nbsp;&nbsp;&nbsp; <b>Validade:</b> {orcamento.get('validade', 'N/A')}", P_NOR)]
    ]
    t_cli = Table(cli_data, colWidths=[17.4*cm])
    t_cli.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_LT),
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
    ]))
    story.append(t_cli)
    story.append(Spacer(1, 0.8*cm))

    story.append(Paragraph("<b>Itens do Orçamento</b>", P_H2))
    story.append(Spacer(1, 0.2*cm))
    
    th = [Paragraph('<b>Produto/Serviço</b>', P_TH_L), Paragraph('<b>Qtd</b>', P_TH_C), Paragraph('<b>V. Unit</b>', P_TH_R), Paragraph('<b>Subtotal</b>', P_TH_R)]
    td = [th]
    for i in itens:
        nome = i.get('descricao', i.get('nome', 'Item'))
        qtd = float(i.get('quantidade', 1))
        v = float(i.get('preco_unitario', 0))
        td.append([
            Paragraph(nome, P_NOR),
            Paragraph(str(qtd), P_CENTER),
            Paragraph(formatar_moeda(v), P_R),
            Paragraph(formatar_moeda(qtd*v), P_R_B)
        ])
    
    t_itens = Table(td, colWidths=[9.4*cm, 2*cm, 3*cm, 3*cm])
    t_itens.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, GRAY_LT]),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_itens)
    story.append(Spacer(1, 0.5*cm))

    total = float(orcamento.get('total', 0))
    t_tot = Table([[Paragraph("<b>TOTAL GERAL</b>", P_H2), Paragraph(f"<b>{formatar_moeda(total)}</b>", P_BRAND)]], colWidths=[12.4*cm, 5*cm])
    t_tot.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LINEABOVE', (0,0), (-1,-1), 1, BRAND),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_tot)
    
    obs = orcamento.get('obs') or orcamento.get('observacoes')
    if obs:
        story.append(Spacer(1, 0.8*cm))
        story.append(Paragraph("<b>Observações:</b>", P_H2))
        story.append(Paragraph(obs, P_NOR))

    adicionar_rodape(story, orcamento['numero'], config, total)

    doc.build(story)
    return fp

def gerar_nota_venda_pdf(venda, itens, config):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(out, exist_ok=True)
    fp = os.path.join(out, f"nota_venda_{venda['id']}.pdf")
    doc = SimpleDocTemplate(fp, pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    story = []
    
    doc_ref = f"PDV-{venda['id']:04d}"
    story.append(criar_cabecalho(config, "COMPROVANTE DE VENDA", doc_ref))
    story.append(Spacer(1, 0.8*cm))
    
    cli_data = [
        [Paragraph("<b>Detalhes da Transação</b>", P_H2)],
        [Paragraph(f"<b>Cliente:</b> {venda.get('cliente_nome', 'Avulso')} &nbsp;&nbsp;&nbsp; <b>Data:</b> {str(venda.get('criado_em', ''))[:10]}", P_NOR)],
    ]
    t_cli = Table(cli_data, colWidths=[17.4*cm])
    t_cli.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_LT),
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_cli)
    story.append(Spacer(1, 0.5*cm))
    
    th = [Paragraph('<b>Produto</b>', P_TH_L), Paragraph('<b>Qtd</b>', P_TH_C), Paragraph('<b>V. Unit</b>', P_TH_R), Paragraph('<b>Subtotal</b>', P_TH_R)]
    td = [th]
    for i in itens:
        nome = i.get('descricao', i.get('nome', 'Item'))
        qtd = float(i.get('quantidade', 1))
        v = float(i.get('preco_unitario', 0))
        td.append([
            Paragraph(nome, P_NOR),
            Paragraph(str(qtd), P_CENTER),
            Paragraph(formatar_moeda(v), P_R),
            Paragraph(formatar_moeda(qtd*v), P_R_B)
        ])
    t_itens = Table(td, colWidths=[9.4*cm, 2*cm, 3*cm, 3*cm])
    t_itens.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, GRAY_LT]),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_itens)
    story.append(Spacer(1, 0.5*cm))
    
    total = float(venda.get('total', 0))
    t_tot = Table([[Paragraph("<b>TOTAL</b>", P_H2), Paragraph(f"<b>{formatar_moeda(total)}</b>", P_BRAND)]], colWidths=[12.4*cm, 5*cm])
    t_tot.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LINEABOVE', (0,0), (-1,-1), 1, BRAND),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_tot)

    adicionar_rodape(story, doc_ref, config, total)

    doc.build(story)
    return fp

def gerar_pdf_locacao(locacao, itens, config):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(out, exist_ok=True)
    fp = os.path.join(out, f"locacao_{locacao['id']}.pdf")
    doc = SimpleDocTemplate(fp, pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    story = []
    
    doc_ref = f"LOC-{locacao['id']:04d}"
    story.append(criar_cabecalho(config, "CONTRATO DE LOCAÇÃO", doc_ref))
    story.append(Spacer(1, 0.8*cm))
    
    cli_data = [
        [Paragraph("<b>Dados do Evento</b>", P_H2)],
        [Paragraph(f"<b>Cliente:</b> {locacao.get('cliente_nome', 'Avulso')} &nbsp;&nbsp;&nbsp; <b>Retirada:</b> {locacao.get('data_retirada', '')}", P_NOR)],
        [Paragraph(f"<b>Devolução:</b> {locacao.get('data_devolucao', '')} &nbsp;&nbsp;&nbsp; <b>Forma de Pagto:</b> {locacao.get('forma_pagamento', '')}", P_NOR)]
    ]
    t_cli = Table(cli_data, colWidths=[17.4*cm])
    t_cli.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_LT),
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_cli)
    story.append(Spacer(1, 0.5*cm))
    
    th = [Paragraph('<b>Produto</b>', P_TH_L), Paragraph('<b>Qtd</b>', P_TH_C), Paragraph('<b>V. Unit</b>', P_TH_R), Paragraph('<b>Subtotal</b>', P_TH_R)]
    td = [th]
    for i in itens:
        nome = i.get('nome', i.get('descricao', 'Item'))
        qtd = float(i.get('quantidade', 1))
        v = float(i.get('preco_unitario', 0))
        td.append([
            Paragraph(nome, P_NOR),
            Paragraph(str(qtd), P_CENTER),
            Paragraph(formatar_moeda(v), P_R),
            Paragraph(formatar_moeda(qtd*v), P_R_B)
        ])
    t_itens = Table(td, colWidths=[9.4*cm, 2*cm, 3*cm, 3*cm])
    t_itens.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, GRAY_LT]),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_itens)
    story.append(Spacer(1, 0.5*cm))
    
    total = float(locacao.get('total', 0))
    t_tot = Table([[Paragraph("<b>TOTAL</b>", P_H2), Paragraph(f"<b>{formatar_moeda(total)}</b>", P_BRAND)]], colWidths=[12.4*cm, 5*cm])
    t_tot.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LINEABOVE', (0,0), (-1,-1), 1, BRAND),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_tot)

    adicionar_rodape(story, doc_ref, config, total)

    doc.build(story)
    return fp

def gerar_pdf_encomenda(enc, config):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(out, exist_ok=True)
    fp = os.path.join(out, f"encomenda_{enc['id']}.pdf")
    doc = SimpleDocTemplate(fp, pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    story = []
    
    doc_ref = f"ENC-{enc['id']:04d}"
    story.append(criar_cabecalho(config, "PEDIDO DE ENCOMENDA", doc_ref))
    story.append(Spacer(1, 0.8*cm))
    
    cli_data = [
        [Paragraph("<b>Detalhes da Encomenda</b>", P_H2)],
        [Paragraph(f"<b>Cliente:</b> {enc.get('cliente_nome', 'Avulso')} &nbsp;&nbsp;&nbsp; <b>Data Entrega:</b> {enc.get('data_entrega', '')}", P_NOR)],
        [Paragraph(f"<b>Descrição:</b> {enc.get('descricao', '')}", P_NOR)]
    ]
    t_cli = Table(cli_data, colWidths=[17.4*cm])
    t_cli.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_LT),
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_cli)
    story.append(Spacer(1, 0.5*cm))
    
    total = float(enc.get('total', 0))
    t_tot = Table([[Paragraph("<b>VALOR TOTAL</b>", P_H2), Paragraph(f"<b>{formatar_moeda(total)}</b>", P_BRAND)]], colWidths=[12.4*cm, 5*cm])
    t_tot.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LINEABOVE', (0,0), (-1,-1), 1, BRAND),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_tot)

    adicionar_rodape(story, doc_ref, config, total)

    doc.build(story)
    return fp

def gerar_relatorio_pdf(data_ini, data_fim, vendas, formas, despesas, total_entrada, total_saida, config, vendas_lista=None, locacoes_lista=None, despesas_lista=None):
    if vendas_lista is None: vendas_lista = []
    if locacoes_lista is None: locacoes_lista = []
    if despesas_lista is None: despesas_lista = []
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(out, exist_ok=True)
    fp = os.path.join(out, f"relatorio_{data_ini}_{data_fim}.pdf")
    doc = SimpleDocTemplate(fp, pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    story = []
    
    story.append(criar_cabecalho(config, "RELATÓRIO FINANCEIRO", f"Período: {data_ini} a {data_fim}"))
    story.append(Spacer(1, 0.8*cm))
    
    t_res = Table([
        [Paragraph("<b>Entradas</b>", P_CENTER), Paragraph("<b>Saídas</b>", P_CENTER), Paragraph("<b>Saldo</b>", P_CENTER)],
        [Paragraph(f"<font color='green'>{formatar_moeda(total_entrada)}</font>", P_CENTER),
         Paragraph(f"<font color='red'>{formatar_moeda(total_saida)}</font>", P_CENTER),
         Paragraph(f"<font color='blue'>{formatar_moeda(total_entrada - total_saida)}</font>", P_CENTER)]
    ], colWidths=[5.8*cm, 5.8*cm, 5.8*cm])
    t_res.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,0), (-1,0), GRAY_LT),
        ('PADDING', (0,0), (-1,-1), 6)
    ]))
    story.append(t_res)
    story.append(Spacer(1, 0.8*cm))
    
    # Detalhamento Vendas
    story.append(Paragraph("<b>Extrato de Entradas (Vendas e Locações)</b>", P_H2))
    story.append(Spacer(1, 0.2*cm))
    d_vendas = [["Data", "Cliente/Info", "Tipo", "Forma Pgto", "Valor"]]
    for v in vendas_lista:
        d = v.get('criado_em', '')[:10]
        cli = v.get('cliente_nome') or '-'
        d_vendas.append([d, cli[:20], v.get('tipo',''), v.get('forma_pagamento',''), formatar_moeda(v.get('total', 0))])
    for l in locacoes_lista:
        d = l.get('criado_em', '')[:10]
        cli = l.get('cliente_nome') or '-'
        d_vendas.append([d, cli[:20], 'Locação', '-', formatar_moeda(l.get('total', 0))])
    
    if len(d_vendas) == 1:
        d_vendas.append(["Nenhuma entrada no período", "", "", "", ""])
        
    t_vendas = Table(d_vendas, colWidths=[2.5*cm, 6.5*cm, 2.5*cm, 3.4*cm, 2.5*cm])
    t_vendas.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,0), (-1,0), GRAY_LT),
        ('ALIGN', (4,0), (4,-1), 'RIGHT'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('PADDING', (0,0), (-1,-1), 4)
    ]))
    story.append(t_vendas)
    story.append(Spacer(1, 0.8*cm))
    
    # Detalhamento Despesas
    story.append(Paragraph("<b>Extrato de Saídas (Despesas)</b>", P_H2))
    story.append(Spacer(1, 0.2*cm))
    d_despesas = [["Data", "Descrição", "Categoria", "Valor"]]
    for d in despesas_lista:
        dt = d.get('data', '')[:10]
        desc = d.get('descricao') or '-'
        d_despesas.append([dt, desc[:40], d.get('categoria',''), formatar_moeda(d.get('valor', 0))])
    if len(d_despesas) == 1:
        d_despesas.append(["Nenhuma saída no período", "", "", ""])
        
    t_despesas = Table(d_despesas, colWidths=[2.5*cm, 8*cm, 4.4*cm, 2.5*cm])
    t_despesas.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,0), (-1,0), GRAY_LT),
        ('ALIGN', (3,0), (3,-1), 'RIGHT'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('PADDING', (0,0), (-1,-1), 4)
    ]))
    story.append(t_despesas)
    
    doc.build(story)
    return fp
