import sys

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 60 to 119
del lines[60:120]

content = ''.join(lines)
idx = content.find('# ─── FRONTEND (React App)')
if idx != -1:
    config_routes = """# ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

@app.route('/api/configuracoes', methods=['GET'])
def ler_configuracoes():
    return jsonify(get_config())

@app.route('/api/configuracoes', methods=['POST'])
def salvar_configuracoes():
    db = get_db()
    data = request.get_json(force=True, silent=True) or {}
    for k, v in data.items():
        db.execute(
            "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor=?",
            (k, str(v), str(v))
        )
    db.commit()
    db.close()
    return jsonify({'ok': True})

"""
    content = content[:idx] + config_routes + content[idx:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("app.py repaired and configured!")
