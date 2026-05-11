import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Users,
  Box,
  PartyPopper,
  Calculator,
  Receipt,
  TrendingUp,
  CreditCard,
  Calendar,
  ClipboardList,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavChild {
  title: string;
  path: string;
  /** Chave do módulo correspondente. Null = sempre visível. */
  modulo: string | null;
  /** Se definido, apenas esse cargo mínimo vê */
  minRole?: "admin" | "gerente";
}

export interface NavGroup {
  /** Rótulo do grupo (tooltip quando hover) */
  label: string;
  icon: LucideIcon;
  /** Se definido, clicar no ícone navega direto (sem flyout) */
  path?: string;
  /** Sub-itens que aparecem no flyout */
  children?: NavChild[];
  modulo?: string | null;
  minRole?: "admin" | "gerente";
}

export const navigation: NavGroup[] = [
  {
    label: "Início",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    label: "Dashboard",
    icon: TrendingUp,
    path: "/dashboard",
    modulo: "dashboard",
  },
  {
    label: "Vendas",
    icon: ShoppingCart,
    children: [
      { title: "Caixa / PDV", path: "/pdv", modulo: "pdv" },
      { title: "Orçamentos", path: "/orcamentos", modulo: "orcamentos" },
      { title: "Calculadora", path: "/calculadora", modulo: "calculadora" },
    ],
  },
  {
    label: "Locação",
    icon: Package,
    children: [
      { title: "Locações", path: "/locacoes", modulo: "locacoes" },
      { title: "Itens p/ Locação", path: "/itens-locacao", modulo: "itens_locacao" },
    ],
  },
  {
    label: "Cadastros",
    icon: Users,
    children: [
      { title: "Clientes", path: "/clientes", modulo: "clientes" },
      { title: "Mercadorias", path: "/produtos", modulo: "produtos" },
      { title: "Serviços", path: "/servicos", modulo: "servicos" },
    ],
  },
  {
    label: "Financeiro",
    icon: Receipt,
    children: [
      { title: "Despesas", path: "/despesas", modulo: "despesas", minRole: "gerente" },
      { title: "Fluxo de Caixa", path: "/fluxo", modulo: "fluxo_caixa", minRole: "gerente" },
      { title: "Contas a Receber", path: "/fiado", modulo: "fiado" },
    ],
  },
  {
    label: "Agenda",
    icon: Calendar,
    children: [
      { title: "Agenda", path: "/agenda", modulo: "agenda" },
      { title: "Encomendas", path: "/encomendas", modulo: "encomendas" },
    ],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    path: "/relatorios",
    modulo: "relatorios",
    minRole: "gerente",
  },
  {
    label: "Configurações",
    icon: Settings,
    path: "/configuracoes",
    modulo: "configuracoes",
    minRole: "admin",
  },
];
