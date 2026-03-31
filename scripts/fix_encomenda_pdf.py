import sys

file_path = 'app.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('''@app.route('/api/encomendas/<int:id>/status', methods=['PUT'])''')
if idx != -1:
    routes = """@app.route('/api/encomendas/<int:id>/pdf')
def pdf_encomenda(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    db = get_db()
    enc = row_to_dict(db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone())
    db.close()
    if not enc:
        return jsonify({'erro': 'Enconeda nao encontrada'}), 404
        
    config = get_config()
    path = gerar_pdf_encomenda(enc, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

"""
    new_content = content[:idx] + routes + content[idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("PDF Encomendas route added.")
else:
    print("Could not find anchor.")
