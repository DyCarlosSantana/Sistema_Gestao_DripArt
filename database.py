"""
database.py — Camada de acesso a dados do Dycore SaaS
=======================================================
Suporta PostgreSQL (Neon.tech via DATABASE_URL) e SQLite como fallback local.

Estratégia de compatibilidade:
  O app.py usa placeholders no estilo SQLite (`?`).
  Para o PostgreSQL, um adaptador transparente converte `?` → `%s` em tempo real,
  eliminando a necessidade de alterar nenhuma query existente no app.py.
"""

import os
import sqlite3

# Carrega variáveis de ambiente
try:
    from dotenv import load_dotenv
    # Se uma variável de ambiente APP_ENV já estiver definida (pelo script .bat),
    # carregamos o arquivo correspondente. Senão, tentamos carregar o padrão.
    app_env = os.environ.get("APP_ENV")
    if app_env == "production":
        load_dotenv(".env.prod")
    elif app_env == "development":
        load_dotenv(".env.dev")
    else:
        load_dotenv() # Fallback para .env padrão
except ImportError:
    pass

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# ─── MODO DE BANCO ────────────────────────────────────────────────────────────

USE_POSTGRES = bool(DATABASE_URL and DATABASE_URL.startswith("postgresql"))

if USE_POSTGRES:
    try:
        import psycopg2
        import psycopg2.extras
        print("[OK] Banco de dados: PostgreSQL (Neon.tech)")
    except ImportError:
        print("ERRO CRÍTICO: psycopg2 não encontrado. Execute: pip install psycopg2-binary")
        USE_POSTGRES = False

if not USE_POSTGRES:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dycore.db')
    print(f"[OK] Banco de dados: SQLite local ({DB_PATH})")


# ─── ADAPTADOR DE CURSOR PARA POSTGRES ────────────────────────────────────────
# Converte placeholders ? (SQLite) → %s (PostgreSQL) de forma transparente.

class PgCursorAdapter:
    """Wrapper do cursor psycopg2 que aceita ? como placeholder."""

    def __init__(self, cursor):
        self._cursor = cursor

    def _adapt(self, sql):
        return sql.replace("?", "%s")

    def execute(self, sql, params=None):
        self._cursor.execute(self._adapt(sql), params)
        return self

    def executemany(self, sql, params_list):
        self._cursor.executemany(self._adapt(sql), params_list)
        return self

    def executescript(self, sql):
        # executescript não usa parâmetros — só adaptamos a sintaxe SQL
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        for stmt in statements:
            self._cursor.execute(stmt)
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        return PgRowAdapter(row, self._cursor.description)

    def fetchall(self):
        rows = self._cursor.fetchall()
        if not rows:
            return []
        desc = self._cursor.description
        return [PgRowAdapter(r, desc) for r in rows]

    @property
    def lastrowid(self):
        # psycopg2 não usa lastrowid — buscamos via RETURNING ou currval
        try:
            self._cursor.execute("SELECT lastval()")
            return self._cursor.fetchone()[0]
        except Exception:
            return None

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def __iter__(self):
        desc = self._cursor.description
        for row in self._cursor:
            yield PgRowAdapter(row, desc)


class PgRowAdapter:
    """Emula o sqlite3.Row (acesso por nome de coluna) para linhas do psycopg2."""

    def __init__(self, row, description):
        self._row = row
        self._cols = {desc[0]: i for i, desc in enumerate(description)} if description else {}

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._row[key]
        return self._row[self._cols[key]]

    def keys(self):
        return list(self._cols.keys())

    def __iter__(self):
        return iter(self._row)

    def __len__(self):
        return len(self._row)


class PgConnectionAdapter:
    """Wrapper da conexão psycopg2 com interface compatível com sqlite3."""

    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return PgCursorAdapter(self._conn.cursor())

    def execute(self, sql, params=None):
        cur = PgCursorAdapter(self._conn.cursor())
        cur.execute(sql, params)
        return cur

    def executemany(self, sql, params_list):
        cur = PgCursorAdapter(self._conn.cursor())
        cur.executemany(sql, params_list)
        return cur

    def executescript(self, sql):
        cur = PgCursorAdapter(self._conn.cursor())
        cur.executescript(sql)
        return cur

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    def rollback(self):
        self._conn.rollback()


# ─── FÁBRICA DE CONEXÃO ───────────────────────────────────────────────────────

def get_db():
    """Retorna uma conexão com o banco ativo (PostgreSQL ou SQLite)."""
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        return PgConnectionAdapter(conn)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


# ─── SCHEMA SQL (compatível com PostgreSQL e SQLite) ──────────────────────────
# Usamos SERIAL para PK no Postgres e INTEGER AUTOINCREMENT para SQLite.

def _pg_sql(sql: str) -> str:
    """Adapta DDL SQLite para PostgreSQL."""
    sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    sql = sql.replace("INTEGER DEFAULT 1", "INTEGER DEFAULT 1")  # mantém
    sql = sql.replace("REAL", "NUMERIC(12,2)")
    sql = sql.replace("CURRENT_TIMESTAMP", "NOW()")
    sql = sql.replace("CURRENT_DATE", "CURRENT_DATE")
    return sql


SCHEMA_BASE = """
CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    plano TEXT DEFAULT 'basico',
    ativo INTEGER DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cpf_cnpj TEXT,
    endereco TEXT,
    obs TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materiais_impressao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    preco_m2 REAL NOT NULL,
    custo_material REAL DEFAULT 0,
    margem_lucro REAL DEFAULT 50,
    tipo TEXT DEFAULT 'm2',
    preco_unidade REAL DEFAULT 0,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS acabamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    preco_unitario REAL NOT NULL,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    preco_venda REAL NOT NULL,
    estoque INTEGER DEFAULT 0,
    codigo TEXT DEFAULT '',
    imagem_url TEXT,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cnpj TEXT,
    endereco TEXT,
    obs TEXT,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cargos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    role TEXT DEFAULT 'operador',
    cargo_id INTEGER REFERENCES cargos(id),
    ativo INTEGER DEFAULT 1,
    ultimo_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cargo_permissoes (
    cargo_id INTEGER NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
    permissao TEXT NOT NULL,
    PRIMARY KEY(cargo_id, permissao)
);

CREATE TABLE IF NOT EXISTS itens_locacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    preco_diaria REAL NOT NULL,
    quantidade_total INTEGER DEFAULT 1,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS kits_locacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_total REAL NOT NULL,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS kit_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    kit_id INTEGER NOT NULL REFERENCES kits_locacao(id),
    item_id INTEGER NOT NULL REFERENCES itens_locacao(id),
    quantidade INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nome TEXT,
    tipo TEXT NOT NULL,
    subtotal REAL NOT NULL,
    desconto REAL DEFAULT 0,
    total REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    status TEXT DEFAULT 'pago',
    vencimento_fiado DATE,
    data_vencimento DATE,
    valor_pago REAL DEFAULT 0,
    obs TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venda_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    venda_id INTEGER NOT NULL REFERENCES vendas(id),
    descricao TEXT NOT NULL,
    quantidade REAL DEFAULT 1,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS locacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nome TEXT NOT NULL,
    tipo TEXT DEFAULT 'item',
    data_retirada DATE NOT NULL,
    data_devolucao DATE NOT NULL,
    total REAL NOT NULL,
    desconto REAL DEFAULT 0,
    forma_pagamento TEXT,
    status TEXT DEFAULT 'ativo',
    obs TEXT,
    valor_entrada REAL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locacao_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    locacao_id INTEGER NOT NULL REFERENCES locacoes(id),
    item_id INTEGER REFERENCES itens_locacao(id),
    kit_id INTEGER REFERENCES kits_locacao(id),
    nome TEXT NOT NULL,
    quantidade INTEGER DEFAULT 1,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    numero TEXT UNIQUE NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nome TEXT,
    validade DATE,
    subtotal REAL NOT NULL,
    desconto REAL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT DEFAULT 'aberto',
    obs TEXT,
    valor_entrada REAL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id),
    descricao TEXT NOT NULL,
    quantidade REAL DEFAULT 1,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracoes (
    empresa_id INTEGER DEFAULT 1,
    chave TEXT NOT NULL,
    valor TEXT,
    PRIMARY KEY (empresa_id, chave)
);

CREATE TABLE IF NOT EXISTS despesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    descricao TEXT NOT NULL,
    categoria TEXT DEFAULT 'geral',
    valor REAL NOT NULL,
    forma_pagamento TEXT DEFAULT 'dinheiro',
    data DATE DEFAULT CURRENT_DATE,
    obs TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encomendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    numero TEXT UNIQUE NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nome TEXT NOT NULL,
    descricao TEXT NOT NULL,
    status TEXT DEFAULT 'pedido',
    data_pedido DATE DEFAULT CURRENT_DATE,
    data_entrega DATE,
    total REAL DEFAULT 0,
    sinal REAL DEFAULT 0,
    valor_entrada REAL DEFAULT 0,
    orcamento_id INTEGER REFERENCES orcamentos(id),
    obs TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    tipo_preco TEXT DEFAULT 'fixo',
    preco REAL NOT NULL,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    titulo TEXT NOT NULL,
    tipo TEXT DEFAULT 'compromisso',
    data_inicio DATE NOT NULL,
    data_fim DATE,
    hora_inicio TEXT DEFAULT '08:00',
    hora_fim TEXT DEFAULT '09:00',
    cliente_nome TEXT,
    descricao TEXT,
    status TEXT DEFAULT 'pendente',
    locacao_id INTEGER REFERENCES locacoes(id),
    encomenda_id INTEGER REFERENCES encomendas(id),
    cor TEXT DEFAULT '#534AB7',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modulos_empresa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    modulo TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    UNIQUE(empresa_id, modulo)
);

CREATE TABLE IF NOT EXISTS categorias_despesa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#6B7280',
    padrao INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS formas_pagamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER DEFAULT 1,
    nome TEXT NOT NULL,
    tipo TEXT DEFAULT 'outros',
    ativo INTEGER DEFAULT 1,
    padrao INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, nome)
);
"""


def _create_tables(db):
    """Cria todas as tabelas no banco ativo."""
    if USE_POSTGRES:
        # No Postgres, executamos tabela por tabela para evitar problemas com executescript
        statements = []
        current = []
        for line in _pg_sql(SCHEMA_BASE).split("\n"):
            current.append(line)
            if line.strip() == ");":
                stmt = "\n".join(current).strip()
                if stmt:
                    statements.append(stmt)
                current = []
        conn_raw = db._conn  # acessa conexão psycopg2 nativa
        with conn_raw.cursor() as cur:
            for stmt in statements:
                try:
                    cur.execute(stmt)
                except Exception as e:
                    conn_raw.rollback()
                    raise RuntimeError(f"Erro ao criar tabela:\n{stmt}\n\nDetalhe: {e}")
        conn_raw.commit()
    else:
        db.executescript(SCHEMA_BASE)
        db.commit()


def _seed_dados_iniciais(db):
    """Insere dados padrão se o banco estiver vazio."""

    # Empresa padrão
    row = db.execute("SELECT COUNT(*) FROM empresas").fetchone()
    if row[0] == 0:
        db.execute(
            "INSERT INTO empresas (nome, plano, ativo) VALUES (?,?,?)",
            ('Dycore', 'basico', 1)
        )
        db.commit()

    # Materiais de impressão padrão
    row = db.execute("SELECT COUNT(*) FROM materiais_impressao").fetchone()
    if row[0] == 0:
        db.executemany(
            "INSERT INTO materiais_impressao (empresa_id, nome, preco_m2, custo_material, margem_lucro, tipo, preco_unidade) VALUES (?,?,?,?,?,?,?)",
            [
                (1, "Lona 440g",         25.00, 12.00, 108, "m2",     0),
                (1, "Lona 280g",         20.00,  9.00, 122, "m2",     0),
                (1, "Adesivo Vinil",     40.00, 18.00, 122, "m2",     0),
                (1, "Papel Fotográfico", 35.00, 14.00, 150, "m2",     0),
                (1, "Papel Couché 115g", 18.00,  7.00, 157, "m2",     0),
                (1, "TNT/Tecido",        30.00, 12.00, 150, "m2",     0),
                (1, "A4 P&B",             0,    0.10,  400, "unidade", 0.50),
                (1, "A4 Colorido",        0,    0.30,  233, "unidade", 1.00),
                (1, "A4 Fotográfico",     0,    0.80,  188, "unidade", 2.30),
            ]
        )
        db.commit()

    # Acabamentos padrão
    row = db.execute("SELECT COUNT(*) FROM acabamentos").fetchone()
    if row[0] == 0:
        db.executemany(
            "INSERT INTO acabamentos (empresa_id, nome, preco_unitario) VALUES (?,?,?)",
            [
                (1, "Ilhós (par)", 2.00),
                (1, "Dobra e cola", 5.00),
                (1, "Laminação", 8.00),
                (1, "Corte especial", 10.00),
            ]
        )
        db.commit()

    # Serviços padrão
    row = db.execute("SELECT COUNT(*) FROM servicos").fetchone()
    if row[0] == 0:
        db.executemany(
            "INSERT INTO servicos (empresa_id, nome, categoria, tipo_preco, preco) VALUES (?,?,?,?,?)",
            [
                (1, "Design gráfico",       "design",    "hora",  80.00),
                (1, "Instalação de banner", "instalação","fixo",  50.00),
                (1, "Arte finalização",     "design",    "fixo",  40.00),
                (1, "Entrega",              "logística", "fixo",  20.00),
            ]
        )
        db.commit()

    # Configurações padrão
    row = db.execute("SELECT COUNT(*) FROM configuracoes").fetchone()
    if row[0] == 0:
        db.executemany(
            "INSERT INTO configuracoes (empresa_id, chave, valor) VALUES (?,?,?)",
            [
                (1, "empresa_nome",            "Dycore"),
                (1, "empresa_telefone",         ""),
                (1, "empresa_email",            ""),
                (1, "empresa_endereco",         ""),
                (1, "empresa_cnpj",             ""),
                (1, "empresa_whatsapp",         ""),
                (1, "empresa_instagram",        ""),
                (1, "empresa_site",             ""),
                (1, "logo_path",                ""),
                (1, "orcamento_validade_dias",  "7"),
            ]
        )
        db.commit()

    # Usuário administrador padrão
    row = db.execute("SELECT COUNT(*) FROM usuarios").fetchone()
    if row[0] == 0:
        from werkzeug.security import generate_password_hash
        senha_admin = generate_password_hash('admin')
        db.execute(
            "INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role) VALUES (?,?,?,?,?)",
            (1, "Administrador", "admin@dycore.com", senha_admin, "admin")
        )
        db.commit()

    # Módulos padrão
    row = db.execute("SELECT COUNT(*) FROM modulos_empresa").fetchone()
    if row[0] == 0:
        modulos_padrao = [
            (1, 'vendas', 1), (1, 'locacoes', 1), (1, 'encomendas', 1),
            (1, 'produtos', 1), (1, 'despesas', 1), (1, 'agenda', 1),
            (1, 'calculadora', 1), (1, 'servicos', 1),
        ]
        db.executemany(
            "INSERT INTO modulos_empresa (empresa_id, modulo, ativo) VALUES (?,?,?)",
            modulos_padrao
        )
        db.commit()

    # Categorias de despesa padrão
    row = db.execute("SELECT COUNT(*) FROM categorias_despesa").fetchone()
    if row[0] == 0:
        categorias_padrao = [
            (1, 'Material / Insumos', '#3B82F6', 1),
            (1, 'Aluguel / Espaço', '#8B5CF6', 1),
            (1, 'Energia / Água', '#F59E0B', 1),
            (1, 'Internet / Telefone', '#06B6D4', 1),
            (1, 'Salários / Pessoal', '#EF4444', 1),
            (1, 'Transporte / Entrega', '#10B981', 1),
            (1, 'Impostos / Taxas', '#F97316', 1),
            (1, 'Manutenção', '#6366F1', 1),
            (1, 'Marketing / Publicidade', '#EC4899', 1),
            (1, 'Outros', '#6B7280', 1),
        ]
        db.executemany(
            "INSERT INTO categorias_despesa (empresa_id, nome, cor, padrao) VALUES (?,?,?,?)",
            categorias_padrao
        )
        db.commit()

    # Formas de pagamento padrão
    row = db.execute("SELECT COUNT(*) FROM formas_pagamento").fetchone()
    if row[0] == 0:
        formas_padrao = [
            (1, 'Dinheiro', 'dinheiro', 1, 1),
            (1, 'PIX', 'pix', 1, 1),
            (1, 'Cartão Débito', 'debito', 1, 1),
            (1, 'Cartão Crédito', 'credito', 1, 1),
            (1, 'Boleto', 'boleto', 1, 0),
            (1, 'Transferência', 'transferencia', 1, 0),
            (1, 'Fiado', 'fiado', 1, 0),
        ]
        db.executemany(
            "INSERT INTO formas_pagamento (empresa_id, nome, tipo, ativo, padrao) VALUES (?,?,?,?,?)",
            formas_padrao
        )
        db.commit()


def init_db():
    """Inicializa o banco de dados: cria tabelas e semeia dados padrão."""
    db = get_db()
    try:
        _create_tables(db)
        _seed_dados_iniciais(db)
        print("Banco de dados inicializado com sucesso.")
    except Exception as e:
        print(f"ERRO ao inicializar banco de dados: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
