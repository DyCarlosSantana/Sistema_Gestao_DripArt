# 🛠️ Guia do Desenvolvedor — Dycore SaaS

> Documentação técnica para operação, manutenção e evolução do ecossistema Dycore.
> Para uma visão geral do projeto, consulte o [README.md](./README.md).

---

## 🏗️ Arquitetura de Ambientes

O Dycore opera com **paridade total entre ambientes**: Produção e Desenvolvimento utilizam o mesmo motor de banco de dados (PostgreSQL na Neon.tech), eliminando problemas de compatibilidade.

### Ambientes Disponíveis

| Ambiente | Atalho | Variável | Banco de Dados | Finalidade |
|:---|:---|:---|:---|:---|
| **Produção** | `INICIAR_LOJA.bat` | `APP_ENV=production` | Neon.tech (Prod) | Uso real na loja |
| **Desenvolvimento** | `INICIAR_DEV.bat` | `APP_ENV=development` | Neon.tech (Dev) | Testes e novas funcionalidades |

### Arquivos de Configuração

| Arquivo | Ambiente | Descrição |
|:---|:---|:---|
| `.env.prod` | Produção | URL do banco real + JWT secret de produção |
| `.env.dev` | Desenvolvimento | URL do banco de testes + JWT secret de dev |

> ⚠️ **Importante:** Os arquivos `.env.*` estão protegidos pelo `.gitignore` e nunca devem ser versionados.

---

## 🔄 Fluxo de Trabalho com Git

O projeto utiliza um modelo de branching simplificado:

```
main ────────────●────────────●──────── (Estável / Loja)
                  \          /
develop ──────────●────●────● ───────── (Desenvolvimento)
```

| Branch | Propósito | Regra |
|:---|:---|:---|
| `main` | Versão estável usada na loja | Só recebe merges da `develop` após testes |
| `develop` | Desenvolvimento ativo | Onde todo novo código é escrito e testado |

### Fluxo Resumido

1. Desenvolva sempre na branch `develop`.
2. Teste as alterações usando `INICIAR_DEV.bat`.
3. Quando estiver estável, faça o merge para `main`:
   ```bash
   git checkout main
   git merge develop
   ```
4. A loja será atualizada no próximo início do `INICIAR_LOJA.bat`.

---

## 💾 Banco de Dados

### Inicialização de um Novo Banco

Para criar todas as tabelas e inserir dados padrão (seed) em um banco novo:

```bash
# Para o banco de desenvolvimento
set APP_ENV=development
python database.py

# Para o banco de produção
set APP_ENV=production
python database.py
```

### Estrutura de Tabelas Principais

| Tabela | Descrição |
|:---|:---|
| `empresas` | Dados da empresa (multi-tenant) |
| `usuarios` | Contas de acesso com roles (admin, gerente, operador) |
| `clientes` | Cadastro de clientes |
| `produtos` | Catálogo de produtos com estoque |
| `vendas` / `venda_itens` | Registro de vendas e itens vendidos |
| `locacoes` / `locacao_itens` | Contratos de locação |
| `encomendas` | Pedidos sob encomenda com status de produção |
| `orcamentos` / `orcamento_itens` | Propostas comerciais |
| `despesas` | Controle de saídas financeiras |
| `agenda` | Compromissos e calendário |
| `configuracoes` | Configurações dinâmicas por empresa |

---

## ⚙️ Manutenção do Frontend

O frontend é um projeto React/Vite localizado em `decor-venue-flow-main/`.

```bash
cd decor-venue-flow-main

# Instalar dependências (primeira vez)
npm install

# Desenvolvimento com hot-reload
npm run dev

# Gerar build otimizado (servido pelo Flask)
npm run build
```

> O Flask serve os arquivos estáticos da pasta `dist/`. Após qualquer alteração visual, é necessário rodar `npm run build` para que as mudanças apareçam no sistema.

---

## 📁 Organização de Arquivos

```
Dycore/
├── app.py                 # Servidor Flask — todas as rotas da API
├── database.py            # Schema, migrations e seed de dados
├── pdf_generator.py       # Geração de PDFs (recibos, contratos, orçamentos)
├── auth.py                # Autenticação e middleware JWT
├── .env.prod              # Config de produção (não versionado)
├── .env.dev               # Config de desenvolvimento (não versionado)
├── INICIAR_LOJA.bat       # Atalho de produção
├── INICIAR_DEV.bat        # Atalho de desenvolvimento
├── requirements.txt       # Dependências Python
├── decor-venue-flow-main/ # Frontend (React + Vite + TypeScript)
├── landing-page/          # Landing page institucional
├── _archive/              # Scripts e documentos históricos
└── docs/                  # PDFs gerados em runtime
```

---

## 🔑 Credenciais Padrão

Após inicializar o banco, o sistema cria automaticamente:

| Campo | Valor |
|:---|:---|
| **E-mail** | `admin@dycore.com` |
| **Senha** | `admin` |

> ⚠️ Altere a senha padrão imediatamente ao configurar o ambiente de produção.

---

<div align="center">

**Dycore — Engenharia de Software 2026**

</div>
