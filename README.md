<div align="center">

# DripArt — Sistema de Gestão

**Sistema de gestão completo para empresas de impressão gráfica, decoração e locação de itens.**  
Backend em Flask · Frontend em React + Vite · Banco de dados SQLite · PDFs com QR Code PIX

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-black?logo=flask)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## Sobre o Projeto

O **DripArt** é um sistema POS (Point of Sale) e ERP leve desenvolvido especificamente para o fluxo de trabalho de empresas de **impressão gráfica** e **locação de itens decorativos**. Ele centraliza em uma única interface:

- Cadastro de clientes, produtos e serviços
- Vendas balcão (PDV), orçamentos, locações e encomendas
- Controle de caixa, fiado e despesas
- Agenda de eventos e entregas
- Geração de PDFs profissionais com **QR Code PIX** para recebimento
- Autenticação por usuário/senha com níveis de acesso (Admin / Operador)

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| 🏠 **Dashboard** | Resumo financeiro, gráficos de evolução e DRE do período |
| 🛒 **PDV (Caixa)** | Venda rápida de produtos e serviços com múltiplos meios de pagamento |
| 📋 **Orçamentos** | Criação de propostas com itens, descontos e conversão para Locação/Venda |
| 📦 **Locações** | Controle de retirada/devolução, faturamento e status do contrato |
| 🎨 **Encomendas** | Pedidos personalizados com status de produção (Novo → Produção → Pronto → Entregue) |
| 🔧 **Serviços** | Catálogo de serviços com precificação |
| 🛍️ **Produtos** | Estoque com alertas de quantidade mínima |
| 👥 **Clientes** | CRM básico com histórico |
| 💰 **Fluxo de Caixa** | Registro de entradas e saídas por período |
| 😟 **Fiado** | Controle de vendas a prazo por cliente |
| 📊 **Relatórios** | Exportação CSV de Vendas, Despesas e Estoque |
| 📅 **Agenda** | Calendário de compromissos e entregas |
| 🧮 **Calculadora** | Cálculo de custo de impressão (m² + acabamento + markup) |
| ⚙️ **Configurações** | Dados da empresa, PIX, e gestão de usuários/operadores |
| 🔐 **Autenticação** | Login seguro com senha criptografada (Werkzeug PBKDF2) |

---

## Interface

O sistema possui um design escuro e moderno com paleta rosa, construído com **Tailwind CSS** e componentes **shadcn/ui**.

<img width="1919" height="977" alt="image" src="https://github.com/user-attachments/assets/4bef7f5a-048d-493c-90f5-a089c5666397" />


---

## Instalação e Execução

### Pré-requisitos

- [Python 3.10+](https://www.python.org/downloads/) *(marque "Add to PATH" durante a instalação)*
- [Node.js 18+](https://nodejs.org/) *(necessário apenas para recompilar o frontend)*

### Método Rápido (Windows)

**Duplo clique em `INICIAR_DRIPART.bat`**

O script vai automaticamente:
1. Verificar e localizar o Python instalado
2. Instalar dependências Python (Flask, ReportLab, Pillow, Werkzeug) se necessário
3. Inicializar o banco de dados SQLite
4. Abrir o sistema no navegador em `http://localhost:5000`

### Acesso Inicial

| Campo | Valor |
|---|---|
| **E-mail** | `admin@dripart.com` |
| **Senha** | `123456` |

> **Importante:** Altere a senha do administrador imediatamente após o primeiro acesso em **Configurações → Usuários e Segurança**.

---

## Estrutura do Projeto

```
Projeto_Gestao_DripArt/
│
├── app.py                      # Servidor Flask — todas as rotas da API REST
├── database.py                 # Schema SQLite e inicialização do banco
├── pdf_generator.py            # Gerador de PDFs (ReportLab) com QR Code PIX
├── INICIAR_DRIPART.bat         # Atalho de inicialização Windows
│
├── decor-venue-flow-main/      # Projeto Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── pages/              # Uma tela por arquivo (Dashboard, PDV, Locacoes...)
│   │   ├── components/         # Componentes reutilizáveis (AppLayout, Sidebar...)
│   │   ├── contexts/           # AuthContext — gerenciamento de sessão
│   │   ├── lib/
│   │   │   ├── api.ts          # Todas as chamadas à API Flask centralizadas
│   │   │   └── format.ts       # Utilitários de formatação (BRL, data, etc.)
│   │   └── App.tsx             # Roteamento e proteção de rotas
│   └── dist/                   # Build de produção (servido pelo Flask)
│
├── docs/                       # PDFs gerados pelo sistema
├── backups/                    # Backups automáticos do banco de dados
└── scripts/                    # Scripts utilitários
```

---

## PDFs e QR Code PIX

O sistema gera documentos PDF profissionais para:

- 📄 **Orçamentos** — proposta com validade, itens e totais
- 🚚 **Locações** — contrato com datas de retirada/devolução
- 🧾 **Notas de Venda** — comprovante de pagamento
- 📦 **Encomendas** — ordem de serviço de produção
- 📊 **Relatórios** — resumo financeiro por período

### QR Code PIX Automático

Se a chave PIX (WhatsApp/CNPJ) estiver cadastrada em **Configurações**, todos os PDFs gerarão automaticamente um **bloco de pagamento PIX** no rodapé com:

- QR Code escaneável pela câmera do banco
- Payload EMVCo (Copia e Cola) com o valor exato do documento
- Calculado via algoritmo CRC16 nativo — sem dependências externas

---

## Segurança

- Senhas armazenadas com **PBKDF2-SHA256** via `werkzeug.security`  
- Dois níveis de acesso: **Admin** (acesso total) e **Operador** (sem Configurações)  
- Rotas do frontend protegidas por **AuthContext** com `ProtectedRoute`  
- Rota `/configuracoes` exige nível **Admin** explicitamente  

> **Nota:** Implementações ainda são necessarias.
---

## Stack Tecnológica

### Backend
| Tecnologia | Uso |
|---|---|
| **Python 3.10+** | Linguagem principal |
| **Flask** | API REST e servidor HTTP |
| **SQLite** | Banco de dados embutido |
| **ReportLab** | Geração de PDFs |
| **Werkzeug** | Hash seguro de senhas |

### Frontend
| Tecnologia | Uso |
|---|---|
| **React 18** | Interface reativa |
| **TypeScript** | Tipagem estática |
| **Vite 5** | Bundler ultrarrápido |
| **Tailwind CSS** | Estilização utilitária |
| **shadcn/ui** | Componentes de UI acessíveis |
| **TanStack Query** | Cache e sincronização de dados |
| **React Router v6** | Roteamento SPA |
| **Recharts** | Gráficos do Dashboard |

---

## API REST — Endpoints Principais

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/login` | Autenticação de usuário |
| `GET/POST` | `/api/usuarios` | Listar / criar operadores |
| `PUT/DELETE` | `/api/usuarios/<id>` | Editar / desativar operador |
| `GET/POST` | `/api/clientes` | Clientes |
| `GET/POST` | `/api/produtos` | Produtos |
| `GET/POST` | `/api/vendas` | Vendas (PDV) |
| `GET/POST` | `/api/locacoes` | Locações |
| `GET/POST` | `/api/orcamentos` | Orçamentos |
| `GET/POST` | `/api/encomendas` | Encomendas |
| `GET/POST` | `/api/servicos` | Serviços |
| `GET/POST` | `/api/despesas` | Despesas |
| `GET/POST` | `/api/fiado` | Fiado (vendas a prazo) |
| `GET/POST` | `/api/agenda` | Agenda |
| `GET` | `/api/dashboard` | Resumo financeiro |
| `GET` | `/api/dashboard/dre` | DRE do período |
| `GET` | `/api/orcamentos/<id>/pdf` | Gerar PDF do orçamento |
| `GET` | `/api/locacoes/<id>/pdf` | Gerar PDF da locação |
| `GET` | `/api/vendas/<id>/pdf` | Gerar nota de venda em PDF |
| `GET/POST` | `/api/configuracoes` | Configurações da empresa |

---

## Contribuição

1. Fork o projeto
2. Crie sua branch: `git checkout -b feature/minha-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: adiciona minha funcionalidade'`
4. Push para a branch: `git push origin feature/minha-funcionalidade`
5. Abra um **Pull Request**

---

## Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Idealizado e desenvolvido com 💜 para a **DripArt Impressão e Decoração**

</div>
