from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas
import os
import datetime

PURPLE = colors.HexColor('#534AB7')
PURPLE_LIGHT = colors.HexColor('#EEEDFE')
GRAY = colors.HexColor('#888780')
GRAY_LIGHT = colors.HexColor('#F1EFE8')
TEXT = colors.HexColor('#2C2C2A')

def gerar_orcamento_pdf(orcamento, itens, config, logo_path=None):
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(output_dir, exist_ok=True)
    filename = f"orcamento_{orcamento['numero']}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', fontSize=20, textColor=PURPLE, fontName='Helvetica-Bold', spaceAfter=2)
    sub_style = ParagraphStyle('sub', fontSize=9, textColor=GRAY, fontName='Helvetica')
    label_style = ParagraphStyle('label', fontSize=8, textColor=GRAY, fontName='Helvetica')
    value_style = ParagraphStyle('value', fontSize=10, textColor=TEXT, fontName='Helvetica')
    bold_style = ParagraphStyle('bold', fontSize=10, textColor=TEXT, fontName='Helvetica-Bold')

    story = []

    # Header
    header_data = [[
        Paragraph(f"<b>{config.get('empresa_nome','DripArt')}</b>", title_style),
        Paragraph(
            f"{config.get('empresa_cnpj','')}<br/>"
            f"{('Tel: ' + config['empresa_telefone']) if config.get('empresa_telefone') else ''}<br/>"
            f"{('WA: ' + config['empresa_whatsapp']) if config.get('empresa_whatsapp') else ''}<br/>"
            f"{config.get('empresa_email','')}<br/>"
            f"{('@' + config['empresa_instagram']) if config.get('empresa_instagram') else ''}",
            ParagraphStyle('info_right', fontSize=8, textColor=GRAY, alignment=TA_RIGHT)
        )
    ]]
    header_table = Table(header_data, colWidths=[9*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1, color=PURPLE))
    story.append(Spacer(1, 0.4*cm))

    # Título do documento
    tipo_label = "ORÇAMENTO"
    story.append(Paragraph(tipo_label, ParagraphStyle('doc_title', fontSize=14, textColor=PURPLE, fontName='Helvetica-Bold', spaceAfter=4)))
    story.append(Paragraph(f"Nº {orcamento['numero']}  ·  Emitido em {_fmt_date(orcamento.get('criado_em',''))}  ·  Válido até {_fmt_date(orcamento.get('validade',''))}", sub_style))
    story.append(Spacer(1, 0.5*cm))

    # Cliente
    cliente_data = [
        [Paragraph("CLIENTE", label_style)],
        [Paragraph(orcamento.get('cliente_nome','Não informado'), bold_style)],
    ]
    if orcamento.get('obs'):
        cliente_data.append([Paragraph(f"Obs: {orcamento['obs']}", sub_style)])
    cliente_table = Table(cliente_data, colWidths=[17*cm])
    cliente_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PURPLE_LIGHT),
        ('ROUNDEDCORNERS', [6]),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (0,0), 8),
        ('BOTTOMPADDING', (0,-1), (-1,-1), 8),
    ]))
    story.append(cliente_table)
    story.append(Spacer(1, 0.5*cm))

    # Itens
    item_header = ['#', 'Descrição', 'Qtd', 'Valor Unit.', 'Subtotal']
    item_rows = [item_header]
    for i, item in enumerate(itens, 1):
        item_rows.append([
            str(i),
            item['descricao'],
            _fmt_num(item['quantidade']),
            _fmt_brl(item['preco_unitario']),
            _fmt_brl(item['subtotal']),
        ])

    items_table = Table(item_rows, colWidths=[0.8*cm, 9.2*cm, 2*cm, 2.5*cm, 2.5*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PURPLE),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_LIGHT]),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.3, GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.4*cm))

    # Totais
    subtotal = float(orcamento.get('subtotal', 0))
    desconto = float(orcamento.get('desconto', 0))
    total = float(orcamento.get('total', 0))
    totais_data = []
    totais_data.append(['Subtotal', _fmt_brl(subtotal)])
    if desconto > 0:
        totais_data.append(['Desconto', f"- {_fmt_brl(desconto)}"])
    totais_data.append(['TOTAL', _fmt_brl(total)])

    totais_table = Table(totais_data, colWidths=[13.5*cm, 3.5*cm])
    style = [
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (1,0), (1,-1), 6),
    ]
    last = len(totais_data) - 1
    style += [
        ('FONTNAME', (0, last), (-1, last), 'Helvetica-Bold'),
        ('FONTSIZE', (0, last), (-1, last), 11),
        ('TEXTCOLOR', (0, last), (-1, last), PURPLE),
        ('LINEABOVE', (0, last), (-1, last), 1, PURPLE),
    ]
    totais_table.setStyle(TableStyle(style))
    story.append(totais_table)
    story.append(Spacer(1, 1*cm))

    # Rodapé
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_LIGHT))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f"Documento gerado em {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')} · {config.get('empresa_nome','DripArt')}",
        ParagraphStyle('footer', fontSize=7, textColor=GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    return filepath


def gerar_nota_venda_pdf(venda, itens, config):
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(output_dir, exist_ok=True)
    filename = f"nota_venda_{venda['id']}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    sub_style = ParagraphStyle('sub', fontSize=9, textColor=GRAY, fontName='Helvetica')
    label_style = ParagraphStyle('label', fontSize=8, textColor=GRAY)
    bold_style = ParagraphStyle('bold', fontSize=10, fontName='Helvetica-Bold', textColor=TEXT)

    story = []

    # Header igual ao orçamento
    header_data = [[
        Paragraph(f"<b>{config.get('empresa_nome','DripArt')}</b>",
                  ParagraphStyle('th', fontSize=20, textColor=PURPLE, fontName='Helvetica-Bold')),
        Paragraph(
            f"{config.get('empresa_cnpj','')}<br/>"
            f"{config.get('empresa_telefone','')}"
            f"{(' · WA: ' + config['empresa_whatsapp']) if config.get('empresa_whatsapp') else ''}<br/>"
            f"{config.get('empresa_email','')}"
            f"{(' · @' + config['empresa_instagram']) if config.get('empresa_instagram') else ''}",
            ParagraphStyle('tr', fontSize=8, textColor=GRAY, alignment=TA_RIGHT)
        )
    ]]
    ht = Table(header_data, colWidths=[9*cm, 8*cm])
    ht.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    story.append(ht)
    story.append(HRFlowable(width="100%", thickness=1, color=PURPLE))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("COMPROVANTE DE VENDA",
        ParagraphStyle('dt', fontSize=14, textColor=PURPLE, fontName='Helvetica-Bold', spaceAfter=4)))
    story.append(Paragraph(
        f"Venda #{venda['id']}  ·  {_fmt_date(venda.get('criado_em',''))}  ·  Pagamento: {venda.get('forma_pagamento','')}",
        sub_style))
    story.append(Spacer(1, 0.4*cm))

    if venda.get('cliente_nome'):
        ct = Table([[Paragraph("CLIENTE", label_style)],[Paragraph(venda['cliente_nome'], bold_style)]],
                   colWidths=[17*cm])
        ct.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),PURPLE_LIGHT),
            ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
            ('TOPPADDING',(0,0),(0,0),8),('BOTTOMPADDING',(0,-1),(-1,-1),8),
        ]))
        story.append(ct)
        story.append(Spacer(1, 0.5*cm))

    # Itens
    rows = [['#','Descrição','Qtd','Valor Unit.','Subtotal']]
    for i, item in enumerate(itens, 1):
        rows.append([str(i), item['descricao'], _fmt_num(item['quantidade']),
                     _fmt_brl(item['preco_unitario']), _fmt_brl(item['subtotal'])])
    t = Table(rows, colWidths=[0.8*cm, 9.2*cm, 2*cm, 2.5*cm, 2.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),PURPLE),('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, GRAY_LIGHT]),
        ('ALIGN',(2,0),(-1,-1),'RIGHT'),('ALIGN',(0,0),(0,-1),'CENTER'),
        ('GRID',(0,0),(-1,-1),0.3,GRAY),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))

    subtotal = float(venda.get('subtotal', 0))
    desconto = float(venda.get('desconto', 0))
    total = float(venda.get('total', 0))
    td = [['Subtotal', _fmt_brl(subtotal)]]
    if desconto > 0:
        td.append(['Desconto', f"- {_fmt_brl(desconto)}"])
    td.append(['TOTAL PAGO', _fmt_brl(total)])
    tt = Table(td, colWidths=[13.5*cm, 3.5*cm])
    last = len(td)-1
    tt.setStyle(TableStyle([
        ('ALIGN',(1,0),(1,-1),'RIGHT'),('FONTSIZE',(0,0),(-1,-1),9),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('RIGHTPADDING',(1,0),(1,-1),6),
        ('FONTNAME',(0,last),(-1,last),'Helvetica-Bold'),
        ('FONTSIZE',(0,last),(-1,last),11),
        ('TEXTCOLOR',(0,last),(-1,last),PURPLE),
        ('LINEABOVE',(0,last),(-1,last),1,PURPLE),
    ]))
    story.append(tt)
    story.append(Spacer(1,1*cm))
    story.append(HRFlowable(width="100%",thickness=0.5,color=GRAY_LIGHT))
    story.append(Spacer(1,0.2*cm))
    story.append(Paragraph(
        f"Documento gerado em {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')} · {config.get('empresa_nome','DripArt')}",
        ParagraphStyle('footer', fontSize=7, textColor=GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    return filepath


def _fmt_brl(v):
    try:
        return f"R$ {float(v):,.2f}".replace(',','X').replace('.',',').replace('X','.')
    except:
        return "R$ 0,00"

def _fmt_date(s):
    if not s:
        return ""
    try:
        d = str(s)[:10]
        parts = d.split('-')
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
        return d
    except:
        return str(s)

def _fmt_num(v):
    try:
        f = float(v)
        return str(int(f)) if f == int(f) else f"{f:.2f}"
    except:
        return str(v)


def gerar_pdf_locacao(locacao, itens, config):
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(output_dir, exist_ok=True)
    filename = f"locacao_{locacao['id']}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    story = []

    header_data = [[
        Paragraph(f"<b>{config.get('empresa_nome','DripArt')}</b>",
                  ParagraphStyle('th', fontSize=20, textColor=PURPLE, fontName='Helvetica-Bold')),
        Paragraph(f"{config.get('empresa_cnpj','')}<br/>{config.get('empresa_telefone','')}<br/>{config.get('empresa_email','')}",
                  ParagraphStyle('tr', fontSize=8, textColor=GRAY, alignment=TA_RIGHT))
    ]]
    ht = Table(header_data, colWidths=[9*cm, 8*cm])
    ht.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    story.append(ht)
    story.append(HRFlowable(width="100%", thickness=1, color=PURPLE))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("CONTRATO DE LOCAÇÃO",
        ParagraphStyle('dt', fontSize=14, textColor=PURPLE, fontName='Helvetica-Bold', spaceAfter=4)))
    story.append(Paragraph(
        f"Locação #{locacao['id']}  ·  Emitido em {_fmt_date(locacao.get('criado_em',''))}",
        ParagraphStyle('sub', fontSize=9, textColor=GRAY, fontName='Helvetica')))
    story.append(Spacer(1, 0.4*cm))

    # Info box
    info_data = [
        [Paragraph("CLIENTE", ParagraphStyle('lbl', fontSize=8, textColor=GRAY)),
         Paragraph("RETIRADA", ParagraphStyle('lbl', fontSize=8, textColor=GRAY)),
         Paragraph("DEVOLUÇÃO", ParagraphStyle('lbl', fontSize=8, textColor=GRAY))],
        [Paragraph(locacao.get('cliente_nome','—'), ParagraphStyle('val', fontSize=11, fontName='Helvetica-Bold', textColor=TEXT)),
         Paragraph(_fmt_date(locacao.get('data_retirada','')), ParagraphStyle('val', fontSize=11, fontName='Helvetica-Bold', textColor=TEXT)),
         Paragraph(_fmt_date(locacao.get('data_devolucao','')), ParagraphStyle('val', fontSize=11, fontName='Helvetica-Bold', textColor=TEXT))],
    ]
    it = Table(info_data, colWidths=[7*cm, 5*cm, 5*cm])
    it.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),PURPLE_LIGHT),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(0,0),8),('BOTTOMPADDING',(0,-1),(-1,-1),8),
    ]))
    story.append(it)
    story.append(Spacer(1, 0.5*cm))

    rows = [['#','Item','Qtd','Valor Unit.','Subtotal']]
    for i, item in enumerate(itens, 1):
        rows.append([str(i), item.get('nome','—'), _fmt_num(item.get('quantidade',1)),
                     _fmt_brl(item.get('preco_unitario',0)), _fmt_brl(item.get('subtotal',0))])
    t = Table(rows, colWidths=[0.8*cm, 9.2*cm, 2*cm, 2.5*cm, 2.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),PURPLE),('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,GRAY_LIGHT]),
        ('ALIGN',(2,0),(-1,-1),'RIGHT'),('ALIGN',(0,0),(0,-1),'CENTER'),
        ('GRID',(0,0),(-1,-1),0.3,GRAY),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))

    subtotal = float(locacao.get('total',0)) + float(locacao.get('desconto',0))
    desconto = float(locacao.get('desconto',0))
    total = float(locacao.get('total',0))
    td = [['Subtotal', _fmt_brl(subtotal)]]
    if desconto > 0:
        td.append(['Desconto', f"- {_fmt_brl(desconto)}"])
    td.append(['TOTAL', _fmt_brl(total)])
    tt = Table(td, colWidths=[13.5*cm, 3.5*cm])
    last = len(td)-1
    tt.setStyle(TableStyle([
        ('ALIGN',(1,0),(1,-1),'RIGHT'),('FONTSIZE',(0,0),(-1,-1),9),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('RIGHTPADDING',(1,0),(1,-1),6),
        ('FONTNAME',(0,last),(-1,last),'Helvetica-Bold'),
        ('FONTSIZE',(0,last),(-1,last),11),
        ('TEXTCOLOR',(0,last),(-1,last),PURPLE),
        ('LINEABOVE',(0,last),(-1,last),1,PURPLE),
    ]))
    story.append(tt)
    story.append(Spacer(1,0.8*cm))

    # Assinaturas
    sig_data = [[
        Paragraph("_________________________________<br/>Empresa — DripArt", ParagraphStyle('sig', fontSize=9, textColor=GRAY, alignment=TA_CENTER)),
        Paragraph(f"_________________________________<br/>Cliente — {locacao.get('cliente_nome','')}", ParagraphStyle('sig', fontSize=9, textColor=GRAY, alignment=TA_CENTER)),
    ]]
    st = Table(sig_data, colWidths=[8.5*cm, 8.5*cm])
    st.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),20)]))
    story.append(st)
    story.append(Spacer(1,0.5*cm))
    story.append(HRFlowable(width="100%",thickness=0.5,color=GRAY_LIGHT))
    story.append(Spacer(1,0.2*cm))
    story.append(Paragraph(
        f"Documento gerado em {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')} · {config.get('empresa_nome','DripArt')}",
        ParagraphStyle('footer', fontSize=7, textColor=GRAY, alignment=TA_CENTER)))
    doc.build(story)
    return filepath


def gerar_relatorio_pdf(data_ini, data_fim, vendas, formas, despesas, total_entrada, total_saida, config):
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
    os.makedirs(output_dir, exist_ok=True)
    filename = f"relatorio_{data_ini}_{data_fim}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    story = []

    header_data = [[
        Paragraph(f"<b>{config.get('empresa_nome','DripArt')}</b>",
                  ParagraphStyle('th', fontSize=20, textColor=PURPLE, fontName='Helvetica-Bold')),
        Paragraph(f"{config.get('empresa_telefone','')}<br/>{config.get('empresa_email','')}",
                  ParagraphStyle('tr', fontSize=8, textColor=GRAY, alignment=TA_RIGHT))
    ]]
    ht = Table(header_data, colWidths=[9*cm, 8*cm])
    ht.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    story.append(ht)
    story.append(HRFlowable(width="100%", thickness=1, color=PURPLE))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("RELATÓRIO FINANCEIRO",
        ParagraphStyle('dt', fontSize=14, textColor=PURPLE, fontName='Helvetica-Bold', spaceAfter=4)))
    story.append(Paragraph(f"Período: {_fmt_date(data_ini)} a {_fmt_date(data_fim)}",
        ParagraphStyle('sub', fontSize=10, textColor=GRAY, fontName='Helvetica')))
    story.append(Spacer(1, 0.5*cm))

    # Resumo
    saldo = total_entrada - total_saida
    saldo_color = colors.HexColor('#1D9E75') if saldo >= 0 else colors.HexColor('#D85A30')
    resumo = [
        [Paragraph('Total entradas (pagas)', ParagraphStyle('rl', fontSize=10, textColor=GRAY)),
         Paragraph(_fmt_brl(total_entrada), ParagraphStyle('rv', fontSize=12, fontName='Helvetica-Bold', textColor=colors.HexColor('#1D9E75'), alignment=TA_RIGHT))],
        [Paragraph('Total saídas (despesas)', ParagraphStyle('rl', fontSize=10, textColor=GRAY)),
         Paragraph(_fmt_brl(total_saida), ParagraphStyle('rv', fontSize=12, fontName='Helvetica-Bold', textColor=colors.HexColor('#D85A30'), alignment=TA_RIGHT))],
        [Paragraph('Saldo do período', ParagraphStyle('rl', fontSize=11, fontName='Helvetica-Bold', textColor=TEXT)),
         Paragraph(_fmt_brl(saldo), ParagraphStyle('rv', fontSize=13, fontName='Helvetica-Bold', textColor=saldo_color, alignment=TA_RIGHT))],
    ]
    rt = Table(resumo, colWidths=[13*cm, 4*cm])
    rt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),PURPLE_LIGHT),
        ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LINEBELOW',(0,1),(-1,1),0.5,GRAY),
    ]))
    story.append(rt)
    story.append(Spacer(1, 0.5*cm))

    tipo_labels = {'impressao':'Impressão','produto':'Produto','servico':'Serviço','locacao':'Locação','outro':'Outros'}
    pag_labels = {'dinheiro':'Dinheiro','pix':'PIX','cartao_debito':'Cartão Débito','cartao_credito':'Cartão Crédito','fiado':'Fiado'}

    def make_table(title, rows_data, col1, col2, col3, col_labels):
        story.append(Paragraph(title, ParagraphStyle('sec', fontSize=11, fontName='Helvetica-Bold', textColor=PURPLE, spaceBefore=8, spaceAfter=4)))
        if not rows_data:
            story.append(Paragraph("Sem dados no período.", ParagraphStyle('nd', fontSize=9, textColor=GRAY)))
            return
        header = [[col1, col2, col3]]
        data_rows = [[col_labels.get(r.get(list(r.keys())[0],''),r.get(list(r.keys())[0],'')),
                      str(r.get('qtd',0)), _fmt_brl(r.get('total',0))] for r in rows_data]
        t = Table(header + data_rows, colWidths=[9*cm, 3*cm, 5*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),PURPLE),('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,GRAY_LIGHT]),
            ('ALIGN',(1,0),(-1,-1),'RIGHT'),
            ('GRID',(0,0),(-1,-1),0.3,GRAY),
            ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
            ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ]))
        story.append(t)

    make_table('Receita por tipo', vendas, 'Tipo', 'Qtd', 'Total', tipo_labels)
    make_table('Formas de pagamento', formas, 'Pagamento', 'Qtd', 'Total', pag_labels)

    # Despesas
    story.append(Paragraph('Despesas por categoria', ParagraphStyle('sec', fontSize=11, fontName='Helvetica-Bold', textColor=PURPLE, spaceBefore=8, spaceAfter=4)))
    cat_labels = {'material':'Material','fornecedor':'Fornecedor','aluguel':'Aluguel','servico_terceiro':'Serv. Terceiro','equipamento':'Equipamento','transporte':'Transporte','alimentacao':'Alimentação','geral':'Geral'}
    if despesas:
        header = [['Categoria','Qtd','Total']]
        data_rows = [[cat_labels.get(r.get('categoria',''),r.get('categoria','')), str(r.get('qtd',0)), _fmt_brl(r.get('total',0))] for r in despesas]
        t = Table(header + data_rows, colWidths=[9*cm, 3*cm, 5*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#993C1D')),('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,GRAY_LIGHT]),
            ('ALIGN',(1,0),(-1,-1),'RIGHT'),
            ('GRID',(0,0),(-1,-1),0.3,GRAY),
            ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
            ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("Sem despesas no período.", ParagraphStyle('nd', fontSize=9, textColor=GRAY)))

    story.append(Spacer(1,0.8*cm))
    story.append(HRFlowable(width="100%",thickness=0.5,color=GRAY_LIGHT))
    story.append(Spacer(1,0.2*cm))
    story.append(Paragraph(
        f"Relatório gerado em {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')} · {config.get('empresa_nome','DripArt')}",
        ParagraphStyle('footer', fontSize=7, textColor=GRAY, alignment=TA_CENTER)))
    doc.build(story)
    return filepath
