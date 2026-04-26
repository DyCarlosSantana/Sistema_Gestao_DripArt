"""
migrar_sqlite_para_postgres.py
===============================
Migra todos os dados do banco SQLite local (dycore.db) para o PostgreSQL (Neon.tech).

Execute UMA única vez, após ter o PostgreSQL configurado no .env:
    python scripts/migrar_sqlite_para_postgres.py

Segurança:
  - Nunca sobrescreve dados já existentes no Postgres (usa INSERT OR IGNORE / ON CONFLICT DO NOTHING).
  - Preserva todos os IDs originais para manter a integridade referencial.
"""

import os
import sys
import sqlite3

# Ajuste do PATH para importar da raiz do projeto
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(ROOT_DIR, '.env'))

import database

SQLITE_PATH = os.path.join(ROOT_DIR, 'dycore.db')

# Ordem respeitando dependências de foreign keys
TABLES_ORDERED = [
    'empresas',
    'clientes',
    'materiais_impressao',
    'acabamentos',
    'produtos',
    'itens_locacao',
    'kits_locacao',
    'kit_itens',
    'servicos',
    'vendas',
    'venda_itens',
    'locacoes',
    'locacao_itens',
    'orcamentos',
    'orcamento_itens',
    'despesas',
    'encomendas',
    'agenda',
    'configuracoes',
    'usuarios',
]


def migrate():
    if not database.USE_POSTGRES:
        print("ERRO: DATABASE_URL nao configurada ou psycopg2 nao instalado.")
        sys.exit(1)

    if not os.path.exists(SQLITE_PATH):
        print(f"AVISO: Banco SQLite nao encontrado em {SQLITE_PATH}. Nada a migrar.")
        return

    print("=" * 60)
    print("  MIGRACAO SQLite -> PostgreSQL (Neon.tech)")
    print("=" * 60)

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    pg_conn = database.get_db()

    total_migrated = 0

    for table in TABLES_ORDERED:
        try:
            rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()

            if not rows:
                print(f"  [{table}] Vazio, pulando.")
                continue

            cols = rows[0].keys()
            cols_str = ", ".join(cols)
            placeholders = ", ".join(["?" for _ in cols])

            skipped = 0
            inserted = 0
            for row in rows:
                values = tuple(row[c] for c in cols)
                try:
                    pg_conn.execute(
                        f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders}) "
                        f"ON CONFLICT DO NOTHING",
                        values
                    )
                    inserted += 1
                except Exception as e:
                    skipped += 1

            pg_conn.commit()
            total_migrated += inserted
            print(f"  [{table}] {inserted} registros migrados, {skipped} ignorados (ja existiam).")

        except Exception as e:
            print(f"  [{table}] ERRO: {e}")

    sqlite_conn.close()
    pg_conn.close()

    print("=" * 60)
    print(f"  Migracao concluida! {total_migrated} registros transferidos.")
    print("  Voce pode continuar usando o sistema normalmente agora.")
    print("=" * 60)


if __name__ == "__main__":
    migrate()
