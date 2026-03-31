import sys

file_path = 'app.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('# ─── CONFIGURAÇÕES')
if idx != -1:
    routes = """# ─── USUÁRIOS ─────────────────────────────────────────────────────────────────

import hashlib

@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    db = get_db()
    rows = db.execute("SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE ativo=1").fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/usuarios', methods=['POST'])
def criar_usuario():
    d = request.get_json(force=True, silent=True) or {}
    senha = d.get('senha', '')
    senha_hash = hashlib.sha256(senha.encode()).hexdigest() if senha else ''
    
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)",
            (d.get('nome',''), d.get('email',''), senha_hash, d.get('role','operador'))
        )
        db.commit()
        user_id = cur.lastrowid
        row = db.execute("SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE id=?", (user_id,)).fetchone()
    except Exception as e:
        db.close()
        return jsonify({"erro": str(e)}), 400
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/usuarios/<int:id>', methods=['PUT'])
def atualizar_usuario(id):
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    
    if d.get('senha'):
        senha_hash = hashlib.sha256(d['senha'].encode()).hexdigest()
        db.execute(
            "UPDATE usuarios SET nome=?, email=?, role=?, senha_hash=? WHERE id=?",
            (d.get('nome',''), d.get('email',''), d.get('role','operador'), senha_hash, id)
        )
    else:
        db.execute(
            "UPDATE usuarios SET nome=?, email=?, role=? WHERE id=?",
            (d.get('nome',''), d.get('email',''), d.get('role','operador'), id)
        )
        
    db.commit()
    row = db.execute("SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def deletar_usuario(id):
    db = get_db()
    # Check if this is the last admin
    row = db.execute("SELECT role FROM usuarios WHERE id=?", (id,)).fetchone()
    if row and row['role'] == 'admin':
        admin_count = db.execute("SELECT COUNT(*) FROM usuarios WHERE role='admin' AND ativo=1").fetchone()[0]
        if admin_count <= 1:
            db.close()
            return jsonify({'erro': 'Não é possível remover o último administrador.'}), 400

    db.execute("UPDATE usuarios SET ativo=0 WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

"""
    new_content = content[:idx] + routes + content[idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Usuarios routes added.")
else:
    print("Could not find anchor.")
