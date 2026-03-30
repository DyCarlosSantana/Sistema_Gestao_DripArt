from flask import Flask, request, jsonify, send_file, render_template, make_response
from database import get_db, init_db
import datetime, os, json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = BASE_DIR
TEMPLATE_DIR = BASE_DIR
STATIC_DIR = BASE_DIR

print(f"Pasta: {BASE_DIR}")

try:
    from pdf_generator import gerar_orcamento_pdf, gerar_nota_venda_pdf, gerar_pdf_locacao, gerar_relatorio_pdf, gerar_pdf_encomenda, gerar_pdf_encomenda
    PDF_OK = True
except ImportError:
    PDF_OK = False
    print("AVISO: reportlab nao encontrado. PDFs desabilitados.")

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.config['JSON_ENSURE_ASCII'] = False

# CORS manual - permite acesso do navegador local
@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    return response

@app.errorhandler(Exception)
def handle_error(e):
    import traceback
    print("ERRO:", traceback.format_exc())
    return jsonify({'erro': str(e), 'tipo': type(e).__name__}), 500

# ─── UTILS ────────────────────────────────────────────────────────────────────

def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

def get_config():
    db = get_db()
    rows = db.execute("SELECT chave, valor FROM configuracoes").fetchall()
    db.close()
    return {r['chave']: r['valor'] for r in rows}

def proximo_numero_orcamento():
    db = get_db()
    row = db.execute("SELECT COUNT(*) as c FROM orcamentos").fetchone()
    n = (row['c'] or 0) + 1
    db.close()
    return f"ORC-{n:04d}"

# ─── FRONTEND ─────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204

# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@app.route('/api/dashboard')
def dashboard():
    db = get_db()
    hoje = datetime.date.today().isoformat()
    mes_atual = hoje[:7]

    receita_mes = db.execute(
        "SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE strftime('%Y-%m', criado_em)=? AND status='pago'",
        (mes_atual,)
    ).fetchone()['v']

    vendas_hoje = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE date(criado_em)=?",
        (hoje,)
    ).fetchone()

    locacoes_ativas = db.execute(
        "SELECT COUNT(*) as c FROM locacoes WHERE status='ativo'"
    ).fetchone()['c']

    locacoes_vencendo = db.execute(
        "SELECT COUNT(*) as c FROM locacoes WHERE status='ativo' AND data_devolucao <= date('now','+3 days')"
    ).fetchone()['c']

    orcamentos_abertos = db.execute(
        "SELECT COUNT(*) as c FROM orcamentos WHERE status='aberto'"
    ).fetchone()['c']

    receita_categorias = db.execute("""
        SELECT tipo, COALESCE(SUM(total),0) as total
        FROM vendas
        WHERE strftime('%Y-%m', criado_em)=? AND status='pago'
        GROUP BY tipo
    """, (mes_atual,)).fetchall()

    ultimas_movs = db.execute("""
        SELECT 'venda' as origem, id, cliente_nome, tipo as descricao, total, status, criado_em
        FROM vendas ORDER BY criado_em DESC LIMIT 5
    """).fetchall()

    locacoes_recentes = db.execute("""
        SELECT id, cliente_nome, data_devolucao, total, status, criado_em
        FROM locacoes ORDER BY criado_em DESC LIMIT 5
    """).fetchall()

    # Alertas detalhados de locações
    alertas_locacao = rows_to_list(db.execute("""
        SELECT id, cliente_nome, data_devolucao, total,
               CASE
                 WHEN data_devolucao < date('now') THEN 'atrasada'
                 WHEN data_devolucao = date('now') THEN 'hoje'
                 ELSE 'em_breve'
               END as urgencia
        FROM locacoes
        WHERE status='ativo' AND data_devolucao <= date('now','+3 days')
        ORDER BY data_devolucao ASC
    """).fetchall())

    # Fiado em atraso e a vencer
    fiado_atrasado = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE status='fiado' AND data_vencimento < date('now')"
    ).fetchone()
    fiado_vencendo = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE status='fiado' AND data_vencimento BETWEEN date('now') AND date('now','+7 days')"
    ).fetchone()
    fiado_total = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE status='fiado'"
    ).fetchone()

    # Saldo do caixa do mês
    mes_entradas = db.execute(
        "SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE strftime('%Y-%m', criado_em)=? AND status='pago'",
        (mes_atual,)
    ).fetchone()['v']
    mes_saidas = db.execute(
        "SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE strftime('%Y-%m', data)=?",
        (mes_atual,)
    ).fetchone()['v']

    # Encomendas pendentes
    encomendas_pendentes = db.execute(
        "SELECT COUNT(*) as c FROM encomendas WHERE status NOT IN ('entregue')"
    ).fetchone()['c']
    encomendas_atrasadas = db.execute(
        "SELECT COUNT(*) as c FROM encomendas WHERE status NOT IN ('entregue') AND data_entrega < date('now') AND data_entrega != ''"
    ).fetchone()['c']
    locacoes_atrasadas = db.execute(
        "SELECT COUNT(*) as c FROM locacoes WHERE status='ativo' AND data_devolucao < date('now')"
    ).fetchone()['c']

    db.close()
    return jsonify({
        'receita_mes': receita_mes,
        'vendas_hoje_count': vendas_hoje['c'],
        'vendas_hoje_total': vendas_hoje['v'],
        'locacoes_ativas': locacoes_ativas,
        'locacoes_vencendo': locacoes_vencendo,
        'locacoes_atrasadas': locacoes_atrasadas,
        'fiado_atrasado_count': fiado_atrasado['c'],
        'fiado_atrasado_valor': fiado_atrasado['v'],
        'fiado_vencendo_count': fiado_vencendo['c'],
        'fiado_total_count': fiado_total['c'],
        'fiado_total_valor': fiado_total['v'],
        'saldo_mes': mes_entradas - mes_saidas,
        'mes_saidas': mes_saidas,
        'encomendas_pendentes': encomendas_pendentes,
        'encomendas_atrasadas': encomendas_atrasadas,
        'alertas_locacao': alertas_locacao,
        'orcamentos_abertos': orcamentos_abertos,
        'receita_categorias': rows_to_list(receita_categorias),
        'ultimas_movimentacoes': rows_to_list(ultimas_movs),
        'locacoes_recentes': rows_to_list(locacoes_recentes),
    })

# ─── CLIENTES ─────────────────────────────────────────────────────────────────

@app.route('/api/clientes', methods=['GET'])
def listar_clientes():
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM clientes WHERE nome LIKE ? ORDER BY nome", (f'%{q}%',)).fetchall()
    else:
        rows = db.execute("SELECT * FROM clientes ORDER BY nome").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/clientes', methods=['POST'])
def criar_cliente():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO clientes (nome, telefone, email, cpf_cnpj, endereco, obs) VALUES (?,?,?,?,?,?)",
        (d['nome'], d.get('telefone',''), d.get('email',''), d.get('cpf_cnpj',''), d.get('endereco',''), d.get('obs',''))
    )
    db.commit()
    row = db.execute("SELECT * FROM clientes WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/clientes/<int:id>', methods=['PUT'])
def atualizar_cliente(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE clientes SET nome=?, telefone=?, email=?, cpf_cnpj=?, endereco=?, obs=? WHERE id=?",
        (d['nome'], d.get('telefone',''), d.get('email',''), d.get('cpf_cnpj',''), d.get('endereco',''), d.get('obs',''), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM clientes WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def deletar_cliente(id):
    db = get_db()
    db.execute("DELETE FROM clientes WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/clientes/<int:id>/historico')
def historico_cliente(id):
    db = get_db()
    cliente = row_to_dict(db.execute("SELECT * FROM clientes WHERE id=?", (id,)).fetchone())
    if not cliente:
        db.close()
        return jsonify({'erro': 'Cliente não encontrado'}), 404
    vendas = rows_to_list(db.execute(
        "SELECT id, tipo, total, forma_pagamento, status, criado_em FROM vendas WHERE cliente_id=? OR cliente_nome=? ORDER BY criado_em DESC",
        (id, cliente['nome'])
    ).fetchall())
    locacoes = rows_to_list(db.execute(
        "SELECT id, data_retirada, data_devolucao, total, status, criado_em FROM locacoes WHERE cliente_id=? OR cliente_nome=? ORDER BY criado_em DESC",
        (id, cliente['nome'])
    ).fetchall())
    orcamentos = rows_to_list(db.execute(
        "SELECT id, numero, total, status, validade, criado_em FROM orcamentos WHERE cliente_id=? OR cliente_nome=? ORDER BY criado_em DESC",
        (id, cliente['nome'])
    ).fetchall())
    total_gasto = sum(v['total'] for v in vendas if v['status'] == 'pago')
    db.close()
    return jsonify({
        'cliente': cliente,
        'vendas': vendas,
        'locacoes': locacoes,
        'orcamentos': orcamentos,
        'total_gasto': total_gasto,
        'total_transacoes': len(vendas) + len(locacoes)
    })

# ─── PRODUTOS ─────────────────────────────────────────────────────────────────

@app.route('/api/produtos', methods=['GET'])
def listar_produtos():
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM produtos WHERE ativo=1 AND nome LIKE ? ORDER BY nome", (f'%{q}%',)).fetchall()
    else:
        rows = db.execute("SELECT * FROM produtos WHERE ativo=1 ORDER BY nome").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/produtos', methods=['POST'])
def criar_produto():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO produtos (nome, descricao, categoria, preco_venda, estoque) VALUES (?,?,?,?,?)",
        (d['nome'], d.get('descricao',''), d.get('categoria',''), d.get('preco_venda', 0), d.get('estoque',0))
    )
    db.commit()
    row = db.execute("SELECT * FROM produtos WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/produtos/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE produtos SET nome=?, descricao=?, categoria=?, preco_venda=?, estoque=? WHERE id=?",
        (d['nome'], d.get('descricao',''), d.get('categoria',''), d.get('preco_venda', 0), d.get('estoque',0), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM produtos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/produtos/<int:id>', methods=['DELETE'])
def deletar_produto(id):
    db = get_db()
    db.execute("UPDATE produtos SET ativo=0 WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── MATERIAIS E ACABAMENTOS ───────────────────────────────────────────────────

@app.route('/api/materiais', methods=['GET'])
def listar_materiais():
    db = get_db()
    rows = db.execute("SELECT * FROM materiais_impressao WHERE ativo=1 ORDER BY nome").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/materiais', methods=['POST'])
def criar_material():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO materiais_impressao (nome, preco_m2, custo_material, margem_lucro, tipo, preco_unidade) VALUES (?,?,?,?,?,?)",
        (d['nome'], d.get('preco_m2',0), d.get('custo_material',0), d.get('margem_lucro',50), d.get('tipo','m2'), d.get('preco_unidade',0))
    )
    db.commit()
    row = db.execute("SELECT * FROM materiais_impressao WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/materiais/<int:id>', methods=['PUT'])
def atualizar_material(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE materiais_impressao SET nome=?, preco_m2=?, custo_material=?, margem_lucro=?, tipo=?, preco_unidade=? WHERE id=?",
        (d['nome'], d.get('preco_m2',0), d.get('custo_material',0), d.get('margem_lucro',50), d.get('tipo','m2'), d.get('preco_unidade',0), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM materiais_impressao WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/materiais/<int:id>', methods=['DELETE'])
def deletar_material(id):
    db = get_db()
    db.execute("UPDATE materiais_impressao SET ativo=0 WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/acabamentos', methods=['GET'])
def listar_acabamentos():
    db = get_db()
    rows = db.execute("SELECT * FROM acabamentos WHERE ativo=1 ORDER BY nome").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/calcular-impressao', methods=['POST'])
def calcular_impressao():
    d = request.json
    material_id = d.get('material_id')
    quantidade = int(d.get('quantidade', 1))
    acabamentos_ids = d.get('acabamentos', [])

    db = get_db()
    mat = db.execute("SELECT * FROM materiais_impressao WHERE id=?", (material_id,)).fetchone()
    if not mat:
        db.close()
        return jsonify({'erro': 'Material não encontrado'}), 400

    tipo = mat['tipo'] if mat['tipo'] else 'm2'
    custo = 0
    preco_base = 0
    area = 0
    descricao = ''

    if tipo == 'unidade':
        preco_unit = float(mat['preco_unidade'] or 0)
        custo_unit = float(mat['custo_material'] or 0)
        preco_base = preco_unit * quantidade
        custo = custo_unit * quantidade
        descricao = f"{mat['nome']} x{quantidade}"
    else:
        largura = float(d.get('largura', 0))
        altura = float(d.get('altura', 0))
        area = largura * altura
        preco_base = area * float(mat['preco_m2'] or 0) * quantidade
        custo = area * float(mat['custo_material'] or 0) * quantidade
        descricao = f"{mat['nome']} {largura}m x {altura}m (x{quantidade})"

    total_acabamentos = 0
    custo_acabamentos = 0
    detalhes_acabamentos = []
    for ac_id in acabamentos_ids:
        ac = db.execute("SELECT * FROM acabamentos WHERE id=?", (ac_id,)).fetchone()
        if ac:
            val = ac['preco_unitario'] * quantidade
            total_acabamentos += val
            detalhes_acabamentos.append({'nome': ac['nome'], 'valor': val})

    total = preco_base + total_acabamentos
    lucro = total - custo - custo_acabamentos
    margem = round((lucro / total * 100), 1) if total > 0 else 0
    db.close()

    return jsonify({
        'tipo': tipo,
        'area_m2': round(area, 4),
        'preco_base': round(preco_base, 2),
        'custo_total': round(custo, 2),
        'acabamentos': detalhes_acabamentos,
        'total_acabamentos': round(total_acabamentos, 2),
        'total': round(total, 2),
        'lucro_estimado': round(lucro, 2),
        'margem_pct': margem,
        'descricao': descricao
    })

# ─── VENDAS / PDV ─────────────────────────────────────────────────────────────

@app.route('/api/vendas', methods=['GET'])
def listar_vendas():
    db = get_db()
    data_ini = request.args.get('data_ini', '')
    data_fim = request.args.get('data_fim', '')
    q = "SELECT * FROM vendas"
    params = []
    if data_ini and data_fim:
        q += " WHERE date(criado_em) BETWEEN ? AND ?"
        params = [data_ini, data_fim]
    q += " ORDER BY criado_em DESC LIMIT 100"
    rows = db.execute(q, params).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/vendas', methods=['POST'])
def criar_venda():
    d = request.json
    db = get_db()
    venc = d.get('data_vencimento') or (None if d.get('forma_pagamento') != 'fiado' else
           (datetime.date.today() + datetime.timedelta(days=30)).isoformat())
    cur = db.execute(
        "INSERT INTO vendas (cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, obs, data_vencimento) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (d.get('cliente_id'), d.get('cliente_nome',''), d.get('tipo','venda'),
         d.get('subtotal', 0), d.get('desconto', 0), d.get('total', 0),
         d['forma_pagamento'], d.get('status','pago'), d.get('obs',''), venc)
    )
    venda_id = cur.lastrowid
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO venda_itens (venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
            (venda_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
        if item.get('produto_id'):
            db.execute(
                "UPDATE produtos SET estoque = MAX(0, estoque - ?) WHERE id=?",
                (int(item['quantidade']), item['produto_id'])
            )
    db.commit()
    row = db.execute("SELECT * FROM vendas WHERE id=?", (venda_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/vendas/<int:id>', methods=['PUT'])
def atualizar_venda(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE vendas SET cliente_nome=?, tipo=?, subtotal=?, desconto=?, total=?, forma_pagamento=?, status=?, obs=? WHERE id=?",
        (d.get('cliente_nome',''), d.get('tipo','venda'), d.get('subtotal', 0),
         d.get('desconto',0), d.get('total', 0), d['forma_pagamento'],
         d.get('status','pago'), d.get('obs',''), id)
    )
    # update items: delete and re-insert
    db.execute("DELETE FROM venda_itens WHERE venda_id=?", (id,))
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO venda_itens (venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
            (id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM vendas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/vendas/<int:id>', methods=['DELETE'])
def deletar_venda(id):
    db = get_db()
    db.execute("DELETE FROM venda_itens WHERE venda_id=?", (id,))
    db.execute("DELETE FROM vendas WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/vendas/<int:id>/itens')
def itens_venda(id):
    db = get_db()
    rows = db.execute("SELECT * FROM venda_itens WHERE venda_id=?", (id,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/vendas/<int:id>/pdf')
def pdf_venda(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado. Rode: pip install reportlab'}), 503
    db = get_db()
    venda = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=?", (id,)).fetchone())
    itens = rows_to_list(db.execute("SELECT * FROM venda_itens WHERE venda_id=?", (id,)).fetchall())
    db.close()
    config = get_config()
    path = gerar_nota_venda_pdf(venda, itens, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

# ─── LOCAÇÕES ─────────────────────────────────────────────────────────────────


# ─── FIADO ────────────────────────────────────────────────────────────────────


@app.route('/api/vendas/<int:id>/quitar', methods=['PUT'])
def quitar_venda(id):
    db = get_db()
    db.execute("UPDATE vendas SET status='pago', forma_pagamento=? WHERE id=?",
               (request.json.get('forma_pagamento','dinheiro'), id))
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

# ─── PDF ENCOMENDA ────────────────────────────────────────────────────────────


@app.route('/api/agenda', methods=['GET'])
def listar_agenda():
    db = get_db()
    mes = request.args.get('mes', datetime.date.today().strftime('%Y-%m'))
    data_ini = request.args.get('data_ini', mes + '-01')
    # Last day of month
    ano, m = int(mes.split('-')[0]), int(mes.split('-')[1])
    import calendar
    ultimo_dia = calendar.monthrange(ano, m)[1]
    data_fim = request.args.get('data_fim', f'{mes}-{ultimo_dia:02d}')
    rows = rows_to_list(db.execute(
        "SELECT * FROM agenda WHERE data_inicio <= ? AND (data_fim >= ? OR data_fim IS NULL) ORDER BY data_inicio, hora_inicio",
        (data_fim, data_ini)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/agenda/proximos')
def proximos_eventos():
    db = get_db()
    hoje = datetime.date.today().isoformat()
    fim = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
    rows = rows_to_list(db.execute(
        "SELECT * FROM agenda WHERE data_inicio BETWEEN ? AND ? AND status != 'cancelado' ORDER BY data_inicio, hora_inicio LIMIT 10",
        (hoje, fim)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/agenda', methods=['POST'])
def criar_evento():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO agenda (titulo, tipo, data_inicio, data_fim, hora_inicio, hora_fim, cliente_nome, descricao, status, locacao_id, encomenda_id, cor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (d['titulo'], d.get('tipo','compromisso'), d['data_inicio'],
         d.get('data_fim', d['data_inicio']), d.get('hora_inicio','08:00'),
         d.get('hora_fim','09:00'), d.get('cliente_nome',''), d.get('descricao',''),
         d.get('status','pendente'), d.get('locacao_id'), d.get('encomenda_id'),
         d.get('cor','#534AB7'))
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM agenda WHERE id=?", (cur.lastrowid,)).fetchone())
    db.close()
    return jsonify(row), 201

@app.route('/api/agenda/<int:id>', methods=['PUT'])
def atualizar_evento(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE agenda SET titulo=?, tipo=?, data_inicio=?, data_fim=?, hora_inicio=?, hora_fim=?, cliente_nome=?, descricao=?, status=?, cor=? WHERE id=?",
        (d['titulo'], d.get('tipo','compromisso'), d['data_inicio'],
         d.get('data_fim', d['data_inicio']), d.get('hora_inicio','08:00'),
         d.get('hora_fim','09:00'), d.get('cliente_nome',''), d.get('descricao',''),
         d.get('status','pendente'), d.get('cor','#534AB7'), id)
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM agenda WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

@app.route('/api/agenda/<int:id>', methods=['DELETE'])
def deletar_evento(id):
    db = get_db()
    db.execute("DELETE FROM agenda WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── LOCAÇÕES COM FILTRO DE DATA ──────────────────────────────────────────────

@app.route('/api/locacoes/<int:id>/itens')
def itens_locacao_get(id):
    db = get_db()
    rows = rows_to_list(db.execute("SELECT * FROM locacao_itens WHERE locacao_id=?", (id,)).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/locacoes', methods=['GET'])
def listar_locacoes():
    db = get_db()
    status = request.args.get('status', '')
    data_ini = request.args.get('data_ini', '')
    data_fim = request.args.get('data_fim', '')
    q = request.args.get('q', '')
    where, params = [], []
    if status:
        where.append("status=?"); params.append(status)
    if data_ini and data_fim:
        where.append("data_retirada BETWEEN ? AND ?"); params += [data_ini, data_fim]
    if q:
        where.append("cliente_nome LIKE ?"); params.append(f'%{q}%')
    sql = "SELECT * FROM locacoes"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY criado_em DESC LIMIT 200"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/locacoes', methods=['POST'])
def criar_locacao():
    d = request.json
    db = get_db()
    venc_loc = d.get('data_vencimento') or (None if d.get('forma_pagamento') != 'fiado' else
              (datetime.date.today() + datetime.timedelta(days=30)).isoformat())
    cur = db.execute(
        "INSERT INTO locacoes (cliente_id, cliente_nome, tipo, data_retirada, data_devolucao, total, desconto, forma_pagamento, status, obs, data_vencimento) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (d.get('cliente_id'), d['cliente_nome'], d.get('tipo','item'),
         d['data_retirada'], d['data_devolucao'],
         d.get('total', 0), d.get('desconto',0), d.get('forma_pagamento',''),
         d.get('status','ativo'), d.get('obs',''), venc_loc)
    )
    loc_id = cur.lastrowid
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO locacao_itens (locacao_id, item_id, kit_id, nome, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?,?)",
            (loc_id, item.get('item_id'), item.get('kit_id'), item['nome'],
             item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    # Sincroniza com agenda automaticamente
    db.execute(
        "INSERT INTO agenda (titulo, tipo, data_inicio, data_fim, hora_inicio, hora_fim, cliente_nome, status, locacao_id, cor) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (f"Locacao: {d['cliente_nome']}", 'locacao', d['data_retirada'], d['data_devolucao'],
         '08:00', '18:00', d['cliente_nome'], 'pendente', loc_id, '#1D9E75')
    )
    db.commit()
    row = db.execute("SELECT * FROM locacoes WHERE id=?", (loc_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/locacoes/<int:id>', methods=['PUT'])
def atualizar_locacao(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE locacoes SET cliente_nome=?, data_retirada=?, data_devolucao=?, total=?, desconto=?, forma_pagamento=?, obs=? WHERE id=?",
        (d['cliente_nome'], d['data_retirada'], d['data_devolucao'],
         d.get('total', 0), d.get('desconto',0), d.get('forma_pagamento',''), d.get('obs',''), id)
    )
    db.execute("DELETE FROM locacao_itens WHERE locacao_id=?", (id,))
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO locacao_itens (locacao_id, item_id, kit_id, nome, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?,?)",
            (id, item.get('item_id'), item.get('kit_id'), item['nome'],
             item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM locacoes WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/locacoes/<int:id>', methods=['DELETE'])
def deletar_locacao(id):
    db = get_db()
    db.execute("DELETE FROM locacao_itens WHERE locacao_id=?", (id,))
    db.execute("DELETE FROM locacoes WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/locacoes/<int:id>/pdf')
def pdf_locacao(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    db = get_db()
    loc = row_to_dict(db.execute("SELECT * FROM locacoes WHERE id=?", (id,)).fetchone())
    itens = rows_to_list(db.execute("SELECT * FROM locacao_itens WHERE locacao_id=?", (id,)).fetchall())
    db.close()
    config = get_config()
    path = gerar_pdf_locacao(loc, itens, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

@app.route('/api/locacoes/<int:id>/status', methods=['PUT'])
def atualizar_status_locacao(id):
    d = request.json
    db = get_db()
    db.execute("UPDATE locacoes SET status=? WHERE id=?", (d['status'], id))
    db.commit()
    row = db.execute("SELECT * FROM locacoes WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/itens-locacao', methods=['GET'])
def listar_itens_locacao():
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM itens_locacao WHERE ativo=1 AND nome LIKE ? ORDER BY nome", (f'%{q}%',)).fetchall()
    else:
        rows = db.execute("SELECT * FROM itens_locacao WHERE ativo=1 ORDER BY nome").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/itens-locacao', methods=['POST'])
def criar_item_locacao():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO itens_locacao (nome, descricao, categoria, preco_diaria, quantidade_total) VALUES (?,?,?,?,?)",
        (d['nome'], d.get('descricao',''), d.get('categoria',''), d.get('preco_diaria', 0), d.get('quantidade_total',1))
    )
    db.commit()
    row = db.execute("SELECT * FROM itens_locacao WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/itens-locacao/<int:id>', methods=['PUT'])
def atualizar_item_locacao(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE itens_locacao SET nome=?, descricao=?, categoria=?, preco_diaria=?, quantidade_total=? WHERE id=?",
        (d['nome'], d.get('descricao',''), d.get('categoria',''), d.get('preco_diaria', 0), d.get('quantidade_total',1), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM itens_locacao WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/itens-locacao/<int:id>', methods=['DELETE'])
def deletar_item_locacao(id):
    db = get_db()
    db.execute("UPDATE itens_locacao SET ativo=0 WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/kits', methods=['GET'])
def listar_kits():
    db = get_db()
    kits = rows_to_list(db.execute("SELECT * FROM kits_locacao WHERE ativo=1 ORDER BY nome").fetchall())
    for kit in kits:
        itens = db.execute("""
            SELECT ki.quantidade, il.nome, il.preco_diaria
            FROM kit_itens ki JOIN itens_locacao il ON ki.item_id=il.id
            WHERE ki.kit_id=?
        """, (kit['id'],)).fetchall()
        kit['itens'] = rows_to_list(itens)
    db.close()
    return jsonify(kits)

@app.route('/api/kits', methods=['POST'])
def criar_kit():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO kits_locacao (nome, descricao, preco_total) VALUES (?,?,?)",
        (d['nome'], d.get('descricao',''), d.get('preco_total', 0))
    )
    kit_id = cur.lastrowid
    for item in d.get('itens', []):
        db.execute("INSERT INTO kit_itens (kit_id, item_id, quantidade) VALUES (?,?,?)",
                   (kit_id, item['item_id'], item.get('quantidade',1)))
    db.commit()
    row = db.execute("SELECT * FROM kits_locacao WHERE id=?", (kit_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/kits/<int:id>', methods=['PUT'])
def atualizar_kit(id):
    d = request.json
    db = get_db()
    db.execute("UPDATE kits_locacao SET nome=?, descricao=?, preco_total=? WHERE id=?",
               (d['nome'], d.get('descricao',''), d.get('preco_total', 0), id))
    db.execute("DELETE FROM kit_itens WHERE kit_id=?", (id,))
    for item in d.get('itens', []):
        db.execute("INSERT INTO kit_itens (kit_id, item_id, quantidade) VALUES (?,?,?)",
                   (id, item['item_id'], item.get('quantidade',1)))
    db.commit()
    row = db.execute("SELECT * FROM kits_locacao WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/kits/<int:id>', methods=['DELETE'])
def deletar_kit(id):
    db = get_db()
    db.execute("DELETE FROM kit_itens WHERE kit_id=?", (id,))
    db.execute("UPDATE kits_locacao SET ativo=0 WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── ORÇAMENTOS ───────────────────────────────────────────────────────────────

@app.route('/api/orcamentos', methods=['GET'])
def listar_orcamentos():
    db = get_db()
    rows = db.execute("SELECT * FROM orcamentos ORDER BY criado_em DESC LIMIT 100").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/orcamentos', methods=['POST'])
def criar_orcamento():
    d = request.json
    db = get_db()
    numero = proximo_numero_orcamento()
    config = get_config()
    dias = int(config.get('orcamento_validade_dias', 7))
    validade = (datetime.date.today() + datetime.timedelta(days=dias)).isoformat()

    cur = db.execute(
        "INSERT INTO orcamentos (numero, cliente_id, cliente_nome, validade, subtotal, desconto, total, status, obs) VALUES (?,?,?,?,?,?,?,?,?)",
        (numero, d.get('cliente_id'), d.get('cliente_nome',''),
         validade, d.get('subtotal', 0), d.get('desconto',0), d.get('total', 0),
         'aberto', d.get('obs',''))
    )
    orc_id = cur.lastrowid
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
            (orc_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM orcamentos WHERE id=?", (orc_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/orcamentos/<int:id>', methods=['PUT'])
def atualizar_orcamento(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE orcamentos SET cliente_nome=?, subtotal=?, desconto=?, total=?, obs=? WHERE id=?",
        (d.get('cliente_nome',''), d.get('subtotal', 0), d.get('desconto',0), d.get('total', 0), d.get('obs',''), id)
    )
    db.execute("DELETE FROM orcamento_itens WHERE orcamento_id=?", (id,))
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
            (id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/orcamentos/<int:id>', methods=['DELETE'])
def deletar_orcamento(id):
    db = get_db()
    db.execute("DELETE FROM orcamento_itens WHERE orcamento_id=?", (id,))
    db.execute("DELETE FROM orcamentos WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/orcamentos/<int:id>/itens')
def itens_orcamento(id):
    db = get_db()
    rows = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/orcamentos/<int:id>/status', methods=['PUT'])
def atualizar_status_orcamento(id):
    d = request.json
    db = get_db()
    db.execute("UPDATE orcamentos SET status=? WHERE id=?", (d['status'], id))
    db.commit()
    row = db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/orcamentos/<int:id>/pdf')
def pdf_orcamento(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado. Rode: pip install reportlab'}), 503
    db = get_db()
    orc = row_to_dict(db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone())
    itens = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    db.close()
    config = get_config()
    path = gerar_orcamento_pdf(orc, itens, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

# ─── RELATÓRIOS ───────────────────────────────────────────────────────────────

@app.route('/api/relatorios/resumo')
def relatorio_resumo():
    db = get_db()
    data_ini = request.args.get('data_ini', datetime.date.today().replace(day=1).isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())

    vendas = db.execute("""
        SELECT tipo, COUNT(*) as qtd, SUM(total) as total
        FROM vendas WHERE date(criado_em) BETWEEN ? AND ?
        GROUP BY tipo
    """, (data_ini, data_fim)).fetchall()

    formas_pag = db.execute("""
        SELECT forma_pagamento, COUNT(*) as qtd, SUM(total) as total
        FROM vendas WHERE date(criado_em) BETWEEN ? AND ? AND status='pago'
        GROUP BY forma_pagamento
    """, (data_ini, data_fim)).fetchall()

    locacoes = db.execute("""
        SELECT status, COUNT(*) as qtd, SUM(total) as total
        FROM locacoes WHERE date(criado_em) BETWEEN ? AND ?
        GROUP BY status
    """, (data_ini, data_fim)).fetchall()

    total_geral = db.execute("""
        SELECT COALESCE(SUM(total),0) as v FROM vendas
        WHERE date(criado_em) BETWEEN ? AND ? AND status='pago'
    """, (data_ini, data_fim)).fetchone()['v']

    db.close()
    return jsonify({
        'periodo': {'inicio': data_ini, 'fim': data_fim},
        'total_receita': total_geral,
        'vendas_por_tipo': rows_to_list(vendas),
        'formas_pagamento': rows_to_list(formas_pag),
        'locacoes_por_status': rows_to_list(locacoes),
    })



# ─── FIADO / COBRANÇAS ────────────────────────────────────────────────────────



@app.route('/api/despesas', methods=['GET'])
def listar_despesas():
    db = get_db()
    data_ini = request.args.get('data_ini', '')
    data_fim = request.args.get('data_fim', '')
    if data_ini and data_fim:
        rows = db.execute("SELECT * FROM despesas WHERE data BETWEEN ? AND ? ORDER BY data DESC", (data_ini, data_fim)).fetchall()
    else:
        rows = db.execute("SELECT * FROM despesas ORDER BY criado_em DESC LIMIT 100").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/despesas', methods=['POST'])
def criar_despesa():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO despesas (descricao, categoria, valor, forma_pagamento, data, obs) VALUES (?,?,?,?,?,?)",
        (d['descricao'], d.get('categoria','geral'), d.get('valor', 0),
         d.get('forma_pagamento','dinheiro'), d.get('data', datetime.date.today().isoformat()), d.get('obs',''))
    )
    db.commit()
    row = db.execute("SELECT * FROM despesas WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/despesas/<int:id>', methods=['PUT'])
def atualizar_despesa(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE despesas SET descricao=?, categoria=?, valor=?, forma_pagamento=?, data=?, obs=? WHERE id=?",
        (d['descricao'], d.get('categoria','geral'), d.get('valor', 0),
         d.get('forma_pagamento','dinheiro'), d.get('data',''), d.get('obs',''), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM despesas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/despesas/<int:id>', methods=['DELETE'])
def deletar_despesa(id):
    db = get_db()
    db.execute("DELETE FROM despesas WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/fluxo-caixa')
def fluxo_caixa():
    db = get_db()
    data_ini = request.args.get('data_ini', datetime.date.today().replace(day=1).isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())
    entradas = rows_to_list(db.execute(
        "SELECT id, criado_em as data, cliente_nome as descricao, tipo as categoria, total as valor, forma_pagamento, status FROM vendas WHERE date(criado_em) BETWEEN ? AND ? ORDER BY criado_em DESC",
        (data_ini, data_fim)
    ).fetchall())
    saidas = rows_to_list(db.execute(
        "SELECT id, data, descricao, categoria, valor, forma_pagamento, 'pago' as status FROM despesas WHERE data BETWEEN ? AND ? ORDER BY data DESC",
        (data_ini, data_fim)
    ).fetchall())
    total_entradas = sum(e['valor'] for e in entradas if e['status'] == 'pago')
    total_saidas = sum(s['valor'] for s in saidas)
    db.close()
    return jsonify({
        'periodo': {'inicio': data_ini, 'fim': data_fim},
        'entradas': entradas,
        'saidas': saidas,
        'total_entradas': total_entradas,
        'total_saidas': total_saidas,
        'saldo': total_entradas - total_saidas
    })

# ─── ENCOMENDAS ───────────────────────────────────────────────────────────────

def proximo_numero_encomenda():
    db = get_db()
    row = db.execute("SELECT COUNT(*) as c FROM encomendas").fetchone()
    n = (row['c'] or 0) + 1
    db.close()
    return f"ENC-{n:04d}"

@app.route('/api/encomendas', methods=['GET'])
def listar_encomendas():
    db = get_db()
    status = request.args.get('status', '')
    if status:
        rows = db.execute("SELECT * FROM encomendas WHERE status=? ORDER BY data_entrega ASC, criado_em DESC", (status,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM encomendas WHERE status != 'entregue' ORDER BY data_entrega ASC, criado_em DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/encomendas/todas', methods=['GET'])
def todas_encomendas():
    db = get_db()
    rows = db.execute("SELECT * FROM encomendas ORDER BY criado_em DESC LIMIT 100").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/encomendas', methods=['POST'])
def criar_encomenda():
    d = request.json
    db = get_db()
    numero = proximo_numero_encomenda()
    cur = db.execute(
        "INSERT INTO encomendas (numero, cliente_id, cliente_nome, descricao, status, data_pedido, data_entrega, total, sinal, obs) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (numero, d.get('cliente_id'), d['cliente_nome'], d['descricao'],
         d.get('status','pedido'), d.get('data_pedido', datetime.date.today().isoformat()),
         d.get('data_entrega',''), d.get('total',0), d.get('sinal',0), d.get('obs',''))
    )
    # Sincroniza com agenda se tiver data de entrega
    if d.get('data_entrega'):
        db.execute(
            "INSERT INTO agenda (titulo, tipo, data_inicio, data_fim, hora_inicio, hora_fim, cliente_nome, descricao, status, encomenda_id, cor) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (f"Entrega: {d['cliente_nome']}", 'encomenda', d['data_entrega'], d['data_entrega'],
             '08:00', '18:00', d['cliente_nome'], d.get('descricao','')[:60], 'pendente', cur.lastrowid, '#534AB7')
        )
    db.commit()
    row = db.execute("SELECT * FROM encomendas WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/encomendas/<int:id>/status', methods=['PUT'])
def atualizar_status_encomenda(id):
    d = request.json
    db = get_db()
    db.execute("UPDATE encomendas SET status=? WHERE id=?", (d['status'], id))
    db.commit()
    row = db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/encomendas/<int:id>', methods=['PUT'])
def atualizar_encomenda(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE encomendas SET cliente_nome=?, descricao=?, status=?, data_entrega=?, total=?, sinal=?, obs=? WHERE id=?",
        (d['cliente_nome'], d['descricao'], d.get('status','pedido'),
         d.get('data_entrega',''), d.get('total',0), d.get('sinal',0), d.get('obs',''), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))


@app.route('/api/encomendas/<int:id>', methods=['DELETE'])
def deletar_encomenda(id):
    db = get_db()
    db.execute("DELETE FROM encomendas WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── SERVIÇOS ─────────────────────────────────────────────────────────────────

@app.route('/api/servicos', methods=['GET'])
def listar_servicos():
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM servicos WHERE ativo=1 AND nome LIKE ? ORDER BY nome", (f'%{q}%',)).fetchall()
    else:
        rows = db.execute("SELECT * FROM servicos WHERE ativo=1 ORDER BY nome").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/servicos', methods=['POST'])
def criar_servico():
    d = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO servicos (nome, descricao, categoria, tipo_preco, preco) VALUES (?,?,?,?,?)",
        (d['nome'], d.get('descricao',''), d.get('categoria',''), d.get('tipo_preco','fixo'), d.get('preco', 0))
    )
    db.commit()
    row = db.execute("SELECT * FROM servicos WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/servicos/<int:id>', methods=['PUT'])
def atualizar_servico(id):
    d = request.json
    db = get_db()
    db.execute(
        "UPDATE servicos SET nome=?, descricao=?, categoria=?, tipo_preco=?, preco=? WHERE id=?",
        (d['nome'], d.get('descricao',''), d.get('categoria',''), d.get('tipo_preco','fixo'), d.get('preco', 0), id)
    )
    db.commit()
    row = db.execute("SELECT * FROM servicos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/servicos/<int:id>', methods=['DELETE'])
def deletar_servico(id):
    db = get_db()
    db.execute("UPDATE servicos SET ativo=0 WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/relatorios/exportar')
def exportar_relatorio():
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    data_ini = request.args.get('data_ini', datetime.date.today().replace(day=1).isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())
    db = get_db()
    vendas = rows_to_list(db.execute(
        "SELECT tipo, COUNT(*) as qtd, SUM(total) as total FROM vendas WHERE date(criado_em) BETWEEN ? AND ? GROUP BY tipo",
        (data_ini, data_fim)).fetchall())
    formas = rows_to_list(db.execute(
        "SELECT forma_pagamento, COUNT(*) as qtd, SUM(total) as total FROM vendas WHERE date(criado_em) BETWEEN ? AND ? AND status='pago' GROUP BY forma_pagamento",
        (data_ini, data_fim)).fetchall())
    despesas = rows_to_list(db.execute(
        "SELECT categoria, COUNT(*) as qtd, SUM(valor) as total FROM despesas WHERE data BETWEEN ? AND ? GROUP BY categoria",
        (data_ini, data_fim)).fetchall())
    total_entrada = db.execute("SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE date(criado_em) BETWEEN ? AND ? AND status='pago'", (data_ini, data_fim)).fetchone()['v']
    total_saida = db.execute("SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE data BETWEEN ? AND ?", (data_ini, data_fim)).fetchone()['v']
    db.close()
    config = get_config()
    path = gerar_relatorio_pdf(data_ini, data_fim, vendas, formas, despesas, total_entrada, total_saida, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))


# ─── ORÇAMENTO → VENDA ────────────────────────────────────────────────────────

@app.route('/api/orcamentos/<int:id>/converter', methods=['POST'])
def converter_orcamento_venda(id):
    db = get_db()
    orc = row_to_dict(db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone())
    if not orc:
        db.close()
        return jsonify({'erro': 'Orçamento não encontrado'}), 404
    itens = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    d = request.json or {}
    cur = db.execute(
        "INSERT INTO vendas (cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, obs) VALUES (?,?,?,?,?,?,?,?,?)",
        (orc.get('cliente_id'), orc.get('cliente_nome',''), 'orcamento',
         orc['subtotal'], orc.get('desconto',0), orc['total'],
         d.get('forma_pagamento','dinheiro'), 'pago',
         f"Gerado do orçamento {orc['numero']}")
    )
    venda_id = cur.lastrowid
    for item in itens:
        db.execute(
            "INSERT INTO venda_itens (venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
            (venda_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.execute("UPDATE orcamentos SET status='aprovado' WHERE id=?", (id,))
    db.commit()
    venda = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=?", (venda_id,)).fetchone())
    db.close()
    return jsonify({'venda': venda, 'ok': True}), 201

# ─── ENCOMENDA → VENDA ────────────────────────────────────────────────────────

@app.route('/api/encomendas/<int:id>/converter', methods=['POST'])
def converter_encomenda_venda(id):
    db = get_db()
    enc = row_to_dict(db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone())
    if not enc:
        db.close()
        return jsonify({'erro': 'Encomenda não encontrada'}), 404
    d = request.json or {}
    cur = db.execute(
        "INSERT INTO vendas (cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, obs) VALUES (?,?,?,?,?,?,?,?,?)",
        (enc.get('cliente_id'), enc.get('cliente_nome',''), 'encomenda',
         enc.get('total',0), 0, enc.get('total',0),
         d.get('forma_pagamento','dinheiro'), 'pago',
         f"Gerado da encomenda {enc['numero']}: {enc['descricao'][:60]}")
    )
    venda_id = cur.lastrowid
    db.execute(
        "INSERT INTO venda_itens (venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
        (venda_id, enc['descricao'][:100], 1, enc.get('total',0), enc.get('total',0))
    )
    db.execute("UPDATE encomendas SET status='entregue' WHERE id=?", (id,))
    db.commit()
    venda = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=?", (venda_id,)).fetchone())
    db.close()
    return jsonify({'venda': venda, 'ok': True}), 201

# ─── DASHBOARD EVOLUÇÃO MENSAL ────────────────────────────────────────────────

@app.route('/api/dashboard/evolucao')
def dashboard_evolucao():
    db = get_db()
    meses = []
    for i in range(5, -1, -1):
        d = datetime.date.today().replace(day=1)
        mes_ref = datetime.date(d.year + (d.month - i - 1) // 12, ((d.month - i - 1) % 12) + 1, 1)
        mes_str = mes_ref.strftime('%Y-%m')
        label = mes_ref.strftime('%b/%y').capitalize()
        receita = db.execute(
            "SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE strftime('%Y-%m',criado_em)=? AND status='pago'",
            (mes_str,)
        ).fetchone()['v']
        despesa = db.execute(
            "SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE strftime('%Y-%m',data)=?",
            (mes_str,)
        ).fetchone()['v']
        meses.append({'mes': label, 'receita': round(receita, 2), 'despesa': round(despesa, 2), 'saldo': round(receita - despesa, 2)})
    db.close()
    return jsonify(meses)

# ─── TOP CLIENTES ─────────────────────────────────────────────────────────────

@app.route('/api/clientes/top')
def top_clientes():
    db = get_db()
    periodo = request.args.get('periodo', 'mes')
    if periodo == 'mes':
        filtro = f"AND strftime('%Y-%m', criado_em)='{datetime.date.today().strftime('%Y-%m')}'"
    elif periodo == 'ano':
        filtro = f"AND strftime('%Y', criado_em)='{datetime.date.today().year}'"
    else:
        filtro = ""
    rows = rows_to_list(db.execute(f"""
        SELECT cliente_nome, COUNT(*) as total_pedidos,
               SUM(total) as total_gasto,
               MAX(criado_em) as ultima_compra
        FROM vendas
        WHERE status='pago' AND cliente_nome != '' {filtro}
        GROUP BY cliente_nome
        ORDER BY total_gasto DESC
        LIMIT 10
    """).fetchall())
    db.close()
    return jsonify(rows)

# ─── DISPONIBILIDADE DE ITENS POR DATA ────────────────────────────────────────

@app.route('/api/itens-locacao/<int:id>/disponibilidade')
def disponibilidade_item(id):
    db = get_db()
    item = row_to_dict(db.execute("SELECT * FROM itens_locacao WHERE id=?", (id,)).fetchone())
    if not item:
        db.close()
        return jsonify({'erro': 'Item não encontrado'}), 404
    data_ini = request.args.get('data_ini', datetime.date.today().isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())
    em_uso = db.execute("""
        SELECT COALESCE(SUM(li.quantidade),0) as qtd
        FROM locacao_itens li
        JOIN locacoes l ON l.id = li.locacao_id
        WHERE li.item_id=? AND l.status='ativo'
          AND l.data_retirada <= ? AND l.data_devolucao >= ?
    """, (id, data_fim, data_ini)).fetchone()['qtd']
    total = item.get('quantidade_total', 0)
    disponivel = max(0, total - em_uso)
    db.close()
    return jsonify({
        'item_id': id,
        'nome': item['nome'],
        'total': total,
        'em_uso': em_uso,
        'disponivel': disponivel,
        'disponivel_pct': round(disponivel / total * 100) if total > 0 else 0
    })

# ─── BACKUP MANUAL ────────────────────────────────────────────────────────────

@app.route('/api/backup', methods=['POST'])
def backup_manual():
    import shutil
    try:
        from database import DB_PATH
        if not os.path.exists(DB_PATH):
            return jsonify({'erro': 'Banco não encontrado'}), 404
        backup_dir = os.path.join(BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        ts = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        dest = os.path.join(backup_dir, f'dripArt_manual_{ts}.db')
        shutil.copy2(DB_PATH, dest)
        size = os.path.getsize(dest)
        return jsonify({'ok': True, 'arquivo': os.path.basename(dest), 'tamanho_kb': round(size/1024, 1)})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/backup/lista')
def listar_backups():
    backup_dir = os.path.join(BASE_DIR, 'backups')
    if not os.path.exists(backup_dir):
        return jsonify([])
    files = sorted([f for f in os.listdir(backup_dir) if f.endswith('.db')], reverse=True)
    result = []
    for f in files[:20]:
        path = os.path.join(backup_dir, f)
        result.append({
            'arquivo': f,
            'tamanho_kb': round(os.path.getsize(path)/1024, 1),
            'data': f.replace('dripArt_','').replace('.db','').replace('_',' ')
        })
    return jsonify(result)

@app.route('/api/relatorios/despesas-categoria')
def relatorio_despesas_categoria():
    db = get_db()
    data_ini = request.args.get('data_ini', datetime.date.today().replace(day=1).isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())
    rows = rows_to_list(db.execute(
        "SELECT categoria, COUNT(*) as qtd, SUM(valor) as total FROM despesas WHERE data BETWEEN ? AND ? GROUP BY categoria ORDER BY total DESC",
        (data_ini, data_fim)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/fiado')
def listar_fiado():
    db = get_db()
    status_filter = request.args.get('status', '')
    if status_filter == 'atrasado':
        rows = rows_to_list(db.execute(
            "SELECT * FROM vendas WHERE status='fiado' AND data_vencimento < date('now') ORDER BY data_vencimento ASC"
        ).fetchall())
    elif status_filter == 'vencendo':
        rows = rows_to_list(db.execute(
            "SELECT * FROM vendas WHERE status='fiado' AND data_vencimento BETWEEN date('now') AND date('now','+7 days') ORDER BY data_vencimento ASC"
        ).fetchall())
    else:
        rows = rows_to_list(db.execute(
            "SELECT * FROM vendas WHERE status='fiado' ORDER BY data_vencimento ASC NULLS LAST"
        ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/vendas/<int:id>/receber', methods=['PUT'])
def receber_fiado(id):
    d = request.json or {}
    db = get_db()
    db.execute(
        "UPDATE vendas SET status='pago', forma_pagamento=? WHERE id=?",
        (d.get('forma_pagamento', 'dinheiro'), id)
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

# ─── PDF ENCOMENDA ────────────────────────────────────────────────────────────

@app.route('/api/encomendas/<int:id>/pdf')
def pdf_encomenda(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    db = get_db()
    enc = row_to_dict(db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone())
    if not enc:
        db.close()
        return jsonify({'erro': 'Encomenda nao encontrada'}), 404
    db.close()
    config = get_config()
    path = gerar_pdf_encomenda(enc, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

# ─── ESTOQUE ─────────────────────────────────────────────────────────────────

@app.route('/api/produtos/estoque-baixo')
def estoque_baixo():
    db = get_db()
    limite = int(request.args.get('limite', 5))
    rows = rows_to_list(db.execute(
        "SELECT * FROM produtos WHERE ativo=1 AND estoque <= ? ORDER BY estoque ASC",
        (limite,)
    ).fetchall())
    db.close()
    return jsonify(rows)

# ─── CONFIGURAÇÕES ─────────────────────────────────────────────────────────────

@app.route('/api/configuracoes', methods=['GET'])
def listar_config():
    cfg = get_config()
    # Ensure new social fields exist
    for k in ['empresa_whatsapp','empresa_instagram','empresa_site']:
        if k not in cfg:
            cfg[k] = ''
    return jsonify(cfg)

@app.route('/api/upload-logo', methods=['POST'])
def upload_logo():
    if 'logo' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400
    f = request.files['logo']
    if not f.filename:
        return jsonify({'erro': 'Arquivo inválido'}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
        return jsonify({'erro': 'Formato inválido. Use PNG, JPG ou GIF'}), 400
    logo_path = os.path.join(BASE_DIR, 'logo' + ext)
    f.save(logo_path)
    db = get_db()
    db.execute("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?,?)", ('logo_path', logo_path))
    db.commit()
    db.close()
    return jsonify({'ok': True, 'path': logo_path})

@app.route('/api/logo')
def ver_logo():
    config = get_config()
    path = config.get('logo_path', '')
    if path and os.path.exists(path):
        return send_file(path)
    return jsonify({'erro': 'Logo não configurada'}), 404

@app.route('/api/configuracoes', methods=['PUT'])
def salvar_config():
    d = request.json
    db = get_db()
    for chave, valor in d.items():
        db.execute("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?,?)", (chave, str(valor)))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── START ─────────────────────────────────────────────────────────────────────

def fazer_backup():
    import shutil
    try:
        from database import DB_PATH
        if not os.path.exists(DB_PATH):
            return
        backup_dir = os.path.join(BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        data = datetime.date.today().strftime('%Y-%m-%d')
        dest = os.path.join(backup_dir, f'dripArt_{data}.db')
        if not os.path.exists(dest):
            shutil.copy2(DB_PATH, dest)
            print(f"Backup criado: {dest}")
        # Manter apenas os 30 backups mais recentes
        backups = sorted([f for f in os.listdir(backup_dir) if f.endswith('.db')])
        for old in backups[:-30]:
            os.remove(os.path.join(backup_dir, old))
    except Exception as e:
        print(f"Aviso backup: {e}")

if __name__ == '__main__':
    init_db()
    fazer_backup()
    print("DripArt iniciando em http://localhost:5000")
    app.run(debug=False, port=5000, host='127.0.0.1')
