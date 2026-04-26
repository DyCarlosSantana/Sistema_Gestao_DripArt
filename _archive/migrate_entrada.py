import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found.")
    exit(1)

print("Connecting to DB...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    print("Adding valor_entrada to locacoes...")
    cur.execute("ALTER TABLE locacoes ADD COLUMN IF NOT EXISTS valor_entrada REAL DEFAULT 0;")
    print("Adding valor_entrada to orcamentos...")
    cur.execute("ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS valor_entrada REAL DEFAULT 0;")
    print("Adding valor_entrada to encomendas...")
    cur.execute("ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS valor_entrada REAL DEFAULT 0;")
    conn.commit()
    print("Success!")
except Exception as e:
    print("Error:", e)
    conn.rollback()
finally:
    cur.close()
    conn.close()
