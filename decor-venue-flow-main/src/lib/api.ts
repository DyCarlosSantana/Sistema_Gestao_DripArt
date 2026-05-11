export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:5000/api";

export class ApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

async function parseJsonSafe(res: Response) {
  const txt = await res.text().catch(() => "");
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

async function request<T>(
  path: string,
  opts?: { method?: string; query?: Record<string, string | number | boolean | undefined | null>; body?: unknown },
): Promise<T> {
  const url = new URL(API_BASE_URL.replace(/\/$/, "") + path);
  if (opts?.query) {
    Object.entries(opts.query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  const token = sessionStorage.getItem('dycore_token');
  const headers: Record<string, string> = {};
  if (opts?.body && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method: opts?.method || (opts?.body ? "POST" : "GET"),
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: opts?.body instanceof FormData ? opts.body : (opts?.body ? JSON.stringify(opts.body) : undefined),
  });

  if (res.status === 401) {
    sessionStorage.removeItem('dycore_token');
    window.dispatchEvent(new Event('dycore:unauthorized'));
  }
  if (!res.ok) {
    const details = await parseJsonSafe(res);
    throw new ApiError(`Erro HTTP ${res.status} em ${path}`, { status: res.status, details });
  }
  return (await res.json()) as T;
}

export type VendaStatus = "pago" | "fiado" | "cancelado" | string;
export type LocacaoStatus = "ativo" | "devolvido" | "atrasado" | string;
export type OrcamentoStatus = "aberto" | "aprovado" | "recusado" | "cancelado" | string;

export interface DashboardResumo {
  receita_mes: number;
  vendas_hoje_total: number;
  vendas_hoje_count: number;
  locacoes_ativas: number;
  locacoes_vencendo: number;
  locacoes_atrasadas: number;
  orcamentos_abertos: number;
  saldo_mes: number;
  mes_saidas: number;
  encomendas_pendentes: number;
  encomendas_atrasadas: number;
  fiado_total_valor: number;
  fiado_total_count: number;
  fiado_atrasado_count: number;
  fiado_atrasado_valor: number;
  alertas_locacao: Array<{
    cliente_nome: string;
    data_devolucao: string;
    total: number;
    urgencia: "atrasada" | "hoje" | "em_breve" | string;
  }>;
  receita_categorias: Array<{ tipo: string; total: number }>;
  ultimas_movimentacoes: Array<{ cliente_nome?: string; descricao: string; total: number; status: string }>;
}

export interface DashboardEvolucaoRow {
  mes: string;
  receita: number;
  despesa: number;
  saldo: number;
}

export interface VendaRow {
  id: number;
  cliente_nome?: string;
  tipo: string;
  forma_pagamento: string;
  subtotal: number;
  desconto: number;
  total: number;
  status: VendaStatus;
  criado_em: string;
  obs?: string;
  data_vencimento?: string | null;
}

export interface LocacaoRow {
  id: number;
  cliente_nome: string;
  tipo: string;
  data_retirada: string;
  data_devolucao: string;
  subtotal: number;
  desconto: number;
  total: number;
  status: LocacaoStatus;
  forma_pagamento: string;
  obs?: string;
}

export interface OrcamentoRow {
  id: number;
  numero: string;
  cliente_nome: string;
  validade: string;
  subtotal: number;
  desconto: number;
  total: number;
  status: OrcamentoStatus;
  obs?: string;
}

export interface ClienteRow {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  endereco?: string;
  obs?: string;
}

export interface FornecedorRow {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  cnpj?: string;
  endereco?: string;
  obs?: string;
}

export interface ProdutoRow {
  id: number;
  nome: string;
  categoria?: string;
  preco_venda: number;
  estoque: number;
  imagem_url?: string;
}

export interface DespesaRow {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  forma_pagamento: string;
  obs?: string;
}

export const api = {
  dashboard: () => request<DashboardResumo>("/dashboard"),
  dashboardEvolucao: () => request<DashboardEvolucaoRow[]>("/dashboard/evolucao"),
  dre: () => request<any[]>("/dashboard/dre"),
  agenda: (q?: { mes?: string; data_ini?: string; data_fim?: string }) => request<any[]>("/agenda", { query: q as any }),
  salvarEvento: (payload: any, id?: number) => request<any>(id ? `/agenda/${id}` : "/agenda", { method: id ? "PUT" : "POST", body: payload }),
  excluirEvento: (id: number) => request<void>(`/agenda/${id}`, { method: "DELETE" }),
  miniAgenda: () => request<any[]>("/agenda/proximos"),
  produtosEstoqueBaixo: (limite = 5) => request<ProdutoRow[]>("/produtos/estoque-baixo", { query: { limite } }),

  encomendas: (q?: { status?: string; q?: string }) => request<any[]>("/encomendas", { query: q as any }),
  salvarEncomenda: (payload: any, id?: number) => request<any>(id ? `/encomendas/${id}` : "/encomendas", { method: id ? "PUT" : "POST", body: payload }),
  excluirEncomenda: (id: number) => request<void>(`/encomendas/${id}`, { method: "DELETE" }),
  atualizarStatusEncomenda: (id: number, status: string) => request<any>(`/encomendas/${id}/status`, { method: "PUT", body: { status } }),
  converterEncomendaVenda: (id: number, forma_pagamento: string) =>
    request<any>(`/encomendas/${id}/converter`, { method: "POST", body: { forma_pagamento } }),

  servicos: (q?: { q?: string }) => request<any[]>("/servicos", { query: q as any }),
  salvarServico: (payload: any, id?: number) => request<any>(id ? `/servicos/${id}` : "/servicos", { method: id ? "PUT" : "POST", body: payload }),
  excluirServico: (id: number) => request<void>(`/servicos/${id}`, { method: "DELETE" }),

  configuracoes: () => request<any>("/configuracoes"),
  salvarConfiguracoes: (payload: any) => request<any>("/configuracoes", { method: "POST", body: payload }),

  cargos: () => request<any[]>("/cargos"),
  salvarCargo: (payload: any, id?: number) => request<any>(id ? `/cargos/${id}` : "/cargos", { method: id ? "PUT" : "POST", body: payload }),
  excluirCargo: (id: number) => request<void>(`/cargos/${id}`, { method: "DELETE" }),

  usuarios: () => request<any[]>("/usuarios"),
  salvarUsuario: (payload: any, id?: number) => request<any>(id ? `/usuarios/${id}` : "/usuarios", { method: id ? "PUT" : "POST", body: payload }),
  excluirUsuario: (id: number) => request<void>(`/usuarios/${id}`, { method: "DELETE" }),

  vendas: (q?: { data_ini?: string; data_fim?: string; status?: string; q?: string }) => request<VendaRow[]>("/vendas", { query: q as any }),
  vendaItens: (id: number) => request<any[]>(`/vendas/${id}/itens`),
  salvarVenda: (payload: any, id?: number) => request<any>(id ? `/vendas/${id}` : "/vendas", { method: id ? "PUT" : "POST", body: payload }),
  excluirVenda: (id: number) => request<void>(`/vendas/${id}`, { method: "DELETE" }),
  receberVendaFiado: (id: number, forma_pagamento: string) =>
    request<any>(`/vendas/${id}/receber`, { method: "PUT", body: { forma_pagamento } }),

  locacoes: (status?: string) => request<LocacaoRow[]>("/locacoes", { query: status ? { status } : undefined }),
  locacaoItens: (id: number) => request<any[]>(`/locacoes/${id}/itens`),
  salvarLocacao: (payload: any, id?: number) =>
    request<any>(id ? `/locacoes/${id}` : "/locacoes", { method: id ? "PUT" : "POST", body: payload }),
  excluirLocacao: (id: number) => request<void>(`/locacoes/${id}`, { method: "DELETE" }),
  setLocacaoStatus: (id: number, status: string) =>
    request<any>(`/locacoes/${id}/status`, { method: "PUT", body: { status } }),
  converterLocacaoVenda: (id: number, forma_pagamento: string) =>
    request<any>(`/locacoes/${id}/converter`, { method: "POST", body: { forma_pagamento } }),

  orcamentos: () => request<OrcamentoRow[]>("/orcamentos"),
  orcamentoItens: (id: number) => request<any[]>(`/orcamentos/${id}/itens`),
  salvarOrcamento: (payload: any, id?: number) =>
    request<any>(id ? `/orcamentos/${id}` : "/orcamentos", { method: id ? "PUT" : "POST", body: payload }),
  excluirOrcamento: (id: number) => request<void>(`/orcamentos/${id}`, { method: "DELETE" }),
  setOrcamentoStatus: (id: number, status: string) =>
    request<any>(`/orcamentos/${id}/status`, { method: "PUT", body: { status } }),
  converterOrcamentoVenda: (id: number, forma_pagamento: string) =>
    request<any>(`/orcamentos/${id}/converter`, { method: "POST", body: { forma_pagamento } }),
  converterOrcamentoLocacao: (id: number) =>
    request<any>(`/orcamentos/${id}/converter-locacao`, { method: "POST" }),

  clientes: (q?: string) => request<ClienteRow[]>("/clientes", { query: q ? { q } : undefined }),
  clienteTop: (periodo: "mes" | "ano" | "tudo") => request<any[]>(`/clientes/top`, { query: { periodo } }),
  clienteHistorico: (id: number) => request<any>(`/clientes/${id}/historico`),
  salvarCliente: (payload: Partial<ClienteRow>, id?: number) =>
    request<any>(id ? `/clientes/${id}` : "/clientes", { method: id ? "PUT" : "POST", body: payload }),

  produtos: () => request<ProdutoRow[]>("/produtos"),
  salvarProduto: (payload: Partial<ProdutoRow>, id?: number) =>
    request<any>(id ? `/produtos/${id}` : "/produtos", { method: id ? "PUT" : "POST", body: payload }),
  excluirProduto: (id: number) => request<void>(`/produtos/${id}`, { method: "DELETE" }),

  fornecedores: () => request<FornecedorRow[]>("/fornecedores"),
  salvarFornecedor: (payload: Partial<FornecedorRow>, id?: number) =>
    request<any>(id ? `/fornecedores/${id}` : "/fornecedores", { method: id ? "PUT" : "POST", body: payload }),
  excluirFornecedor: (id: number) => request<void>(`/fornecedores/${id}`, { method: "DELETE" }),


  despesas: (q: { data_ini: string; data_fim: string }) => request<DespesaRow[]>("/despesas", { query: q }),
  salvarDespesa: (payload: any, id?: number) =>
    request<any>(id ? `/despesas/${id}` : "/despesas", { method: id ? "PUT" : "POST", body: payload }),
  excluirDespesa: (id: number) => request<void>(`/despesas/${id}`, { method: "DELETE" }),

  // Impressão / Calculadora
  materiais: () => request<any[]>("/materiais"),
  salvarMaterial: (payload: any, id?: number) =>
    request<any>(id ? `/materiais/${id}` : "/materiais", { method: id ? "PUT" : "POST", body: payload }),
  excluirMaterial: (id: number) => request<void>(`/materiais/${id}`, { method: "DELETE" }),
  acabamentos: () => request<any[]>("/acabamentos"),
  calcularImpressao: (payload: any) => request<any>("/calcular-impressao", { method: "POST", body: payload }),

  // Locação (itens/kit)
  itensLocacao: () => request<any[]>("/itens-locacao"),
  kits: () => request<any[]>("/kits"),
  salvarItemLocacao: (payload: any, id?: number) =>
    request<any>(id ? `/itens-locacao/${id}` : "/itens-locacao", { method: id ? "PUT" : "POST", body: payload }),
  excluirItemLocacao: (id: number) => request<void>(`/itens-locacao/${id}`, { method: "DELETE" }),
  salvarKit: (payload: any, id?: number) =>
    request<any>(id ? `/kits/${id}` : "/kits", { method: id ? "PUT" : "POST", body: payload }),
  excluirKit: (id: number) => request<void>(`/kits/${id}`, { method: "DELETE" }),

  // Fluxo de caixa
  fluxoCaixa: (q: { data_ini: string; data_fim: string }) => request<any>("/fluxo-caixa", { query: q }),

  // Módulos da empresa
  modulos: () => request<any[]>("/configuracoes/modulos"),
  toggleModulo: (modulo: string, ativo: boolean) =>
    request<any>("/configuracoes/modulos/toggle", { method: "POST", body: { modulo, ativo } }),

  // Categorias de Despesa (CRUD)
  categoriasDespesa: () => request<any[]>("/configuracoes/categorias-despesa"),
  criarCategoriaDespesa: (payload: { nome: string; cor: string }) =>
    request<any>("/configuracoes/categorias-despesa", { method: "POST", body: payload }),
  atualizarCategoriaDespesa: (id: number, payload: { nome: string; cor: string }) =>
    request<any>(`/configuracoes/categorias-despesa/${id}`, { method: "PUT", body: payload }),
  excluirCategoriaDespesa: (id: number) =>
    request<void>(`/configuracoes/categorias-despesa/${id}`, { method: "DELETE" }),

  // Formas de Pagamento (CRUD)
  formasPagamento: () => request<any[]>("/configuracoes/formas-pagamento"),
  criarFormaPagamento: (payload: { nome: string; tipo: string }) =>
    request<any>("/configuracoes/formas-pagamento", { method: "POST", body: payload }),
  atualizarFormaPagamento: (id: number, payload: { nome: string; tipo: string }) =>
    request<any>(`/configuracoes/formas-pagamento/${id}`, { method: "PUT", body: payload }),
  excluirFormaPagamento: (id: number) =>
    request<void>(`/configuracoes/formas-pagamento/${id}`, { method: "DELETE" }),

  // Senha e perfil
  alterarMinhaSenha: (senha_atual: string, nova_senha: string) =>
    request<any>("/me/senha", { method: "PUT", body: { senha_atual, nova_senha } }),

  // Usuário editar
  editarUsuario: (id: number, payload: any) =>
    request<any>(`/usuarios/${id}`, { method: "PUT", body: payload }),

  // Backups
  backups: () => request<any[]>("/backup/lista"),
  fazerBackupManual: () => request<any>("/backup/manual", { method: "POST" }),

  // Logo
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>("/upload/logo", { method: "POST", body: formData });
  },
};
