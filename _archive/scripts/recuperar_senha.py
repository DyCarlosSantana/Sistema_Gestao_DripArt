"""
recuperar_senha.py - Ferramenta CLI de emergência para recuperar acesso ao Dycore.
===================================================================================
Lista todos os usuários ativos do sistema ou redefine a senha de um usuário específico.

Uso para listar usuários:
    python scripts/recuperar_senha.py

Uso para redefinir senha:
    python scripts/recuperar_senha.py admin@dycore.com nova_senha_aqui
"""

import sqlite3
import sys
import os

# Ajuste do PATH para importar ferramentas da raiz do projeto
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(ROOT_DIR, 'dycore.db')

def listar_usuarios():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    print("\n" + "="*50)
    print(" USUÁRIOS ATIVOS CADASTRADOS NO SISTEMA")
    print("="*50)
    
    rows = c.execute("SELECT id, nome, email, role FROM usuarios WHERE ativo = 1").fetchall()
    for row in rows:
        print(f"[{row['id']}] {row['nome']} | E-mail: {row['email']} | Nível: {row['role']}")
        
    print("="*50)
    print("\nPara redefinir a senha de um usuário, feche e execute o comando:")
    print("python scripts/recuperar_senha.py <email_do_usuario> <nova_senha>\n")
    conn.close()

def redefinir_senha(email, nova_senha):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("SELECT id FROM usuarios WHERE email=? AND ativo=1", (email,))
    user = c.fetchone()
    
    if not user:
        print(f"❌ Erro: Usuário com e-mail '{email}' não encontrado ou inativo.")
        return
        
    senha_hash = generate_password_hash(nova_senha)
    c.execute("UPDATE usuarios SET senha_hash=? WHERE email=?", (senha_hash, email))
    conn.commit()
    conn.close()
    print(f"✅ Sucesso! A senha de acesso para '{email}' foi redefinida para: '{nova_senha}'")


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print("❌ Arquivo dycore.db não encontrado. Execute o sistema primeiro para inicializar.")
        sys.exit(1)
        
    if len(sys.argv) == 3:
        # Modo: redefinição de senha
        redefinir_senha(sys.argv[1], sys.argv[2])
    else:
        # Modo: Listagem e ajuda
        listar_usuarios()
