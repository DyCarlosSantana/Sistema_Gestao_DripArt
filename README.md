<div align="center">

# Dycore — Modern Management SaaS

**Plataforma inteligente de gestão para empresas de decoração, eventos e produtos personalizados.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## ✨ Sobre o Projeto

O **Dycore** é um ecossistema SaaS completo, projetado para centralizar e otimizar todas as operações de negócios que lidam com vendas, locações de itens, produção sob encomenda e serviços de impressão. Com uma interface moderna, responsiva e minimalista, o sistema elimina a complexidade operacional e entrega agilidade no dia a dia.

> Originalmente concebido para o setor de decoração e eventos, o Dycore evoluiu para uma plataforma robusta e multi-tenant, capaz de atender diversos segmentos de mercado.

---

## 🖥️ Interface

<div align="center">

|                     Login                     |                 Dashboard                 |
| :--------------------------------------------: | :----------------------------------------: |
| ![Tela de Login](image/README/1776399320037.png) | ![Dashboard](image/README/1776399329653.png) |

</div>

---

## 💎 Módulos do Sistema

| Módulo                           | Descrição                                                                                                                  |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **📊 Dashboard**            | Métricas em tempo real, gráficos de faturamento e atalhos rápidos para as operações mais utilizadas.                    |
| **🛒 PDV (Ponto de Venda)** | Check-out ágil com suporte a múltiplas formas de pagamento, pagamentos parciais e geração automática de recibos em PDF. |
| **📦 Locações**           | Controle completo de contratos de locação, disponibilidade de itens por data e kits personalizados.                        |
| **📅 Agenda & Encomendas**  | Calendário visual integrado ao fluxo de produção, com rastreamento de status (Pedido → Produção → Entregue).          |
| **💰 Financeiro**           | Fluxo de caixa detalhado, gestão de despesas por categoria e controle rigoroso de vendas a prazo (Fiado).                   |
| **📋 Orçamentos**          | Geração de propostas profissionais com validade configurável e emissão de PDF com QR Code PIX.                           |
| **👥 Clientes & Produtos**  | Cadastro completo com visualização em cards, busca inteligente e controle de estoque.                                      |
| **⚙️ Configurações**    | Gestão de usuários com sistema de Cargos e Permissões, personalização de logo e ativação de módulos.                 |

---

## 🛠️ Stack Tecnológica

<div align="center">

| Camada                   | Tecnologias                                                                     |
| :----------------------- | :------------------------------------------------------------------------------ |
| **Frontend**       | React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Lucide Icons |
| **Backend**        | Python · Flask · Werkzeug · Flask-JWT-Extended                               |
| **Banco de Dados** | PostgreSQL 16 (Neon.tech — Serverless Cloud)                                   |
| **Relatórios**    | ReportLab (Geração dinâmica de PDFs) · Pillow (Processamento de imagens)    |
| **Segurança**     | JWT · Hashing Bcrypt · Controle de Acesso por Roles (RBAC)                    |

</div>

---

## 🔒 Níveis de Acesso

O sistema implementa controle de acesso baseado em papéis (RBAC):

| Role               | Permissões                                                                  |
| :----------------- | :--------------------------------------------------------------------------- |
| **Admin**    | Controle total: configurações, usuários, financeiro e todos os módulos.  |
| **Gerente**  | Acesso a relatórios financeiros e operações, sem configurações globais. |
| **Operador** | Acesso restrito a vendas, agenda e cadastros operacionais.                   |

---

## 📥 Início Rápido

### Pré-requisitos

- **Python 3.10+** instalado e configurado no PATH.
- Conexão com a internet (banco de dados hospedado na nuvem).

### Execução (Windows)

```
INICIAR_LOJA.bat
```

O sistema será iniciado automaticamente e abrirá no navegador em `http://localhost:5000`.

> Para instruções técnicas detalhadas sobre ambientes e desenvolvimento, consulte o [Guia do Desenvolvedor](./DEVELOPER.md).

---

## 📂 Estrutura do Projeto

```
Dycore/
├── app.py                      # API Flask — rotas, autenticação e lógica de negócio
├── database.py                 # Camada de dados — PostgreSQL com suporte multi-ambiente
├── pdf_generator.py            # Motor de geração de recibos e contratos em PDF
├── auth.py                     # Middleware de autenticação JWT
├── INICIAR_LOJA.bat            # Inicialização rápida (Produção)
├── INICIAR_DEV.bat             # Inicialização rápida (Desenvolvimento)
├── decor-venue-flow-main/      # Frontend React/Vite/TypeScript
│   ├── src/
│   │   ├── pages/              # Telas do sistema (Dashboard, PDV, Agenda...)
│   │   ├── components/         # Componentes reutilizáveis (Sidebar, Modais, UI)
│   │   └── lib/                # Utilitários (API client, formatadores, navegação)
│   └── dist/                   # Build otimizado servido pelo Flask
├── landing-page/               # Landing page institucional
└── docs/                       # PDFs gerados pelo sistema (recibos, contratos)
```

---

<div align="center">

Idealizado e desenvolvido por **Ed****y Carlos Santana** 💜

**Dycore - 2026**

</div>
