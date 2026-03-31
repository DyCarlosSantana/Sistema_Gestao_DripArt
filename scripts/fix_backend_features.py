import sys
import os

file_path = os.path.abspath('app.py')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Host
old_run = "app.run(debug=False, port=5000, host='127.0.0.1')"
new_run = "app.run(debug=False, port=5000, host='0.0.0.0')"
content = content.replace(old_run, new_run)

# Add make_response (if not there)
if 'from flask import make_response' not in content:
    content = content.replace("from flask import Flask, jsonify, request, send_file, render_template, g", 
                              "from flask import Flask, jsonify, request, send_file, render_template, g, make_response")

# New features block
new_features = """
# ─── NOVAS FUNCOES (DRE, EXPORTACAO, E CONVERSAO) ─────────────────────────

import csv, io

@app.route('/api/dashboard/dre')
def get_dre():
    db = get_db()
    vendas = db.execute("SELECT strftime('%Y-%m', criado_em) as mes, SUM(total) as val FROM vendas WHERE status='pago' GROUP BY mes").fetchall()
    locacoes = db.execute("SELECT strftime('%Y-%m', criado_em) as mes, SUM(total) as val FROM locacoes WHERE status='pago' OR status='ativo' GROUP BY mes").fetchall()
    despesas = db.execute("SELECT strftime('%Y-%m', data_vencimento) as mes, SUM(valor) as val FROM despesas WHERE status='pago' GROUP BY mes").fetchall()
    db.close()
    
    try:
        meses_set = set([r['mes'] for r in vendas if r['mes']] + [r['mes'] for r in locacoes if r['mes']] + [r['mes'] for r in despesas if r['mes']])
        meses = sorted(list(meses_set))
        
        dre = []
        for mes in meses:
            v = sum([r['val'] for r in vendas if r['mes'] == mes])
            l = sum([r['val'] for r in locacoes if r['mes'] == mes])
            d = sum([r['val'] for r in despesas if r['mes'] == mes])
            receita = (v or 0) + (l or 0)
            despesa = d or 0
            dre.append({
                'mes': mes,
                'receitas': receita,
                'despesas': despesa,
                'lucro': receita - despesa
            })
        return jsonify(dre)
    except Exception as e:
        print("Erro DRE:", e)
        return jsonify([])

@app.route('/api/vendas/exportar')
def exportar_vendas_csv():
    db = get_db()
    rows = db.execute("SELECT * FROM vendas ORDER BY criado_em DESC").fetchall()
    db.close()
    
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['ID', 'Data', 'Cliente', 'Tipo', 'Forma Pgto', 'Status', 'Total'])
    for r in rows:
        cw.writerow([r['id'], r['criado_em'], r['cliente_nome'], r['tipo'], r['forma_pagamento'], r['status'], r['total']])
    
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=export_vendas.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/locacoes/exportar')
def exportar_locacoes_csv():
    db = get_db()
    rows = db.execute("SELECT * FROM locacoes ORDER BY criado_em DESC").fetchall()
    db.close()
    
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['ID', 'Data', 'Cliente', 'Retirada', 'Devolucao', 'Forma Pgto', 'Status', 'Total'])
    for r in rows:
        cw.writerow([r['id'], r['criado_em'], r['cliente_nome'], r['data_retirada'], r['data_devolucao'], r['forma_pagamento'], r['status'], r['total']])
    
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=export_locacoes.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/orcamentos/<int:id>/converter-locacao', methods=['POST'])
def converter_orcamento_locacao(id):
    db = get_db()
    orc = row_to_dict(db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone())
    if not orc: 
        db.close()
        return jsonify({'erro': 'Orçamento não encontrado'}), 404
        
    itens = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    
    cur = db.execute(
        "INSERT INTO locacoes (cliente_nome, tipo, data_retirada, data_devolucao, subtotal, desconto, total, forma_pagamento, status) VALUES (?,?,?,?,?,?,?,?,?)",
        (orc.get('cliente_nome',''), 'item', orc.get('data_evento',''), orc.get('data_evento',''), orc.get('subtotal',0), orc.get('desconto',0), orc.get('total',0), '', 'pendente')
    )
    loc_id = cur.lastrowid
    
    for item in itens:
        db.execute(
            "INSERT INTO locacao_itens (locacao_id, nome, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?)",
            (loc_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    
    db.execute("UPDATE orcamentos SET status='aprovado' WHERE id=?", (id,))
    
    db.commit()
    db.close()
    return jsonify({'ok': True, 'locacao_id': loc_id})

"""

content = content.replace("# ─── FRONTEND (React App) ─────────────────────────────────────────────────────", new_features + "\n# ─── FRONTEND (React App) ─────────────────────────────────────────────────────")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("app.py features updated.")
