import sys

file_path = 'app.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('@app.route(\'/api/usuarios\', methods=[\'GET\'])')
if idx != -1:
    routes = """@app.route('/api/login', methods=['POST'])
def login():
    d = request.get_json(force=True, silent=True) or {}
    email = d.get('email', '')
    senha = d.get('senha', '')
    if not email or not senha:
        return jsonify({'erro': 'Email e senha obrigatórios'}), 400
    
    db = get_db()
    user = row_to_dict(db.execute("SELECT id, nome, email, role, ativo, senha_hash FROM usuarios WHERE email=?", (email,)).fetchone())
    db.close()
    
    if not user or user['ativo'] == 0:
        return jsonify({'erro': 'Usuário inválido ou inativo'}), 401
        
    import hashlib
    senha_hash = hashlib.sha256(senha.encode()).hexdigest()
    if user['senha_hash'] != senha_hash:
        return jsonify({'erro': 'Senha incorreta'}), 401
        
    del user['senha_hash']
    return jsonify(user)

"""
    new_content = content[:idx] + routes + content[idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Login route added.")
else:
    print("Could not find anchor.")
