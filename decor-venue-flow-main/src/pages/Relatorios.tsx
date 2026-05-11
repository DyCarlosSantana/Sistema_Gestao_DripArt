import { useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { TimeFilter } from "@/components/TimeFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { API_BASE_URL } from "@/lib/api";

export default function RelatoriosPage() {
  const [dataIni, setDataIni] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const handleFilterChange = useCallback((ini: string, fim: string) => {
    setDataIni(ini);
    setDataFim(fim);
  }, []);
  
  const handleExportar = () => {
    if (!dataIni || !dataFim) {
      toast.error("Por favor, selecione as duas datas.");
      return;
    }
    
    // O backend irá gerar um arquivo PDF para baixar automaticamente
    const url = `${API_BASE_URL}/relatorios/exportar?data_ini=${dataIni}&data_fim=${dataFim}`;
    window.open(`${url}&token=${sessionStorage.getItem("dycore_token") || ""}`, "_blank");
    toast.success("Download do relatório iniciado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-foreground">Relatórios Gerenciais</h1>
        <p className="text-sm text-muted-foreground">
          Gere relatórios completos em PDF com balanço de vendas, entradas, saídas e ranking de formas de pagamento.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <TimeFilter onFilterChange={handleFilterChange} defaultOption="este_mes" />

          <Button 
            className="w-full sm:w-auto mt-4 sm:mt-0"
            size="lg"
            onClick={handleExportar}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        <div className="mt-10 rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center text-center border border-dashed border-border/50">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            O que contém o relatório?
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            O PDF incluirá o faturamento total do período, quantidade de pedidos por tipo (Vendas, Locações, Encomendas), ranking de métodos de pagamento, e o sumário detalhado de despesas.
          </p>
        </div>
      </div>
    </div>
  );
}
