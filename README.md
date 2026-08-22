<div align="center">

# Dycore — Modern Management SaaS

**Minha plataforma de gestão para empresas de decoração, eventos e produtos personalizados.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## Sobre o projeto

O **Dycore** é o sistema de gestão que estou desenvolvendo para centralizar as operações de negócios que lidam com vendas, locações de itens, produção sob encomenda e serviços de impressão. Comecei pensando no setor de decoração e eventos, mas fui evoluindo o projeto para uma base multi-tenant, capaz de atender outros segmentos sem precisar reescrever a estrutura.

A prioridade é manter uma interface moderna e direta, tirando complexidade operacional do dia a dia de quem usa o sistema.

---

## Interface

<div align="center">

|                     Login                     |                 Dashboard                 |
| :--------------------------------------------: | :----------------------------------------: |
| ![Tela de Login](image/README/1776399320037.png) | ![Dashboard](image/README/1776399329653.png) |

</div>

---

## Módulos do sistema

| Módulo | Descrição |
| :-- | :-- |
| **📊 Dashboard** | Métricas em tempo real, gráficos de faturamento e atalhos para as operações mais usadas. |
| **🛒 PDV (Ponto de Venda)** | Check-out com suporte a múltiplas formas de pagamento, pagamentos parciais e geração automática de recibos em PDF. |
| **📦 Locações** | Controle de contratos de locação, disponibilidade de itens por data e kits personalizados. |
| **📅 Agenda & Encomendas** | Calendário integrado ao fluxo de produção, com status (Pedido → Produção → Entregue). |
| **💰 Financeiro** | Fluxo de caixa, gestão de despesas por categoria e controle de vendas a prazo (Fiado). |
| **📋 Orçamentos** | Geração de propostas com validade configurável e PDF com QR Code PIX. |
| **👥 Clientes & Produtos** | Cadastro com visualização em cards, busca e controle de estoque. |
| **⚙️ Configurações** | Usuários com Cargos e Permissões, personalização de logo e ativação de módulos. |

---

## Stack que estou usando

<div align="center">

| Camada | Tecnologias |
| :-- | :-- |
| **Frontend do sistema** | React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Lucide Icons |
| **Landing page** | React · TypeScript · Vite (projeto separado, só para a página institucional) |
| **Backend** | Python · Flask · Werkzeug · Flask-JWT-Extended |
| **Banco de dados** | PostgreSQL 16 (Neon.tech — serverless) |
| **Relatórios** | ReportLab (PDFs dinâmicos) · Pillow (imagens) |
| **Segurança** | JWT · Hash Bcrypt · Controle de acesso por Roles (RBAC) |

</div>

---

## 🔒 Níveis de acesso

O sistema usa controle de acesso baseado em papéis (RBAC):

| Role | Permissões |
| :-- | :-- |
| **Admin** | Controle total: configurações, usuários, financeiro e todos os módulos. |
| **Gerente** | Relatórios financeiros e operações, sem acesso a configurações globais. |
| **Operador** | Restrito a vendas, agenda e cadastros operacionais. |

---

## Início rápido

### Pré-requisitos

- **Python 3.10+** instalado e no PATH.
- Conexão com a internet (o banco de dados fica na nuvem).

### Execução (Windows)

```
INICIAR_LOJA.bat
```

O sistema sobe sozinho e abre no navegador em `http://localhost:5000`.

> Para detalhes técnicos de ambientes, banco de dados e fluxo de desenvolvimento, escrevi um guia à parte: [DEVELOPER.md](./DEVELOPER.md).

---

## 📂 Como está organizado o repositório

```
Dycore/
├── app.py                      # API Flask — rotas, autenticação e regras de negócio
├── database.py                 # Camada de dados — PostgreSQL multi-ambiente
├── pdf_generator.py            # Geração de recibos, contratos e orçamentos em PDF
├── auth.py                     # Middleware de autenticação JWT
├── requirements.txt            # Dependências Python do backend
├── .env.example                # Modelo de variáveis de ambiente
├── INICIAR_LOJA.bat            # Inicialização rápida (Produção)
├── INICIAR_DEV.bat             # Inicialização rápida (Desenvolvimento)
├── decor-venue-flow-main/      # Frontend React/Vite/TypeScript do sistema em si
│   └── src/
│       ├── pages/               # Telas (Dashboard, PDV, Agenda, Locações...)
│       ├── components/          # Componentes reutilizáveis (Sidebar, Modais, UI)
│       └── lib/                 # API client, formatadores, navegação
├── landing-page/                # Site institucional — projeto React/Vite separado do sistema
├── image/                       # Logo, favicon e capturas usadas neste README
└── _archive/                    # Scripts de correção e documentos de planejamento antigos, mantidos como histórico
```

Duas observações sobre essa estrutura, para quem for explorar o código:

- **`decor-venue-flow-main/` não é a landing page** — é o frontend do sistema de gestão propriamente dito. A `landing-page/` é um projeto React separado, usado só para a página de apresentação do produto.
- **`_archive/`** guarda scripts pontuais de correção e documentos estratégicos de fases anteriores do projeto. Não faz parte do sistema em execução — deixei ali como registro histórico das decisões técnicas.

---

<div align="center">

Idealizado e desenvolvido por **Edy Carlos Santana** 💜

**Dycore — 2026**

</div>
