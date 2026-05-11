from flask import Flask, request, jsonify, send_file, render_template, make_response
from database import get_db, init_db
from auth import require_auth, require_admin, gerar_token, get_current_user, get_empresa_id
import datetime, os, json

# Carrega variáveis de ambiente do .env (se existir)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv opcional em desenvolvimento local

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = BASE_DIR
TEMPLATE_DIR = os.path.join(BASE_DIR, 'decor-venue-flow-main', 'dist')
STATIC_DIR = os.path.join(BASE_DIR, 'decor-venue-flow-main', 'dist')

print(f"Pasta: {BASE_DIR}")

try:
    from pdf_generator import gerar_orcamento_pdf, gerar_nota_venda_pdf, gerar_pdf_locacao, gerar_relatorio_pdf, gerar_pdf_encomenda
    PDF_OK = True
except ImportError:
    PDF_OK = False
    print("AVISO: reportlab nao encontrado. PDFs desabilitados.")

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR, static_url_path='/_static_hidden')

# CORS manual - permite acesso do navegador local
@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    return response

@app.errorhandler(Exception)
def handle_error(e):
    from werkzeug.exceptions import HTTPException
    
    if isinstance(e, HTTPException):
        if e.code != 404:
            import traceback
            print("ERRO HTTP:", traceback.format_exc())
        return jsonify({'erro': e.description, 'tipo': e.name}), e.code
        
    import traceback
    print("ERRO INTERNO:", traceback.format_exc())
    return jsonify({'erro': str(e), 'tipo': type(e).__name__}), 500

# ─── UTILS ────────────────────────────────────────────────────────────────────

import decimal

def _clean_value(v):
    """Converte tipos PostgreSQL (Decimal, datetime, date) para tipos JSON-safe."""
    if v is None:
        return v
    if isinstance(v, decimal.Decimal):
        return float(v)
    if isinstance(v, datetime.datetime):
        return v.isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, datetime.timedelta):
        return v.total_seconds()
    if isinstance(v, bytes):
        return v.decode('utf-8', errors='replace')
    return v

def _clean_dict(d):
    """Limpa um dicionário de linha do banco convertendo todos os tipos não-serializáveis."""
    if not d:
        return d
    return {k: _clean_value(v) for k, v in d.items()}

def row_to_dict(row):
    return _clean_dict(dict(row)) if row else None

def rows_to_list(rows):
    return [_clean_dict(dict(r)) for r in rows]

# JSON encoder customizado para Flask — camada de segurança extra
from flask.json.provider import DefaultJSONProvider
class DycoreJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        if isinstance(o, (datetime.datetime, datetime.date)):
            return o.isoformat()
        if isinstance(o, datetime.timedelta):
            return o.total_seconds()
        if isinstance(o, bytes):
            return o.decode('utf-8', errors='replace')
        return super().default(o)

app.json_provider_class = DycoreJSONProvider
app.json = DycoreJSONProvider(app)

def get_config(eid: int = 1):
    db = get_db()
    rows = db.execute("SELECT chave, valor FROM configuracoes WHERE empresa_id=?", (eid,)).fetchall()
    db.close()
    return {r['chave']: r['valor'] for r in rows}

def proximo_numero_orcamento(eid: int = 1):
    db = get_db()
    row = db.execute("SELECT COUNT(*) as c FROM orcamentos WHERE empresa_id=?", (eid,)).fetchone()
    n = (row['c'] or 0) + 1
    db.close()
    return f"ORC-{n:04d}"

def proximo_numero_encomenda(eid: int = 1):
    db = get_db()
    row = db.execute("SELECT COUNT(*) as c FROM encomendas WHERE empresa_id=?", (eid,)).fetchone()
    n = (row['c'] or 0) + 1
    db.close()
    return f"ENC-{n:04d}"

# ─── EMPRESAS (MULTI-TENANCY) ────────────────────────────────────────────

@app.route('/api/empresas/registrar', methods=['POST'])
def registrar_empresa():
    """Endpoint público para cadastro de nova empresa (onboarding SaaS)."""
    d = request.get_json(force=True, silent=True) or {}
    nome = d.get('nome', '').strip()
    email = d.get('email', '').strip()
    senha = d.get('senha', '')
    if not nome or not email or not senha:
        return jsonify({'erro': 'Nome, email e senha são obrigatórios'}), 400

    from werkzeug.security import generate_password_hash
    db = get_db()
    # Verifica se já existe usuário com este email
    existing = db.execute("SELECT id FROM usuarios WHERE email=?", (email,)).fetchone()
    if existing:
        db.close()
        return jsonify({'erro': 'Email já cadastrado'}), 409

    try:
        # Cria a empresa
        cur = db.execute(
            "INSERT INTO empresas (nome, cnpj, email, telefone, plano, ativo) VALUES (?,?,?,?,?,?)",
            (nome, d.get('cnpj',''), email, d.get('telefone',''), 'basico', 1)
        )
        empresa_id = cur.lastrowid

        # Cria o usuário admin da empresa
        senha_hash = generate_password_hash(senha)
        cur2 = db.execute(
            "INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role) VALUES (?,?,?,?,?)",
            (empresa_id, d.get('nome_admin', nome), email, senha_hash, 'admin')
        )
        user_id = cur2.lastrowid

        # Configurações padrão para a nova empresa
        configs_padrao = [
            (empresa_id, 'empresa_nome', nome),
            (empresa_id, 'empresa_email', email),
            (empresa_id, 'empresa_telefone', d.get('telefone','')),
            (empresa_id, 'empresa_cnpj', d.get('cnpj','')),
            (empresa_id, 'empresa_whatsapp', ''),
            (empresa_id, 'empresa_instagram', ''),
            (empresa_id, 'empresa_site', ''),
            (empresa_id, 'empresa_endereco', ''),
            (empresa_id, 'logo_path', ''),
            (empresa_id, 'orcamento_validade_dias', '7'),
        ]
        db.executemany("INSERT OR IGNORE INTO configuracoes (empresa_id, chave, valor) VALUES (?,?,?)", configs_padrao)
        db.commit()

        user = {'id': user_id, 'nome': d.get('nome_admin', nome), 'email': email, 'role': 'admin', 'empresa_id': empresa_id}
        token = gerar_token(user)
        db.close()
        return jsonify({'ok': True, 'empresa_id': empresa_id, 'token': token, 'user': user}), 201
    except Exception as e:
        db.close()
        return jsonify({'erro': str(e)}), 400

@app.route('/api/empresas/minha', methods=['GET'])
@require_auth
def minha_empresa():
    """Retorna os dados da empresa do usuário autenticado."""
    eid = get_empresa_id()
    db = get_db()
    empresa = row_to_dict(db.execute("SELECT * FROM empresas WHERE id=?", (eid,)).fetchone())
    db.close()
    if not empresa:
        return jsonify({'erro': 'Empresa não encontrada'}), 404
    return jsonify(empresa)

@app.route('/api/empresas/minha', methods=['PUT'])
@require_auth
@require_admin
def atualizar_empresa():
    """Atualiza os dados cadastrais da empresa (somente admin)."""
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE empresas SET nome=?, cnpj=?, email=?, telefone=? WHERE id=?",
        (d.get('nome',''), d.get('cnpj',''), d.get('email',''), d.get('telefone',''), eid)
    )
    db.commit()
    empresa = row_to_dict(db.execute("SELECT * FROM empresas WHERE id=?", (eid,)).fetchone())
    db.close()
    return jsonify(empresa)

# ─── AUTENTICAÇÃO E USUÁRIOS ──────────────────────────────────────────────────

from werkzeug.security import generate_password_hash, check_password_hash

@app.route('/api/login', methods=['POST'])
def login():
    d = request.get_json(force=True, silent=True) or {}
    email = d.get('email', '')
    senha = d.get('senha', '')
    if not email or not senha:
        return jsonify({'erro': 'Email e senha obrigatórios'}), 400
    
    db = get_db()
    user = row_to_dict(db.execute(
        "SELECT id, nome, email, role, ativo, senha_hash, empresa_id, cargo_id FROM usuarios WHERE email=?",
        (email,)
    ).fetchone())
    
    if not user or user.get('ativo') == 0:
        db.close()
        return jsonify({'erro': 'Usuário inválido ou inativo'}), 401
        
    if not check_password_hash(user['senha_hash'], senha):
        db.close()
        return jsonify({'erro': 'Senha incorreta'}), 401
    
    permissoes = []
    if user.get('cargo_id'):
        p_rows = db.execute("SELECT permissao FROM cargo_permissoes WHERE cargo_id=?", (user['cargo_id'],)).fetchall()
        permissoes = [p['permissao'] for p in p_rows]
    elif user['role'] == 'admin':
        permissoes = ['*']
        
    db.close()
    
    del user['senha_hash']
    user['permissoes'] = permissoes
    token = gerar_token(user)
    return jsonify({
        'ok': True,
        'token': token,
        'user': user
    })

# ─── CARGOS SEC ───────────────────────────────────────────────────────────────

@app.route('/api/cargos', methods=['GET'])
@require_auth
def listar_cargos():
    eid = get_empresa_id()
    db = get_db()
    cargos = rows_to_list(db.execute("SELECT * FROM cargos WHERE empresa_id=? AND ativo=1", (eid,)).fetchall())
    for c in cargos:
        p_rows = db.execute("SELECT permissao FROM cargo_permissoes WHERE cargo_id=?", (c['id'],)).fetchall()
        c['permissoes'] = [p['permissao'] for p in p_rows]
    db.close()
    return jsonify(cargos)

@app.route('/api/cargos', methods=['POST'])
@require_auth
@require_admin
def criar_cargo():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute("INSERT INTO cargos (empresa_id, nome, descricao) VALUES (?,?,?)", (eid, d.get('nome',''), d.get('descricao','')))
    cargo_id = cur.lastrowid
    for p in d.get('permissoes', []):
        db.execute("INSERT INTO cargo_permissoes (cargo_id, permissao) VALUES (?,?)", (cargo_id, p))
    db.commit()
    row = db.execute("SELECT * FROM cargos WHERE id=?", (cargo_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/cargos/<int:id>', methods=['PUT', 'DELETE'])
@require_auth
@require_admin
def gerenciar_cargo(id):
    eid = get_empresa_id()
    db = get_db()
    if request.method == 'DELETE':
        db.execute("UPDATE cargos SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
        db.execute("UPDATE usuarios SET cargo_id=NULL WHERE cargo_id=?", (id,))
        db.commit()
        db.close()
        return jsonify({'ok': True})
    else:
        d = request.get_json(force=True, silent=True) or {}
        db.execute("UPDATE cargos SET nome=?, descricao=? WHERE id=? AND empresa_id=?", (d.get('nome',''), d.get('descricao',''), id, eid))
        db.execute("DELETE FROM cargo_permissoes WHERE cargo_id=?", (id,))
        for p in d.get('permissoes', []):
            db.execute("INSERT INTO cargo_permissoes (cargo_id, permissao) VALUES (?,?)", (id, p))
        db.commit()
        row = db.execute("SELECT * FROM cargos WHERE id=?", (id,)).fetchone()
        db.close()
        return jsonify(row_to_dict(row))

@app.route('/api/me', methods=['GET'])
@require_auth
def me():
    """Retorna os dados do usuário autenticado pela sessão JWT atual."""
    return jsonify(get_current_user())


@app.route('/api/usuarios', methods=['GET'])
@require_auth
@require_admin
def listar_usuarios():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute(
        "SELECT id, nome, email, role, ativo, ultimo_login, cargo_id FROM usuarios WHERE ativo=1 AND empresa_id=?",
        (eid,)
    ).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/usuarios', methods=['POST'])
@require_auth
@require_admin
def criar_usuario():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    senha = d.get('senha', '')
    senha_hash = generate_password_hash(senha) if senha else generate_password_hash('123456')
    cargo_id = d.get('cargo_id') or None
    
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role, cargo_id) VALUES (?,?,?,?,?,?)",
            (eid, d.get('nome',''), d.get('email',''), senha_hash, d.get('role','operador'), cargo_id)
        )
        db.commit()
        user_id = cur.lastrowid
        row = db.execute("SELECT id, nome, email, role, ativo, cargo_id FROM usuarios WHERE id=?", (user_id,)).fetchone()
    except Exception as e:
        db.close()
        return jsonify({"erro": str(e)}), 400
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/usuarios/<int:id>', methods=['PUT'])
@require_auth
@require_admin
def atualizar_usuario(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cargo_id = d.get('cargo_id') or None
    
    if d.get('senha'):
        senha_hash = generate_password_hash(d['senha'])
        db.execute(
            "UPDATE usuarios SET nome=?, email=?, role=?, senha_hash=?, cargo_id=? WHERE id=? AND empresa_id=?",
            (d.get('nome',''), d.get('email',''), d.get('role','operador'), senha_hash, cargo_id, id, eid)
        )
    else:
        db.execute(
            "UPDATE usuarios SET nome=?, email=?, role=?, cargo_id=? WHERE id=? AND empresa_id=?",
            (d.get('nome',''), d.get('email',''), d.get('role','operador'), cargo_id, id, eid)
        )
        
    db.commit()
    row = db.execute("SELECT id, nome, email, role, ativo, cargo_id FROM usuarios WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_usuario(id):
    eid = get_empresa_id()
    db = get_db()
    row = db.execute("SELECT role FROM usuarios WHERE id=? AND empresa_id=?", (id, eid)).fetchone()
    if row and row['role'] == 'admin':
        admin_count = db.execute(
            "SELECT COUNT(*) FROM usuarios WHERE role='admin' AND ativo=1 AND empresa_id=?", (eid,)
        ).fetchone()[0]
        if admin_count <= 1:
            db.close()
            return jsonify({'erro': 'Não é possível remover o último administrador.'}), 400

    db.execute("UPDATE usuarios SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

@app.route('/api/configuracoes', methods=['GET'])
@require_auth
def ler_configuracoes():
    eid = get_empresa_id()
    return jsonify(get_config(eid))

@app.route('/api/configuracoes', methods=['POST'])
@require_auth
@require_admin
def salvar_configuracoes():
    eid = get_empresa_id()
    db = get_db()
    data = request.get_json(force=True, silent=True) or {}
    for k, v in data.items():
        db.execute(
            "INSERT INTO configuracoes (empresa_id, chave, valor) VALUES (?,?,?) ON CONFLICT(empresa_id, chave) DO UPDATE SET valor=?",
            (eid, k, str(v), str(v))
        )
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/upload/logo', methods=['POST'])
@require_auth
@require_admin
def upload_logo():
    import base64
    from PIL import Image
    from io import BytesIO
    if 'file' not in request.files: return jsonify({'erro': 'No file'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'erro': 'Empty file'}), 400
    try:
        img = Image.open(file.stream)
        img.thumbnail((300, 300))
        buffer = BytesIO()
        img.save(buffer, format=img.format or 'PNG')
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
        mime = f"image/{img.format.lower()}" if img.format else "image/png"
        data_uri = f"data:{mime};base64,{encoded}"
        eid = get_empresa_id()
        db = get_db()
        db.execute("INSERT INTO configuracoes (empresa_id, chave, valor) VALUES (?,?,?) ON CONFLICT(empresa_id, chave) DO UPDATE SET valor=?", (eid, 'empresa_logo', data_uri, data_uri))
        db.commit()
        db.close()
        return jsonify({'ok': True, 'logo': data_uri})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# ─── MÓDULOS DA EMPRESA ───────────────────────────────────────────────────────

@app.route('/api/configuracoes/modulos', methods=['GET'])
@require_auth
def listar_modulos():
    eid = get_empresa_id()
    db = get_db()
    rows = rows_to_list(db.execute(
        "SELECT * FROM modulos_empresa WHERE empresa_id=?", (eid,)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/configuracoes/modulos/toggle', methods=['POST'])
@require_auth
@require_admin
def toggle_modulo():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    modulo = d.get('modulo', '')
    ativo = 1 if d.get('ativo', True) else 0
    if not modulo:
        return jsonify({'erro': 'Modulo obrigatório'}), 400
    db = get_db()
    existing = db.execute(
        "SELECT id FROM modulos_empresa WHERE empresa_id=? AND modulo=?", (eid, modulo)
    ).fetchone()
    if existing:
        db.execute(
            "UPDATE modulos_empresa SET ativo=? WHERE empresa_id=? AND modulo=?",
            (ativo, eid, modulo)
        )
    else:
        db.execute(
            "INSERT INTO modulos_empresa (empresa_id, modulo, ativo) VALUES (?,?,?)",
            (eid, modulo, ativo)
        )
    db.commit()
    db.close()
    return jsonify({'ok': True, 'modulo': modulo, 'ativo': ativo})

# ─── CATEGORIAS DE DESPESA ────────────────────────────────────────────────────

@app.route('/api/configuracoes/categorias-despesa', methods=['GET'])
@require_auth
def listar_categorias_despesa():
    eid = get_empresa_id()
    db = get_db()
    rows = rows_to_list(db.execute(
        "SELECT * FROM categorias_despesa WHERE empresa_id=? AND ativo=1 ORDER BY padrao DESC, nome ASC",
        (eid,)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/configuracoes/categorias-despesa', methods=['POST'])
@require_auth
@require_admin
def criar_categoria_despesa():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    nome = d.get('nome', '').strip()
    if not nome:
        return jsonify({'erro': 'Nome obrigatório'}), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO categorias_despesa (empresa_id, nome, cor, padrao) VALUES (?,?,?,?)",
        (eid, nome, d.get('cor', '#6B7280'), 0)
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM categorias_despesa WHERE id=?", (cur.lastrowid,)).fetchone())
    db.close()
    return jsonify(row), 201

@app.route('/api/configuracoes/categorias-despesa/<int:id>', methods=['PUT'])
@require_auth
@require_admin
def atualizar_categoria_despesa(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE categorias_despesa SET nome=?, cor=? WHERE id=? AND empresa_id=? AND padrao=0",
        (d.get('nome', ''), d.get('cor', '#6B7280'), id, eid)
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM categorias_despesa WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

@app.route('/api/configuracoes/categorias-despesa/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def excluir_categoria_despesa(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute(
        "UPDATE categorias_despesa SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid)
    )
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── FORMAS DE PAGAMENTO ──────────────────────────────────────────────────────

@app.route('/api/configuracoes/formas-pagamento', methods=['GET'])
@require_auth
def listar_formas_pagamento():
    eid = get_empresa_id()
    db = get_db()
    rows = rows_to_list(db.execute(
        "SELECT * FROM formas_pagamento WHERE empresa_id=? AND ativo=1 ORDER BY padrao DESC, nome ASC",
        (eid,)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/configuracoes/formas-pagamento', methods=['POST'])
@require_auth
@require_admin
def criar_forma_pagamento():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    nome = d.get('nome', '').strip()
    if not nome:
        return jsonify({'erro': 'Nome obrigatório'}), 400
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO formas_pagamento (empresa_id, nome, tipo, padrao) VALUES (?,?,?,?)",
            (eid, nome, d.get('tipo', 'outros'), 0)
        )
        db.commit()
        row = row_to_dict(db.execute("SELECT * FROM formas_pagamento WHERE id=?", (cur.lastrowid,)).fetchone())
        db.close()
        return jsonify(row), 201
    except Exception as e:
        db.close()
        return jsonify({'erro': 'Forma de pagamento já existe'}), 409

@app.route('/api/configuracoes/formas-pagamento/<int:id>', methods=['PUT'])
@require_auth
@require_admin
def atualizar_forma_pagamento(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE formas_pagamento SET nome=?, tipo=? WHERE id=? AND empresa_id=?",
        (d.get('nome', ''), d.get('tipo', 'outros'), id, eid)
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM formas_pagamento WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

@app.route('/api/configuracoes/formas-pagamento/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def excluir_forma_pagamento(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute(
        "UPDATE formas_pagamento SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid)
    )
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── ALTERAR PRÓPRIA SENHA ────────────────────────────────────────────────────

@app.route('/api/me/senha', methods=['PUT'])
@require_auth
def alterar_minha_senha():
    """Permite ao usuário logado trocar a própria senha."""
    user = get_current_user()
    d = request.get_json(force=True, silent=True) or {}
    senha_atual = d.get('senha_atual', '')
    nova_senha = d.get('nova_senha', '')
    if not senha_atual or not nova_senha:
        return jsonify({'erro': 'Senha atual e nova senha são obrigatórias'}), 400
    if len(nova_senha) < 4:
        return jsonify({'erro': 'A nova senha deve ter pelo menos 4 caracteres'}), 400

    db = get_db()
    row = db.execute("SELECT senha_hash FROM usuarios WHERE id=?", (user['sub'],)).fetchone()
    if not row or not check_password_hash(row['senha_hash'], senha_atual):
        db.close()
        return jsonify({'erro': 'Senha atual incorreta'}), 401

    db.execute(
        "UPDATE usuarios SET senha_hash=? WHERE id=?",
        (generate_password_hash(nova_senha), user['sub'])
    )
    db.commit()
    db.close()
    return jsonify({'ok': True, 'mensagem': 'Senha alterada com sucesso'})

# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@app.route('/api/dashboard')
@require_auth
def dashboard():
    eid = get_empresa_id()
    db = get_db()
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date().isoformat()
    amanha = (datetime.datetime.utcnow() - datetime.timedelta(hours=3) + datetime.timedelta(days=1)).date().isoformat()
    tres_dias = ((datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date() + datetime.timedelta(days=3)).isoformat()
    sete_dias = ((datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date() + datetime.timedelta(days=7)).isoformat()

    data_ini = request.args.get('data_ini')
    data_fim = request.args.get('data_fim')
    
    if data_ini and data_fim:
        periodo_ini = data_ini
        periodo_fim = (datetime.datetime.strptime(data_fim, "%Y-%m-%d") + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        mes_atual = hoje[:7]
        periodo_ini = mes_atual + "-01"
        periodo_fim = ((datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date().replace(day=28) + datetime.timedelta(days=4)).replace(day=1).isoformat()

    tres_dias = ((datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date() + datetime.timedelta(days=3)).isoformat()
    sete_dias = ((datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date() + datetime.timedelta(days=7)).isoformat()

    receita_mes = db.execute(
        "SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE criado_em >= ? AND criado_em < ? AND (status='pago' OR status='Pago') AND empresa_id=?",
        (periodo_ini, periodo_fim, eid)
    ).fetchone()['v']

    vendas_hoje = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE criado_em >= ? AND criado_em < ? AND (status='pago' OR status='Pago') AND empresa_id=?",
        (periodo_ini, periodo_fim, eid)
    ).fetchone()

    locacoes_ativas = db.execute(
        "SELECT COUNT(*) as c FROM locacoes WHERE status='ativo' AND empresa_id=?", (eid,)
    ).fetchone()['c']

    locacoes_vencendo = db.execute(
        "SELECT COUNT(*) as c FROM locacoes WHERE status='ativo' AND data_devolucao <= ? AND empresa_id=?",
        (tres_dias, eid)
    ).fetchone()['c']

    orcamentos_abertos = db.execute(
        "SELECT COUNT(*) as c FROM orcamentos WHERE status='aberto' AND empresa_id=?", (eid,)
    ).fetchone()['c']

    receita_categorias = db.execute("""
        SELECT tipo, COALESCE(SUM(total),0) as total
        FROM vendas
        WHERE criado_em >= ? AND criado_em < ? AND (status='pago' OR status='Pago' OR status='fiado') AND empresa_id=?
        GROUP BY tipo
    """, (periodo_ini, periodo_fim, eid)).fetchall()

    ultimas_movs = db.execute("""
        SELECT 'venda' as origem, id, cliente_nome, tipo as descricao, total, status, criado_em
        FROM vendas WHERE empresa_id=? ORDER BY criado_em DESC LIMIT 5
    """, (eid,)).fetchall()

    locacoes_recentes = db.execute("""
        SELECT id, cliente_nome, data_devolucao, total, status, criado_em
        FROM locacoes WHERE empresa_id=? ORDER BY criado_em DESC LIMIT 5
    """, (eid,)).fetchall()

    alertas_locacao = rows_to_list(db.execute("""
        SELECT id, cliente_nome, data_devolucao, total,
               CASE
                 WHEN data_devolucao < ? THEN 'atrasada'
                 WHEN data_devolucao = ? THEN 'hoje'
                 ELSE 'em_breve'
               END as urgencia
        FROM locacoes
        WHERE status='ativo' AND data_devolucao <= ? AND empresa_id=?
        ORDER BY data_devolucao ASC
    """, (hoje, hoje, tres_dias, eid)).fetchall())

    fiado_atrasado = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE status='fiado' AND data_vencimento < ? AND empresa_id=?",
        (hoje, eid)
    ).fetchone()
    fiado_vencendo = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE status='fiado' AND data_vencimento >= ? AND data_vencimento <= ? AND empresa_id=?",
        (hoje, sete_dias, eid)
    ).fetchone()
    fiado_total = db.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as v FROM vendas WHERE status='fiado' AND empresa_id=?",
        (eid,)
    ).fetchone()

    mes_saidas = db.execute(
        "SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE data >= ? AND data < ? AND empresa_id=?",
        (periodo_ini, periodo_fim, eid)
    ).fetchone()['v']

    encomendas_pendentes = db.execute(
        "SELECT COUNT(*) as c FROM encomendas WHERE status NOT IN ('entregue') AND empresa_id=?", (eid,)
    ).fetchone()['c']
    encomendas_atrasadas = db.execute(
        "SELECT COUNT(*) as c FROM encomendas WHERE status NOT IN ('entregue') AND data_entrega IS NOT NULL AND data_entrega < ? AND empresa_id=?",
        (hoje, eid)
    ).fetchone()['c']
    locacoes_atrasadas = db.execute(
        "SELECT COUNT(*) as c FROM locacoes WHERE status='ativo' AND data_devolucao < ? AND empresa_id=?",
        (hoje, eid)
    ).fetchone()['c']

    db.close()
    return jsonify({
        'receita_mes': float(receita_mes or 0),
        'vendas_hoje_count': int(vendas_hoje['c'] or 0),
        'vendas_hoje_total': float(vendas_hoje['v'] or 0),
        'locacoes_ativas': int(locacoes_ativas or 0),
        'locacoes_vencendo': int(locacoes_vencendo or 0),
        'locacoes_atrasadas': int(locacoes_atrasadas or 0),
        'fiado_atrasado_count': int(fiado_atrasado['c'] or 0),
        'fiado_atrasado_valor': float(fiado_atrasado['v'] or 0),
        'fiado_vencendo_count': int(fiado_vencendo['c'] or 0),
        'fiado_total_count': int(fiado_total['c'] or 0),
        'fiado_total_valor': float(fiado_total['v'] or 0),
        'saldo_mes': float((receita_mes or 0) - (mes_saidas or 0)),
        'mes_saidas': float(mes_saidas or 0),
        'encomendas_pendentes': int(encomendas_pendentes or 0),
        'encomendas_atrasadas': int(encomendas_atrasadas or 0),
        'alertas_locacao': alertas_locacao,
        'orcamentos_abertos': int(orcamentos_abertos or 0),
        'receita_categorias': [{'tipo': rc['tipo'], 'total': float(rc['total'] or 0)} for rc in receita_categorias],
        'ultimas_movimentacoes': [{
            'origem': um['origem'],
            'id': um['id'],
            'cliente_nome': um['cliente_nome'],
            'descricao': um['descricao'],
            'total': float(um['total'] or 0),
            'status': um['status'],
            'criado_em': _clean_value(um['criado_em'])
        } for um in ultimas_movs],
        'locacoes_recentes': [{
            'id': l['id'],
            'cliente_nome': l['cliente_nome'],
            'data_devolucao': _clean_value(l['data_devolucao']),
            'total': float(l['total'] or 0),
            'status': l['status'],
            'criado_em': _clean_value(l['criado_em'])
        } for l in locacoes_recentes],
    })

# ─── CLIENTES ─────────────────────────────────────────────────────────────────

@app.route('/api/clientes', methods=['GET'])
@require_auth
def listar_clientes():
    eid = get_empresa_id()
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM clientes WHERE empresa_id=? AND nome LIKE ? ORDER BY nome", (eid, f'%{q}%')).fetchall()
    else:
        rows = db.execute("SELECT * FROM clientes WHERE empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/clientes', methods=['POST'])
@require_auth
def criar_cliente():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO clientes (empresa_id, nome, telefone, email, cpf_cnpj, endereco, obs) VALUES (?,?,?,?,?,?,?)",
        (eid, d.get('nome',''), d.get('telefone',''), d.get('email',''), d.get('cpf_cnpj',''), d.get('endereco',''), d.get('obs',''))
    )
    db.commit()
    row = db.execute("SELECT * FROM clientes WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/clientes/<int:id>', methods=['PUT'])
@require_auth
def atualizar_cliente(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE clientes SET nome=?, telefone=?, email=?, cpf_cnpj=?, endereco=?, obs=? WHERE id=? AND empresa_id=?",
        (d.get('nome',''), d.get('telefone',''), d.get('email',''), d.get('cpf_cnpj',''), d.get('endereco',''), d.get('obs',''), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM clientes WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/clientes/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_cliente(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM clientes WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/clientes/<int:id>/historico')
@require_auth
def historico_cliente(id):
    eid = get_empresa_id()
    db = get_db()
    cliente = row_to_dict(db.execute("SELECT * FROM clientes WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    if not cliente:
        db.close()
        return jsonify({'erro': 'Cliente não encontrado'}), 404
    vendas = rows_to_list(db.execute(
        "SELECT id, tipo, total, forma_pagamento, status, criado_em FROM vendas WHERE (cliente_id=? OR cliente_nome=?) AND empresa_id=? ORDER BY criado_em DESC",
        (id, cliente['nome'], eid)
    ).fetchall())
    locacoes = rows_to_list(db.execute(
        "SELECT id, data_retirada, data_devolucao, total, status, criado_em FROM locacoes WHERE (cliente_id=? OR cliente_nome=?) AND empresa_id=? ORDER BY criado_em DESC",
        (id, cliente['nome'], eid)
    ).fetchall())
    orcamentos = rows_to_list(db.execute(
        "SELECT id, numero, total, status, validade, criado_em FROM orcamentos WHERE (cliente_id=? OR cliente_nome=?) AND empresa_id=? ORDER BY criado_em DESC",
        (id, cliente['nome'], eid)
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
@require_auth
def listar_produtos():
    eid = get_empresa_id()
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM produtos WHERE ativo=1 AND empresa_id=? AND nome LIKE ? ORDER BY nome", (eid, f'%{q}%')).fetchall()
    else:
        rows = db.execute("SELECT * FROM produtos WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/produtos', methods=['POST'])
@require_auth
def criar_produto():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO produtos (empresa_id, nome, descricao, categoria, preco_venda, estoque, imagem_url) VALUES (?,?,?,?,?,?,?)",
        (eid, d.get('nome',''), d.get('descricao',''), d.get('categoria',''), d.get('preco_venda', 0), d.get('estoque',0), d.get('imagem_url',''))
    )
    db.commit()
    row = db.execute("SELECT * FROM produtos WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/produtos/<int:id>', methods=['PUT'])
@require_auth
def atualizar_produto(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE produtos SET nome=?, descricao=?, categoria=?, preco_venda=?, estoque=?, imagem_url=? WHERE id=? AND empresa_id=?",
        (d.get('nome',''), d.get('descricao',''), d.get('categoria',''), d.get('preco_venda', 0), d.get('estoque',0), d.get('imagem_url',''), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM produtos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/produtos/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_produto(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("UPDATE produtos SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── FORNECEDORES ─────────────────────────────────────────────────────────────

@app.route('/api/fornecedores', methods=['GET'])
@require_auth
def listar_fornecedores():
    eid = get_empresa_id()
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM fornecedores WHERE ativo=1 AND empresa_id=? AND nome LIKE ? ORDER BY nome", (eid, f'%{q}%')).fetchall()
    else:
        rows = db.execute("SELECT * FROM fornecedores WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/fornecedores', methods=['POST'])
@require_auth
def criar_fornecedor():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO fornecedores (empresa_id, nome, telefone, email, cnpj, endereco, obs) VALUES (?,?,?,?,?,?,?)",
        (eid, d.get('nome',''), d.get('telefone',''), d.get('email',''), d.get('cnpj',''), d.get('endereco',''), d.get('obs',''))
    )
    db.commit()
    row = db.execute("SELECT * FROM fornecedores WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/fornecedores/<int:id>', methods=['PUT'])
@require_auth
def atualizar_fornecedor(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE fornecedores SET nome=?, telefone=?, email=?, cnpj=?, endereco=?, obs=? WHERE id=? AND empresa_id=?",
        (d.get('nome',''), d.get('telefone',''), d.get('email',''), d.get('cnpj',''), d.get('endereco',''), d.get('obs',''), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM fornecedores WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/fornecedores/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_fornecedor(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("UPDATE fornecedores SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── MATERIAIS E ACABAMENTOS ───────────────────────────────────────────────────

@app.route('/api/materiais', methods=['GET'])
@require_auth
def listar_materiais():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute("SELECT * FROM materiais_impressao WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/materiais', methods=['POST'])
@require_auth
def criar_material():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO materiais_impressao (empresa_id, nome, preco_m2, custo_material, margem_lucro, tipo, preco_unidade) VALUES (?,?,?,?,?,?,?)",
        (eid, d.get('nome',''), d.get('preco_m2',0), d.get('custo_material',0), d.get('margem_lucro',50), d.get('tipo','m2'), d.get('preco_unidade',0))
    )
    db.commit()
    row = db.execute("SELECT * FROM materiais_impressao WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/materiais/<int:id>', methods=['PUT'])
@require_auth
def atualizar_material(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE materiais_impressao SET nome=?, preco_m2=?, custo_material=?, margem_lucro=?, tipo=?, preco_unidade=? WHERE id=? AND empresa_id=?",
        (d.get('nome',''), d.get('preco_m2',0), d.get('custo_material',0), d.get('margem_lucro',50), d.get('tipo','m2'), d.get('preco_unidade',0), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM materiais_impressao WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/materiais/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_material(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("UPDATE materiais_impressao SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/acabamentos', methods=['GET'])
@require_auth
def listar_acabamentos():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute("SELECT * FROM acabamentos WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/calcular-impressao', methods=['POST'])
@require_auth
def calcular_impressao():
    d = request.get_json(force=True, silent=True) or {}
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
@require_auth
def listar_vendas():
    eid = get_empresa_id()
    db = get_db()
    data_ini = request.args.get('data_ini', '')
    data_fim = request.args.get('data_fim', '')
    status = request.args.get('status', '')
    q_str = request.args.get('q', '')
    
    q = "SELECT * FROM vendas"
    where = ["empresa_id=?"]
    params = [eid]
    
    if data_ini and data_fim:
        where.append("date(criado_em) BETWEEN ? AND ?")
        params.extend([data_ini, data_fim])
    if status:
        where.append("status=?")
        params.append(status)
    if q_str:
        where.append("cliente_nome LIKE ?")
        params.append(f'%{q_str}%')
        
    if where:
        q += " WHERE " + " AND ".join(where)
        
    if status == 'fiado':
        q += " ORDER BY COALESCE(data_vencimento, '9999-12-31') ASC LIMIT 200"
    else:
        q += " ORDER BY criado_em DESC LIMIT 100"
        
    rows = db.execute(q, params).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/vendas', methods=['POST'])
@require_auth
def criar_venda():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    
    forma_pg = d.get('forma_pagamento', '')
    status = 'fiado' if forma_pg == 'fiado' else d.get('status', 'pago')
    
    venc = d.get('data_vencimento') or (None if forma_pg != 'fiado' else
           (datetime.date.today() + datetime.timedelta(days=30)).isoformat())
           
    cur = db.execute(
        "INSERT INTO vendas (empresa_id, cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, obs, data_vencimento) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (eid, d.get('cliente_id'), d.get('cliente_nome',''), d.get('tipo','venda'),
         d.get('subtotal', 0), d.get('desconto', 0), d.get('total', 0),
         forma_pg, status, d.get('obs',''), venc)
    )
    venda_id = cur.lastrowid
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO venda_itens (empresa_id, venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?)",
            (eid, venda_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
        if item.get('produto_id'):
            db.execute(
                "UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id=? AND empresa_id=?",
                (int(item['quantidade']), item['produto_id'], eid)
            )
    db.commit()
    row = db.execute("SELECT * FROM vendas WHERE id=?", (venda_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/vendas/<int:id>', methods=['PUT'])
@require_auth
def atualizar_venda(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    
    forma_pg = d.get('forma_pagamento', '')
    status = 'fiado' if forma_pg == 'fiado' else d.get('status', 'pago')
    
    db.execute(
        "UPDATE vendas SET cliente_nome=?, tipo=?, subtotal=?, desconto=?, total=?, forma_pagamento=?, status=?, obs=? WHERE id=? AND empresa_id=?",
        (d.get('cliente_nome',''), d.get('tipo','venda'), d.get('subtotal', 0),
         d.get('desconto',0), d.get('total', 0), forma_pg,
         status, d.get('obs',''), id, eid)
    )
    db.execute("DELETE FROM venda_itens WHERE venda_id=?", (id,))
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO venda_itens (empresa_id, venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?)",
            (eid, id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM vendas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/vendas/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_venda(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM venda_itens WHERE venda_id=?", (id,))
    db.execute("DELETE FROM vendas WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/vendas/<int:id>/itens')
@require_auth
def itens_venda(id):
    db = get_db()
    rows = db.execute("SELECT * FROM venda_itens WHERE venda_id=?", (id,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/vendas/<int:id>/pdf')
@require_auth
def pdf_venda(id):
    eid = get_empresa_id()
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado. Rode: pip install reportlab'}), 503
    db = get_db()
    venda = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    itens = rows_to_list(db.execute("SELECT * FROM venda_itens WHERE venda_id=?", (id,)).fetchall())
    db.close()
    config = get_config(eid)
    path = gerar_nota_venda_pdf(venda, itens, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

# ─── LOCAÇÕES ─────────────────────────────────────────────────────────────────


# ─── FIADO ────────────────────────────────────────────────────────────────────


@app.route('/api/vendas/<int:id>/quitar', methods=['PUT'])
@require_auth
def quitar_venda(id):
    db = get_db()
    db.execute("UPDATE vendas SET status='pago', forma_pagamento=? WHERE id=?",
               (request.get_json(force=True, silent=True).get('forma_pagamento','dinheiro'), id))
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM vendas WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

# ─── PDF ENCOMENDA ────────────────────────────────────────────────────────────

@app.route('/api/agenda', methods=['GET'])
@require_auth
def listar_agenda():
    eid = get_empresa_id()
    db = get_db()
    mes = request.args.get('mes', datetime.date.today().strftime('%Y-%m'))
    data_ini = request.args.get('data_ini', mes + '-01')
    ano, m = int(mes.split('-')[0]), int(mes.split('-')[1])
    import calendar
    ultimo_dia = calendar.monthrange(ano, m)[1]
    data_fim = request.args.get('data_fim', f'{mes}-{ultimo_dia:02d}')
    rows = rows_to_list(db.execute(
        "SELECT * FROM agenda WHERE empresa_id=? AND data_inicio <= ? AND (data_fim >= ? OR data_fim IS NULL) ORDER BY data_inicio, hora_inicio",
        (eid, data_fim, data_ini)
    ).fetchall())
    db.close()
    return jsonify(rows)


@app.route('/api/agenda/proximos')
@require_auth
def proximos_eventos():
    eid = get_empresa_id()
    db = get_db()
    hoje = datetime.date.today().isoformat()
    fim = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
    rows = rows_to_list(db.execute(
        "SELECT * FROM agenda WHERE empresa_id=? AND data_inicio BETWEEN ? AND ? AND status != 'cancelado' ORDER BY data_inicio, hora_inicio LIMIT 10",
        (eid, hoje, fim)
    ).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/agenda', methods=['POST'])
@require_auth
def criar_evento():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO agenda (empresa_id, titulo, tipo, data_inicio, data_fim, hora_inicio, hora_fim, cliente_nome, descricao, status, locacao_id, encomenda_id, cor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (eid, d.get('titulo',''), d.get('tipo','compromisso'), d.get('data_inicio',''),
         d.get('data_fim', d.get('data_inicio','')), d.get('hora_inicio','08:00'),
         d.get('hora_fim','09:00'), d.get('cliente_nome',''), d.get('descricao',''),
         d.get('status','pendente'), d.get('locacao_id'), d.get('encomenda_id'),
         d.get('cor','#534AB7'))
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM agenda WHERE id=?", (cur.lastrowid,)).fetchone())
    db.close()
    return jsonify(row), 201

@app.route('/api/agenda/<int:id>', methods=['PUT'])
@require_auth
def atualizar_evento(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE agenda SET titulo=?, tipo=?, data_inicio=?, data_fim=?, hora_inicio=?, hora_fim=?, cliente_nome=?, descricao=?, status=?, cor=? WHERE id=? AND empresa_id=?",
        (d.get('titulo',''), d.get('tipo','compromisso'), d.get('data_inicio',''),
         d.get('data_fim', d.get('data_inicio','')), d.get('hora_inicio','08:00'),
         d.get('hora_fim','09:00'), d.get('cliente_nome',''), d.get('descricao',''),
         d.get('status','pendente'), d.get('cor','#534AB7'), id, eid)
    )
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM agenda WHERE id=?", (id,)).fetchone())
    db.close()
    return jsonify(row)

@app.route('/api/agenda/<int:id>', methods=['DELETE'])
@require_auth
def deletar_evento(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM agenda WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── LOCAÇÕES COM FILTRO DE DATA ──────────────────────────────────────────────

@app.route('/api/locacoes/<int:id>/itens')
@require_auth
def itens_locacao_get(id):
    db = get_db()
    rows = rows_to_list(db.execute("SELECT * FROM locacao_itens WHERE locacao_id=?", (id,)).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/locacoes', methods=['GET'])
@require_auth
def listar_locacoes():
    eid = get_empresa_id()
    db = get_db()
    status = request.args.get('status', '')
    data_ini = request.args.get('data_ini', '')
    data_fim = request.args.get('data_fim', '')
    q = request.args.get('q', '')
    where, params = ["empresa_id=?"], [eid]
    if status:
        where.append("status=?"); params.append(status)
    if data_ini and data_fim:
        where.append("data_retirada BETWEEN ? AND ?"); params += [data_ini, data_fim]
    if q:
        where.append("cliente_nome LIKE ?"); params.append(f'%{q}%')
    sql = "SELECT * FROM locacoes WHERE " + " AND ".join(where)
    sql += " ORDER BY criado_em DESC LIMIT 200"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/locacoes', methods=['POST'])
@require_auth
def criar_locacao():
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    eid = get_empresa_id()
    cur = db.execute(
        "INSERT INTO locacoes (empresa_id, cliente_id, cliente_nome, tipo, data_retirada, data_devolucao, desconto, total, valor_entrada, forma_pagamento, status, obs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (eid, d.get('cliente_id'), d.get('cliente_nome',''),
         d.get('tipo', 'item'),
         d.get('data_retirada', datetime.date.today().isoformat()),
         d.get('data_devolucao', datetime.date.today().isoformat()),
         d.get('desconto',0), d.get('total',0),
         d.get('valor_entrada', 0), d.get('forma_pagamento', 'dinheiro'),
         d.get('status','ativo'), d.get('obs',''))
    )
    loc_id = cur.lastrowid
    
    valor_entrada = float(d.get('valor_entrada', 0))
    if valor_entrada > 0:
        db.execute(
            "INSERT INTO vendas (empresa_id, cliente_id, cliente_nome, tipo, subtotal, total, forma_pagamento, status, obs) VALUES (?, ?, ?, 'sinal', ?, ?, ?, 'pago', ?)",
            (eid, d.get('cliente_id'), d.get('cliente_nome',''), valor_entrada, valor_entrada, d.get('forma_pagamento', 'dinheiro'), f"Sinal / Entrada (Locação #{loc_id})")
        )

    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO locacao_itens (empresa_id, locacao_id, item_id, kit_id, nome, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?,?,?)",
            (eid, loc_id, item.get('item_id'), item.get('kit_id'), item['nome'],
             item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    # Sincroniza com agenda automaticamente
    db.execute(
        "INSERT INTO agenda (empresa_id, titulo, tipo, data_inicio, data_fim, hora_inicio, hora_fim, cliente_nome, status, locacao_id, cor) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (eid, f"Locacao: {d.get('cliente_nome','')}", 'locacao', d.get('data_retirada',''), d.get('data_devolucao',''),
         '08:00', '18:00', d.get('cliente_nome',''), 'pendente', loc_id, '#1D9E75')
    )
    db.commit()
    row = db.execute("SELECT * FROM locacoes WHERE id=?", (loc_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/locacoes/<int:id>', methods=['PUT'])
@require_auth
def atualizar_locacao(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE locacoes SET cliente_nome=?, data_retirada=?, data_devolucao=?, total=?, desconto=?, forma_pagamento=?, obs=?, valor_entrada=? WHERE id=? AND empresa_id=?",
        (d.get('cliente_nome',''), d.get('data_retirada',''), d.get('data_devolucao',''),
         d.get('total', 0), d.get('desconto',0), d.get('forma_pagamento',''), d.get('obs',''), d.get('valor_entrada', 0), id, eid)
    )
    db.execute("DELETE FROM locacao_itens WHERE locacao_id=?", (id,))
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO locacao_itens (empresa_id, locacao_id, item_id, kit_id, nome, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?,?,?)",
            (eid, id, item.get('item_id'), item.get('kit_id'), item['nome'],
             item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM locacoes WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/locacoes/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_locacao(id):
    db = get_db()
    db.execute("DELETE FROM agenda WHERE locacao_id=?", (id,))
    db.execute("DELETE FROM locacao_itens WHERE locacao_id=?", (id,))
    db.execute("DELETE FROM locacoes WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/locacoes/<int:id>/pdf')
@require_auth
def pdf_locacao(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    eid = get_empresa_id()
    db = get_db()
    loc = row_to_dict(db.execute("SELECT * FROM locacoes WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    itens = rows_to_list(db.execute("SELECT * FROM locacao_itens WHERE locacao_id=?", (id,)).fetchall())
    db.close()
    config = get_config(eid)
    path = gerar_pdf_locacao(loc, itens, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

@app.route('/api/locacoes/<int:id>/status', methods=['PUT'])
@require_auth
def atualizar_status_locacao(id):
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute("UPDATE locacoes SET status=? WHERE id=?", (d.get('status',''), id))
    db.commit()
    row = db.execute("SELECT * FROM locacoes WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/locacoes/<int:id>/converter', methods=['POST'])
@require_auth
def converter_locacao_venda(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    forma = d.get('forma_pagamento', 'dinheiro')
    db = get_db()
    loc = row_to_dict(db.execute("SELECT * FROM locacoes WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    if not loc:
        db.close()
        return jsonify({'erro': 'Locacao nao encontrada'}), 404
    itens = rows_to_list(db.execute("SELECT * FROM locacao_itens WHERE locacao_id=?", (id,)).fetchall())
    status = 'fiado' if forma == 'fiado' else 'pago'
    venc = (datetime.date.today() + datetime.timedelta(days=30)).isoformat() if forma == 'fiado' else None
    
    total_faturar = loc.get('total', 0) - loc.get('valor_entrada', 0)
    
    cur = db.execute(
        "INSERT INTO vendas (empresa_id, cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, data_vencimento) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (eid, loc.get('cliente_id'), loc.get('cliente_nome',''), 'locacao', loc.get('total',0), loc.get('desconto',0), total_faturar, forma, status, venc)
    )
    venda_id = cur.lastrowid
    for item in itens:
        db.execute(
            "INSERT INTO venda_itens (empresa_id, venda_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?)",
            (eid, venda_id, f"[Locação #{id}] " + item['nome'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.execute("UPDATE locacoes SET status='faturado' WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True, 'venda_id': venda_id})

@app.route('/api/itens-locacao', methods=['GET'])
@require_auth
def listar_itens_locacao():
    eid = get_empresa_id()
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM itens_locacao WHERE ativo=1 AND empresa_id=? AND nome LIKE ? ORDER BY nome", (eid, f'%{q}%')).fetchall()
    else:
        rows = db.execute("SELECT * FROM itens_locacao WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/itens-locacao', methods=['POST'])
@require_auth
def criar_item_locacao():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO itens_locacao (empresa_id, nome, descricao, categoria, preco_diaria, quantidade_total) VALUES (?,?,?,?,?,?)",
        (eid, d.get('nome',''), d.get('descricao',''), d.get('categoria',''), d.get('preco_diaria', 0), d.get('quantidade_total',1))
    )
    db.commit()
    row = db.execute("SELECT * FROM itens_locacao WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/itens-locacao/<int:id>', methods=['PUT'])
@require_auth
def atualizar_item_locacao(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE itens_locacao SET nome=?, descricao=?, categoria=?, preco_diaria=?, quantidade_total=? WHERE id=? AND empresa_id=?",
        (d.get('nome',''), d.get('descricao',''), d.get('categoria',''), d.get('preco_diaria', 0), d.get('quantidade_total',1), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM itens_locacao WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/itens-locacao/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_item_locacao(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("UPDATE itens_locacao SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/kits', methods=['GET'])
@require_auth
def listar_kits():
    eid = get_empresa_id()
    db = get_db()
    kits = rows_to_list(db.execute("SELECT * FROM kits_locacao WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall())
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
@require_auth
def criar_kit():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO kits_locacao (empresa_id, nome, descricao, preco_total) VALUES (?,?,?,?)",
        (eid, d.get('nome',''), d.get('descricao',''), d.get('preco_total', 0))
    )
    kit_id = cur.lastrowid
    for item in d.get('itens', []):
        db.execute("INSERT INTO kit_itens (empresa_id, kit_id, item_id, quantidade) VALUES (?,?,?,?)",
                   (eid, kit_id, item['item_id'], item.get('quantidade',1)))
    db.commit()
    row = db.execute("SELECT * FROM kits_locacao WHERE id=?", (kit_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/kits/<int:id>', methods=['PUT'])
@require_auth
def atualizar_kit(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute("UPDATE kits_locacao SET nome=?, descricao=?, preco_total=? WHERE id=? AND empresa_id=?",
               (d.get('nome',''), d.get('descricao',''), d.get('preco_total', 0), id, eid))
    db.execute("DELETE FROM kit_itens WHERE kit_id=?", (id,))
    for item in d.get('itens', []):
        db.execute("INSERT INTO kit_itens (empresa_id, kit_id, item_id, quantidade) VALUES (?,?,?,?)",
                   (eid, id, item['item_id'], item.get('quantidade',1)))
    db.commit()
    row = db.execute("SELECT * FROM kits_locacao WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/kits/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_kit(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM kit_itens WHERE kit_id=?", (id,))
    db.execute("UPDATE kits_locacao SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── ORÇAMENTOS ───────────────────────────────────────────────────────────────

@app.route('/api/orcamentos', methods=['GET'])
@require_auth
def listar_orcamentos():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute("SELECT * FROM orcamentos WHERE empresa_id=? ORDER BY criado_em DESC LIMIT 100", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/orcamentos', methods=['POST'])
@require_auth
def criar_orcamento():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    numero = proximo_numero_orcamento(eid)
    config = get_config(eid)
    dias = int(config.get('orcamento_validade_dias', 7))
    validade = (datetime.date.today() + datetime.timedelta(days=dias)).isoformat()
    cur = db.execute(
        "INSERT INTO orcamentos (empresa_id, numero, cliente_id, cliente_nome, validade, subtotal, desconto, total, status, obs, valor_entrada) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (eid, numero, d.get('cliente_id'), d.get('cliente_nome',''),
         validade, d.get('subtotal', 0), d.get('desconto',0), d.get('total', 0),
         'aberto', d.get('obs',''), d.get('valor_entrada', 0))
    )
    orc_id = cur.lastrowid
    
    valor_entrada = float(d.get('valor_entrada', 0))
    if valor_entrada > 0:
        db.execute(
            "INSERT INTO vendas (empresa_id, cliente_id, cliente_nome, tipo, subtotal, total, forma_pagamento, status, obs) VALUES (?, ?, ?, 'sinal', ?, ?, 'dinheiro', 'pago', ?)",
            (eid, d.get('cliente_id'), d.get('cliente_nome',''), valor_entrada, valor_entrada, f"Sinal / Entrada (Orçamento {numero})")
        )
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO orcamento_itens (empresa_id, orcamento_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?)",
            (eid, orc_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM orcamentos WHERE id=?", (orc_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/orcamentos/<int:id>', methods=['PUT'])
@require_auth
def atualizar_orcamento(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE orcamentos SET cliente_nome=?, subtotal=?, desconto=?, total=?, obs=?, valor_entrada=? WHERE id=? AND empresa_id=?",
        (d.get('cliente_nome',''), d.get('subtotal', 0), d.get('desconto',0), d.get('total', 0), d.get('obs',''), d.get('valor_entrada', 0), id, eid)
    )
    db.execute("DELETE FROM orcamento_itens WHERE orcamento_id=?", (id,))
    for item in d.get('itens', []):
        db.execute(
            "INSERT INTO orcamento_itens (empresa_id, orcamento_id, descricao, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?)",
            (eid, id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    db.commit()
    row = db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/orcamentos/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_orcamento(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM orcamento_itens WHERE orcamento_id=?", (id,))
    db.execute("DELETE FROM orcamentos WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/orcamentos/<int:id>/itens')
@require_auth
def itens_orcamento(id):
    db = get_db()
    rows = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    db.close()
    return jsonify(rows)

@app.route('/api/orcamentos/<int:id>/status', methods=['PUT'])
@require_auth
def atualizar_status_orcamento(id):
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute("UPDATE orcamentos SET status=? WHERE id=?", (d.get('status',''), id))
    db.commit()
    row = db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/orcamentos/<int:id>/pdf')
@require_auth
def pdf_orcamento(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado. Rode: pip install reportlab'}), 503
    eid = get_empresa_id()
    db = get_db()
    orc = row_to_dict(db.execute("SELECT * FROM orcamentos WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    itens = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    db.close()
    config = get_config(eid)
    path = gerar_orcamento_pdf(orc, itens, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))

# ─── RELATÓRIOS ───────────────────────────────────────────────────────────────

@app.route('/api/relatorios/resumo')
@require_auth
def relatorio_resumo():
    db = get_db()
    eid = get_empresa_id()
    data_ini = request.args.get('data_ini', datetime.date.today().replace(day=1).isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())

    vendas = db.execute("""
        SELECT tipo, COUNT(*) as qtd, SUM(total) as total
        FROM vendas WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ?
        GROUP BY tipo
    """, (eid, data_ini, data_fim)).fetchall()

    formas_pag = db.execute("""
        SELECT forma_pagamento, COUNT(*) as qtd, SUM(total) as total
        FROM vendas WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ? AND status='pago'
        GROUP BY forma_pagamento
    """, (eid, data_ini, data_fim)).fetchall()

    locacoes = db.execute("""
        SELECT status, COUNT(*) as qtd, SUM(total) as total
        FROM locacoes WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ?
        GROUP BY status
    """, (eid, data_ini, data_fim)).fetchall()

    total_geral = db.execute("""
        SELECT COALESCE(SUM(total),0) as v FROM vendas
        WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ? AND status='pago'
    """, (eid, data_ini, data_fim)).fetchone()['v']

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
@require_auth
def listar_despesas():
    eid = get_empresa_id()
    db = get_db()
    data_ini = request.args.get('data_ini', '')
    data_fim = request.args.get('data_fim', '')
    if data_ini and data_fim:
        rows = db.execute("SELECT * FROM despesas WHERE empresa_id=? AND data BETWEEN ? AND ? ORDER BY data DESC", (eid, data_ini, data_fim)).fetchall()
    else:
        rows = db.execute("SELECT * FROM despesas WHERE empresa_id=? ORDER BY criado_em DESC LIMIT 100", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/despesas', methods=['POST'])
@require_auth
def criar_despesa():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO despesas (empresa_id, descricao, categoria, valor, forma_pagamento, data, obs) VALUES (?,?,?,?,?,?,?)",
        (eid, d.get('descricao',''), d.get('categoria','geral'), d.get('valor', 0),
         d.get('forma_pagamento','dinheiro'), d.get('data', datetime.date.today().isoformat()), d.get('obs',''))
    )
    db.commit()
    row = db.execute("SELECT * FROM despesas WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/despesas/<int:id>', methods=['PUT'])
@require_auth
def atualizar_despesa(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE despesas SET descricao=?, categoria=?, valor=?, forma_pagamento=?, data=?, obs=? WHERE id=? AND empresa_id=?",
        (d.get('descricao',''), d.get('categoria','geral'), d.get('valor', 0),
         d.get('forma_pagamento','dinheiro'), d.get('data',''), d.get('obs',''), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM despesas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/despesas/<int:id>', methods=['DELETE'])
@require_auth
def deletar_despesa(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM despesas WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/fluxo-caixa')
@require_auth
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

@app.route('/api/encomendas', methods=['GET'])
@require_auth
def listar_encomendas():
    eid = get_empresa_id()
    db = get_db()
    status = request.args.get('status', '')
    q = request.args.get('q', '')
    where, params = ["empresa_id=?"], [eid]
    if status and status != 'todas':
        where.append("status=?")
        params.append(status)
    if q:
        where.append("cliente_nome LIKE ?")
        params.append(f'%{q}%')
    sql = "SELECT * FROM encomendas WHERE " + " AND ".join(where)
    sql += " ORDER BY data_entrega ASC, criado_em DESC LIMIT 200"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/encomendas/todas', methods=['GET'])
@require_auth
def todas_encomendas():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute("SELECT * FROM encomendas WHERE empresa_id=? ORDER BY criado_em DESC LIMIT 100", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/encomendas', methods=['POST'])
@require_auth
def criar_encomenda():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    row_c = db.execute("SELECT COUNT(*) as c FROM encomendas WHERE empresa_id=?", (eid,)).fetchone()
    numero = f"ENC-{(row_c['c'] or 0) + 1:04d}"
    cur = db.execute(
        "INSERT INTO encomendas (empresa_id, numero, cliente_id, cliente_nome, descricao, status, data_pedido, data_entrega, total, sinal, obs, valor_entrada) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (eid, numero, d.get('cliente_id'), d.get('cliente_nome',''), d.get('descricao',''),
         d.get('status','pedido'), d.get('data_pedido', datetime.date.today().isoformat()),
         d.get('data_entrega',''), d.get('total',0), d.get('valor_entrada', 0), d.get('obs',''), d.get('valor_entrada', 0))
    )
    enc_id = cur.lastrowid

    valor_entrada = float(d.get('valor_entrada', 0))
    if valor_entrada > 0:
        db.execute(
            "INSERT INTO vendas (empresa_id, cliente_id, cliente_nome, tipo, subtotal, total, forma_pagamento, status, obs) VALUES (?, ?, ?, 'sinal', ?, ?, 'dinheiro', 'pago', ?)",
            (eid, d.get('cliente_id'), d.get('cliente_nome',''), valor_entrada, valor_entrada, f"Sinal / Entrada ({numero})")
        )
    if d.get('data_entrega'):
        db.execute(
            "INSERT INTO agenda (empresa_id, titulo, tipo, data_inicio, data_fim, hora_inicio, hora_fim, cliente_nome, descricao, status, encomenda_id, cor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (eid, f"Entrega: {d.get('cliente_nome','')}", 'encomenda', d.get('data_entrega',''), d.get('data_entrega',''),
             '08:00', '18:00', d.get('cliente_nome',''), d.get('descricao','')[:60], 'pendente', cur.lastrowid, '#534AB7')
        )
    db.commit()
    row = db.execute("SELECT * FROM encomendas WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/encomendas/<int:id>/status', methods=['PUT'])
@require_auth
def atualizar_status_encomenda(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute("UPDATE encomendas SET status=? WHERE id=? AND empresa_id=?", (d.get('status',''), id, eid))
    db.commit()
    row = db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/encomendas/<int:id>', methods=['PUT'])
@require_auth
def atualizar_encomenda(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE encomendas SET cliente_nome=?, descricao=?, status=?, data_entrega=?, total=?, sinal=?, obs=?, valor_entrada=? WHERE id=? AND empresa_id=?",
        (d.get('cliente_nome',''), d.get('descricao',''), d.get('status','pedido'),
         d.get('data_entrega',''), d.get('total',0), d.get('valor_entrada', 0), d.get('obs',''), d.get('valor_entrada', 0), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/encomendas/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_encomenda(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("DELETE FROM agenda WHERE encomenda_id=? AND empresa_id=?", (id, eid))
    db.execute("DELETE FROM encomendas WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ─── SERVIÇOS ─────────────────────────────────────────────────────────────────

@app.route('/api/servicos', methods=['GET'])
@require_auth
def listar_servicos():
    eid = get_empresa_id()
    db = get_db()
    q = request.args.get('q', '')
    if q:
        rows = db.execute("SELECT * FROM servicos WHERE ativo=1 AND empresa_id=? AND nome LIKE ? ORDER BY nome", (eid, f'%{q}%')).fetchall()
    else:
        rows = db.execute("SELECT * FROM servicos WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)).fetchall()
    db.close()
    return jsonify(rows_to_list(rows))

@app.route('/api/servicos', methods=['POST'])
@require_auth
def criar_servico():
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    cur = db.execute(
        "INSERT INTO servicos (empresa_id, nome, descricao, categoria, tipo_preco, preco) VALUES (?,?,?,?,?,?)",
        (eid, d.get('nome',''), d.get('descricao',''), d.get('categoria',''), d.get('tipo_preco','fixo'), d.get('preco', 0))
    )
    db.commit()
    row = db.execute("SELECT * FROM servicos WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/servicos/<int:id>', methods=['PUT'])
@require_auth
def atualizar_servico(id):
    eid = get_empresa_id()
    d = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE servicos SET nome=?, descricao=?, categoria=?, tipo_preco=?, preco=? WHERE id=? AND empresa_id=?",
        (d.get('nome',''), d.get('descricao',''), d.get('categoria',''), d.get('tipo_preco','fixo'), d.get('preco', 0), id, eid)
    )
    db.commit()
    row = db.execute("SELECT * FROM servicos WHERE id=?", (id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row))

@app.route('/api/servicos/<int:id>', methods=['DELETE'])
@require_auth
@require_admin
def deletar_servico(id):
    eid = get_empresa_id()
    db = get_db()
    db.execute("UPDATE servicos SET ativo=0 WHERE id=? AND empresa_id=?", (id, eid))
    db.commit()
    db.close()
    return jsonify({'ok': True})

@app.route('/api/relatorios/exportar')
@require_auth
def exportar_relatorio():
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    data_ini = request.args.get('data_ini', datetime.date.today().replace(day=1).isoformat())
    data_fim = request.args.get('data_fim', datetime.date.today().isoformat())
    db = get_db()
    eid = get_empresa_id()
    vendas = rows_to_list(db.execute(
        "SELECT tipo, COUNT(*) as qtd, SUM(total) as total FROM vendas WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ? GROUP BY tipo",
        (eid, data_ini, data_fim)).fetchall())
    formas = rows_to_list(db.execute(
        "SELECT forma_pagamento, COUNT(*) as qtd, SUM(total) as total FROM vendas WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ? AND status='pago' GROUP BY forma_pagamento",
        (eid, data_ini, data_fim)).fetchall())
    despesas = rows_to_list(db.execute(
        "SELECT categoria, COUNT(*) as qtd, SUM(valor) as total FROM despesas WHERE empresa_id=? AND data BETWEEN ? AND ? GROUP BY categoria",
        (eid, data_ini, data_fim)).fetchall())
    total_entrada = db.execute("SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE empresa_id=? AND date(criado_em) BETWEEN ? AND ? AND status='pago'", (eid, data_ini, data_fim)).fetchone()['v']
    total_saida = db.execute("SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE empresa_id=? AND data BETWEEN ? AND ?", (eid, data_ini, data_fim)).fetchone()['v']
    db.close()
    config = get_config(eid)
    path = gerar_relatorio_pdf(data_ini, data_fim, vendas, formas, despesas, total_entrada, total_saida, config)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))


# ─── ORÇAMENTO → VENDA ────────────────────────────────────────────────────────

@app.route('/api/orcamentos/<int:id>/converter', methods=['POST'])
@require_auth
def converter_orcamento_venda(id):
    db = get_db()
    orc = row_to_dict(db.execute("SELECT * FROM orcamentos WHERE id=?", (id,)).fetchone())
    if not orc:
        db.close()
        return jsonify({'erro': 'Orçamento não encontrado'}), 404
    itens = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=?", (id,)).fetchall())
    d = request.get_json(force=True, silent=True) or {} or {}
    forma = d.get('forma_pagamento', 'dinheiro')
    status = 'fiado' if forma == 'fiado' else 'pago'
    venc = (datetime.date.today() + datetime.timedelta(days=30)).isoformat() if forma == 'fiado' else None
    
    total_faturar = orc['total'] - orc.get('valor_entrada', 0)
    
    cur = db.execute(
        "INSERT INTO vendas (cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, obs, data_vencimento) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (orc.get('cliente_id'), orc.get('cliente_nome',''), 'orcamento',
         orc['subtotal'], orc.get('desconto',0), total_faturar,
         forma, status,
         f"Gerado do orçamento {orc['numero']}. Entrada paga: {orc.get('valor_entrada', 0)}", venc)
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
@require_auth
def converter_encomenda_venda(id):
    db = get_db()
    enc = row_to_dict(db.execute("SELECT * FROM encomendas WHERE id=?", (id,)).fetchone())
    if not enc:
        db.close()
        return jsonify({'erro': 'Encomenda não encontrada'}), 404
    d = request.get_json(force=True, silent=True) or {} or {}
    forma = d.get('forma_pagamento', 'dinheiro')
    status = 'fiado' if forma == 'fiado' else 'pago'
    venc = (datetime.date.today() + datetime.timedelta(days=30)).isoformat() if forma == 'fiado' else None
    
    total_faturar = enc.get('total', 0) - enc.get('valor_entrada', 0)
    
    cur = db.execute(
        "INSERT INTO vendas (cliente_id, cliente_nome, tipo, subtotal, desconto, total, forma_pagamento, status, obs, data_vencimento) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (enc.get('cliente_id'), enc.get('cliente_nome',''), 'encomenda',
         enc.get('total',0), 0, total_faturar,
         forma, status,
         f"Gerado da encomenda {enc['numero']}: {enc['descricao'][:60]}. Entrada paga: {enc.get('valor_entrada', 0)}", venc)
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
@require_auth
def dashboard_evolucao():
    eid = get_empresa_id()
    db = get_db()
    meses = []
    for i in range(5, -1, -1):
        d = datetime.date.today().replace(day=1)
        # Calcula o mês de referência i meses atrás
        month_offset = d.month - i - 1
        year_offset = month_offset // 12
        month_val = (month_offset % 12) + 1
        mes_ref = datetime.date(d.year + year_offset, month_val, 1)
        # Calcula o primeiro dia do mês seguinte
        if mes_ref.month == 12:
            prox_mes = datetime.date(mes_ref.year + 1, 1, 1)
        else:
            prox_mes = datetime.date(mes_ref.year, mes_ref.month + 1, 1)
        label = mes_ref.strftime('%b/%y').capitalize()
        mes_inicio = mes_ref.isoformat()
        mes_fim = prox_mes.isoformat()
        receita = db.execute(
            "SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE criado_em >= ? AND criado_em < ? AND status='pago' AND empresa_id=?",
            (mes_inicio, mes_fim, eid)
        ).fetchone()['v']
        despesa = db.execute(
            "SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE data >= ? AND data < ? AND empresa_id=?",
            (mes_inicio, mes_fim, eid)
        ).fetchone()['v']
        r_val = float(receita or 0)
        d_val = float(despesa or 0)
        meses.append({'mes': label, 'receita': round(r_val, 2), 'despesa': round(d_val, 2), 'saldo': round(r_val - d_val, 2)})
    db.close()
    return jsonify(meses)

# ─── TOP CLIENTES ─────────────────────────────────────────────────────────────

@app.route('/api/clientes/top')
@require_auth
def top_clientes():
    eid = get_empresa_id()
    db = get_db()
    periodo = request.args.get('periodo', 'mes')
    params = [eid]
    if periodo == 'mes':
        mes_inicio = datetime.date.today().replace(day=1).isoformat()
        if datetime.date.today().month == 12:
            prox_mes = datetime.date(datetime.date.today().year + 1, 1, 1).isoformat()
        else:
            prox_mes = datetime.date(datetime.date.today().year, datetime.date.today().month + 1, 1).isoformat()
        filtro = "AND criado_em >= ? AND criado_em < ?"
        params.extend([mes_inicio, prox_mes])
    elif periodo == 'ano':
        ano_inicio = f"{datetime.date.today().year}-01-01"
        ano_fim = f"{datetime.date.today().year + 1}-01-01"
        filtro = "AND criado_em >= ? AND criado_em < ?"
        params.extend([ano_inicio, ano_fim])
    else:
        filtro = ""
    rows = rows_to_list(db.execute(f"""
        SELECT cliente_nome, COUNT(*) as total_pedidos,
               SUM(total) as total_gasto,
               MAX(criado_em) as ultima_compra
        FROM vendas
        WHERE status='pago' AND cliente_nome != '' AND empresa_id=? {filtro}
        GROUP BY cliente_nome
        ORDER BY total_gasto DESC
        LIMIT 10
    """, tuple(params)).fetchall())
    db.close()
    return jsonify(rows)

# ─── DISPONIBILIDADE DE ITENS POR DATA ────────────────────────────────────────

@app.route('/api/itens-locacao/<int:id>/disponibilidade')
@require_auth
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
@require_auth
@require_admin
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
    d = request.get_json(force=True, silent=True) or {} or {}
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
@require_auth
def pdf_encomenda(id):
    if not PDF_OK:
        return jsonify({'erro': 'reportlab nao instalado'}), 503
    eid = get_empresa_id()
    db = get_db()
    enc = row_to_dict(db.execute("SELECT * FROM encomendas WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    if not enc:
        db.close()
        return jsonify({'erro': 'Encomenda nao encontrada'}), 404
    db.close()
    config = get_config(eid)
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

# REMOVED DUPLICATE ENDPOINTS

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


# ─── NOVAS FUNCOES (DRE, EXPORTACAO, E CONVERSAO) ─────────────────────────

import csv, io

@app.route('/api/dashboard/dre')
@require_auth
def get_dre():
    eid = get_empresa_id()
    db = get_db()
    
    try:
        dre = []
        for i in range(5, -1, -1):
            d = datetime.date.today().replace(day=1)
            month_offset = d.month - i - 1
            year_offset = month_offset // 12
            month_val = (month_offset % 12) + 1
            mes_ref = datetime.date(d.year + year_offset, month_val, 1)
            if mes_ref.month == 12:
                prox_mes = datetime.date(mes_ref.year + 1, 1, 1)
            else:
                prox_mes = datetime.date(mes_ref.year, mes_ref.month + 1, 1)
            
            mes_inicio = mes_ref.isoformat()
            mes_fim = prox_mes.isoformat()
            label = mes_ref.strftime('%Y-%m')
            
            vendas_val = db.execute(
                "SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE criado_em >= ? AND criado_em < ? AND status='pago' AND empresa_id=?",
                (mes_inicio, mes_fim, eid)
            ).fetchone()['v']
            locacoes_val = db.execute(
                "SELECT COALESCE(SUM(total),0) as v FROM locacoes WHERE criado_em >= ? AND criado_em < ? AND (status='pago' OR status='ativo') AND empresa_id=?",
                (mes_inicio, mes_fim, eid)
            ).fetchone()['v']
            despesas_val = db.execute(
                "SELECT COALESCE(SUM(valor),0) as v FROM despesas WHERE data >= ? AND data < ? AND empresa_id=?",
                (mes_inicio, mes_fim, eid)
            ).fetchone()['v']
            
            receita = float(vendas_val or 0) + float(locacoes_val or 0)
            despesa = float(despesas_val or 0)
            dre.append({
                'mes': label,
                'receitas': round(receita, 2),
                'despesas': round(despesa, 2),
                'lucro': round(receita - despesa, 2)
            })
        
        db.close()
        return jsonify(dre)
    except Exception as e:
        print("Erro DRE:", e)
        import traceback
        traceback.print_exc()
        db.close()
        return jsonify([])

@app.route('/api/vendas/exportar')
@require_auth
def exportar_vendas_csv():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute("SELECT * FROM vendas WHERE empresa_id=? ORDER BY criado_em DESC", (eid,)).fetchall()
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
@require_auth
def exportar_locacoes_csv():
    eid = get_empresa_id()
    db = get_db()
    rows = db.execute("SELECT * FROM locacoes WHERE empresa_id=? ORDER BY criado_em DESC", (eid,)).fetchall()
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
@require_auth
def converter_orcamento_locacao(id):
    eid = get_empresa_id()
    db = get_db()
    orc = row_to_dict(db.execute("SELECT * FROM orcamentos WHERE id=? AND empresa_id=?", (id, eid)).fetchone())
    if not orc: 
        db.close()
        return jsonify({'erro': 'Orçamento não encontrado'}), 404
        
    itens = rows_to_list(db.execute("SELECT * FROM orcamento_itens WHERE orcamento_id=? AND empresa_id=?", (id, eid)).fetchall())
    
    cur = db.execute(
        "INSERT INTO locacoes (empresa_id, cliente_nome, tipo, data_retirada, data_devolucao, desconto, total, forma_pagamento, status) VALUES (?,?,?,?,?,?,?,?,?)",
        (eid, orc.get('cliente_nome',''), 'item', orc.get('criado_em',''), orc.get('validade',''), orc.get('desconto',0), orc.get('total',0), '', 'ativo')
    )
    loc_id = cur.lastrowid
    
    for item in itens:
        db.execute(
            "INSERT INTO locacao_itens (empresa_id, locacao_id, nome, quantidade, preco_unitario, subtotal) VALUES (?,?,?,?,?,?)",
            (eid, loc_id, item['descricao'], item['quantidade'], item['preco_unitario'], item['subtotal'])
        )
    
    db.execute("UPDATE orcamentos SET status='aprovado' WHERE id=? AND empresa_id=?", (id, eid))
    
    db.commit()
    db.close()
    return jsonify({'ok': True, 'locacao_id': loc_id})


# ─── FRONTEND (React App) ─────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path.startswith('api/'):
        from flask import jsonify
        return jsonify({'erro': 'Endpoint não encontrado'}), 404
    
    # Serve static assets manually
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        from flask import send_from_directory
        return send_from_directory(app.static_folder, path)
        
    index_path = os.path.join(TEMPLATE_DIR, 'index.html')
    if os.path.exists(index_path):
        from flask import send_file
        return send_file(index_path)
    return "Aguarde, gerando Frontend...", 404


if __name__ == '__main__':
    init_db()
    fazer_backup()
    print("Dycore SaaS iniciando em http://localhost:5000")
    app.run(debug=False, port=5000, host='0.0.0.0')
