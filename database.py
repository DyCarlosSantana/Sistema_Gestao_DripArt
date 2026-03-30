import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dripArt.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        nome TEXT NOT NULL,
        preco_m2 REAL NOT NULL,
        ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS acabamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco_unitario REAL NOT NULL,
        ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        preco_venda REAL NOT NULL,
        estoque INTEGER DEFAULT 0,
        ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS itens_locacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        preco_diaria REAL NOT NULL,
        quantidade_total INTEGER DEFAULT 1,
        ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kits_locacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco_total REAL NOT NULL,
        ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kit_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kit_id INTEGER NOT NULL REFERENCES kits_locacao(id),
        item_id INTEGER NOT NULL REFERENCES itens_locacao(id),
        quantidade INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER REFERENCES clientes(id),
        cliente_nome TEXT,
        tipo TEXT NOT NULL,
        subtotal REAL NOT NULL,
        desconto REAL DEFAULT 0,
        total REAL NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status TEXT DEFAULT 'pago',
        vencimento_fiado DATE,
        obs TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS venda_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER NOT NULL REFERENCES vendas(id),
        descricao TEXT NOT NULL,
        quantidade REAL DEFAULT 1,
        preco_unitario REAL NOT NULL,
        subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locacao_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        numero TEXT UNIQUE NOT NULL,
        cliente_id INTEGER REFERENCES clientes(id),
        cliente_nome TEXT,
        validade DATE,
        subtotal REAL NOT NULL,
        desconto REAL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT DEFAULT 'aberto',
        obs TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orcamento_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id),
        descricao TEXT NOT NULL,
        quantidade REAL DEFAULT 1,
        preco_unitario REAL NOT NULL,
        subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT
    );

    CREATE TABLE IF NOT EXISTS despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        numero TEXT UNIQUE NOT NULL,
        cliente_id INTEGER REFERENCES clientes(id),
        cliente_nome TEXT NOT NULL,
        descricao TEXT NOT NULL,
        status TEXT DEFAULT 'pedido',
        data_pedido DATE DEFAULT CURRENT_DATE,
        data_entrega DATE,
        total REAL DEFAULT 0,
        orcamento_id INTEGER REFERENCES orcamentos(id),
        obs TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        tipo_preco TEXT DEFAULT 'fixo',
        preco REAL NOT NULL,
        ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS agenda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    """)

    # Dados iniciais
    # Migrations para banco já existente
    try:
        c.execute("ALTER TABLE vendas ADD COLUMN data_vencimento DATE")
    except: pass
    try:
        c.execute("ALTER TABLE locacoes ADD COLUMN data_vencimento DATE")
    except: pass
    try:
        c.execute("ALTER TABLE vendas ADD COLUMN vencimento_fiado DATE")
    except: pass
    try:
        c.execute("ALTER TABLE locacoes ADD COLUMN vencimento_fiado DATE")
    except: pass
    try:
        c.execute("ALTER TABLE vendas ADD COLUMN data_vencimento DATE")
    except: pass
    try:
        c.execute("ALTER TABLE locacoes ADD COLUMN data_vencimento DATE")
    except: pass


    try:
        c.execute("ALTER TABLE materiais_impressao ADD COLUMN custo_material REAL DEFAULT 0")
    except: pass
    try:
        c.execute("ALTER TABLE vendas ADD COLUMN data_vencimento DATE")
    except: pass
    try:
        c.execute("ALTER TABLE vendas ADD COLUMN valor_pago REAL DEFAULT 0")
    except: pass
    try:
        c.execute("ALTER TABLE locacoes ADD COLUMN data_vencimento DATE")
    except: pass
    try:
        c.execute("ALTER TABLE produtos ADD COLUMN codigo TEXT DEFAULT ''")
    except: pass
    try:
        c.execute("ALTER TABLE materiais_impressao ADD COLUMN margem_lucro REAL DEFAULT 50")
    except: pass
    try:
        c.execute("ALTER TABLE materiais_impressao ADD COLUMN tipo TEXT DEFAULT 'm2'")
    except: pass
    try:
        c.execute("ALTER TABLE materiais_impressao ADD COLUMN preco_unidade REAL DEFAULT 0")
    except: pass
    try:
        c.execute("ALTER TABLE encomendas ADD COLUMN sinal REAL DEFAULT 0")
    except: pass

    c.execute("SELECT COUNT(*) FROM materiais_impressao")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT INTO materiais_impressao (nome, preco_m2, custo_material, margem_lucro, tipo, preco_unidade) VALUES (?,?,?,?,?,?)", [
            ("Lona 440g",       25.00, 12.00, 108, "m2",    0),
            ("Lona 280g",       20.00,  9.00, 122, "m2",    0),
            ("Adesivo Vinil",   40.00, 18.00, 122, "m2",    0),
            ("Papel Fotográfico",35.00,14.00, 150, "m2",    0),
            ("Papel Couché 115g",18.00, 7.00, 157, "m2",    0),
            ("TNT/Tecido",      30.00, 12.00, 150, "m2",    0),
            ("A4 P&B",           0,    0.10,  400, "unidade",0.50),
            ("A4 Colorido",      0,    0.30,  233, "unidade",1.00),
            ("A4 Fotográfico",   0,    0.80,  188, "unidade",2.30),
        ])

    c.execute("SELECT COUNT(*) FROM acabamentos")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT INTO acabamentos (nome, preco_unitario) VALUES (?,?)", [
            ("Ilhós (par)", 2.00),
            ("Dobra e cola", 5.00),
            ("Laminação", 8.00),
            ("Corte especial", 10.00),
        ])

    c.execute("SELECT COUNT(*) FROM servicos")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT INTO servicos (nome, categoria, tipo_preco, preco) VALUES (?,?,?,?)", [
            ("Design gráfico", "design", "hora", 80.00),
            ("Instalação de banner", "instalação", "fixo", 50.00),
            ("Arte finalização", "design", "fixo", 40.00),
            ("Entrega", "logística", "fixo", 20.00),
        ])

    c.execute("SELECT COUNT(*) FROM configuracoes")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT INTO configuracoes (chave, valor) VALUES (?,?)", [
            ("empresa_nome", "DripArt"),
            ("empresa_telefone", ""),
            ("empresa_email", ""),
            ("empresa_endereco", ""),
            ("empresa_cnpj", ""),
            ("empresa_whatsapp", ""),
            ("empresa_instagram", ""),
            ("empresa_site", ""),
            ("logo_path", ""),
            ("orcamento_validade_dias", "7"),
        ])

    conn.commit()
    conn.close()
    print("Banco de dados inicializado com sucesso.")
