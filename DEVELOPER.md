# 🛠️ Guia do Desenvolvedor - Dycore SaaS

Este documento contém as instruções técnicas para operar, manter e evoluir o ecossistema Dycore.

## 🏗️ Arquitetura de Ambientes

O sistema opera com paridade total entre os ambientes de Produção e Desenvolvimento, utilizando arquivos de configuração distintos.

### 🏪 Ambiente de Produção (LOJA)

- **Atalho:** `INICIAR_LOJA.bat`
- **Variáveis:** `.env.prod`
- **Banco de Dados:** Neon.tech (Produção)
- **Branch Git:** `main` (Sempre estável)

### 🧪 Ambiente de Desenvolvimento (TESTES)

- **Atalho:** `INICIAR_DEV.bat`
- **Variáveis:** `.env.dev`
- **Banco de Dados:** Neon.tech (Dev - `dycore_dev`)
- **Branch Git:** `develop` (Onde o código é escrito)

---

## 🚀 Fluxo de Trabalho Recomendado

1. **Desenvolvimento:** Sempre realize alterações na branch `develop`.
2. **Testes:** Valide as mudanças usando o `INICIAR_DEV.bat`.
3. **Deploy (Loja):** Quando uma funcionalidade estiver pronta e testada, faça o merge da `develop` para a `main`.
4. **Atualização:** Após o merge, a versão da loja estará atualizada no próximo início do `INICIAR_LOJA.bat`.

---

## 💾 Gestão do Banco de Dados

O sistema utiliza o PostgreSQL (Neon.tech). Para inicializar um novo banco de dados (como ao criar um novo ambiente):

1. Configure a `DATABASE_URL` no arquivo `.env` correspondente.
2. Execute o comando no terminal:
   ```powershell
   python database.py
   ```

   *Este comando criará automaticamente todas as tabelas e inserirá os dados padrão (seed).*

---

## 📂 Organização de Arquivos

- `app.py`: Servidor Flask e rotas da API.
- `database.py`: Camada de dados e lógica de inicialização.
- `pdf_generator.py`: Motor de geração de recibos e contratos.
- `decor-venue-flow-main/`: Código fonte do Frontend (React).
- `_archive/`: Legado e scripts de manutenção antiga.

---

## ⚙️ Manutenção do Frontend

Para realizar alterações visuais:

1. Navegue até a pasta `decor-venue-flow-main`.
2. Execute `npm install` (se for a primeira vez).
3. Use `npm run build` para gerar a versão otimizada que o Flask serve.

---

**Santizo - Engenharia de Software 2026**
