"""
migrate_to_multitenant.py — Script de Migração para Multi-tenancy (Fase 3)
==========================================================================
Executa as migrações necessárias para suportar múltiplos tenants no banco
de dados SQLite existente.

Uso:
    python scripts/migrate_to_multitenant.py

O script é idempotente: pode ser executado múltiplas vezes com segurança.
"""

import sqlite3
import os
import sys

# Adiciona o diretório raiz ao path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

DB_PATH = os.path.join(ROOT_DIR, 'dycore.db')


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def run_migration():
    print(f"🔌 Conectando ao banco: {DB_PATH}")
    conn = connect()
    c = conn.cursor()

    # ─── 1. Criar tabela empresas ─────────────────────────────────────────────
    print("📋 Criando tabela 'empresas'...")
    c.execute("""
        CREATE TABLE IF NOT EXISTS empresas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cnpj TEXT,
            email TEXT,
            telefone TEXT,
            plano TEXT DEFAULT 'basico',
            ativo INTEGER DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ─── 2. Inserir empresa padrão se não existir ─────────────────────────────
    c.execute("SELECT COUNT(*) FROM empresas")
    if c.fetchone()[0] == 0:
        print("🏢 Criando empresa padrão 'Dycore' (ID=1)...")
        c.execute(
            "INSERT INTO empresas (id, nome, plano, ativo) VALUES (1, 'Dycore', 'basico', 1)"
        )
    else:
        print("✅ Empresa padrão já existe.")

    # ─── 3. Adicionar empresa_id às tabelas existentes ────────────────────────
    TABLES = [
        'clientes', 'materiais_impressao', 'acabamentos', 'produtos',
        'usuarios', 'itens_locacao', 'kits_locacao', 'kit_itens',
        'vendas', 'venda_itens', 'locacoes', 'locacao_itens',
        'orcamentos', 'orcamento_itens', 'despesas', 'encomendas',
        'servicos', 'agenda',
    ]

    for table in TABLES:
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN empresa_id INTEGER DEFAULT 1")
            print(f"  ✅ {table}: coluna empresa_id adicionada")
        except sqlite3.OperationalError:
            print(f"  ℹ️  {table}: empresa_id já existe")

    # ─── 4. Tratar configuracoes (chave primária composta) ────────────────────
    print("⚙️  Migrando tabela 'configuracoes'...")
    try:
        # Adiciona empresa_id se não existir
        c.execute("ALTER TABLE configuracoes ADD COLUMN empresa_id INTEGER DEFAULT 1")
        print("  ✅ configuracoes: coluna empresa_id adicionada")
    except sqlite3.OperationalError:
        print("  ℹ️  configuracoes: empresa_id já existe ou tabela usa nova estrutura")

    # ─── 5. Atualizar registros sem empresa_id ────────────────────────────────
    print("🔄 Atualizando registros existentes para empresa_id=1...")
    for table in TABLES + ['configuracoes']:
        try:
            c.execute(
                f"UPDATE {table} SET empresa_id=1 WHERE empresa_id IS NULL OR empresa_id=0"
            )
            updated = c.rowcount
            if updated > 0:
                print(f"  ✅ {table}: {updated} registro(s) atualizado(s)")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  {table}: {e}")

    conn.commit()
    conn.close()

    print("\n🎉 Migração concluída com sucesso!")
    print("   Todos os dados existentes foram associados à empresa_id=1 (Dycore).")
    print("   Novos tenants poderão ser registrados via POST /api/empresas/registrar")


if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        print(f"❌ Banco de dados não encontrado: {DB_PATH}")
        print("   Execute o sistema pelo menos uma vez para criar o banco.")
        sys.exit(1)
    run_migration()
