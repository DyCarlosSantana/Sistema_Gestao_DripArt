import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet, Banknote, CreditCard, Landmark } from "lucide-react";
import { parseInputNumber } from "@/lib/utils";

export interface PagamentoPayload {
  forma: string;
  valor: number;
}

interface PagamentoSplit extends PagamentoPayload {
  id: string;
}

interface PaymentSplitterProps {
  total: number;
  formasPagamento: any[];
  onChange: (pagamentos: PagamentoPayload[]) => void;
  defaultForma?: string;
  disabled?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

function getFormaIcon(forma: string) {
  const f = forma.toLowerCase();
  if (f.includes('pix')) return <Landmark className="h-4 w-4 text-emerald-500" />;
  if (f.includes('cart') || f.includes('credito') || f.includes('debito')) return <CreditCard className="h-4 w-4 text-blue-500" />;
  if (f.includes('dinheiro')) return <Banknote className="h-4 w-4 text-green-600" />;
  return <Wallet className="h-4 w-4 text-muted-foreground" />;
}

export function PaymentSplitter({ total, formasPagamento, onChange, defaultForma = "dinheiro", disabled = false }: PaymentSplitterProps) {
  const [pagamentos, setPagamentos] = useState<PagamentoSplit[]>([{ id: generateId(), forma: defaultForma, valor: total }]);

  useEffect(() => {
    onChange(pagamentos.map(({ id, ...rest }) => rest));
  }, [pagamentos]);

  useEffect(() => {
    if (pagamentos.length === 1) {
      setPagamentos([{ ...pagamentos[0], valor: total }]);
    }
  }, [total]);

  const addPagamento = () => {
    const somaAtual = pagamentos.reduce((acc, p) => acc + p.valor, 0);
    const restante = total - somaAtual;
    setPagamentos([...pagamentos, { id: generateId(), forma: formasPagamento[0]?.nome || "dinheiro", valor: restante > 0 ? restante : 0 }]);
  };

  const removePagamento = (id: string) => {
    setPagamentos(pagamentos.filter((p) => p.id !== id));
  };

  const updatePagamento = (id: string, field: keyof PagamentoSplit, val: any) => {
    setPagamentos(pagamentos.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const somaAtual = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const diff = total - somaAtual;
  const progress = total > 0 ? Math.min(100, Math.max(0, (somaAtual / total) * 100)) : 100;
  
  let statusColor = "bg-primary";
  if (diff < 0) statusColor = "bg-destructive";
  else if (diff === 0) statusColor = "bg-success";

  return (
    <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-sm font-bold text-foreground">Divisão de Pagamentos</label>
          <span className="text-xs text-muted-foreground">Especifique como o valor de {total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} será pago.</span>
        </div>
        <div className={`text-right flex flex-col`}>
          <span className={`text-sm font-bold ${diff > 0 ? 'text-warning' : diff < 0 ? 'text-destructive' : 'text-success'}`}>
            {diff > 0 ? `Falta ${diff.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}` : 
             diff < 0 ? `Excede ${Math.abs(diff).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}` : 
             'Valor exato atingido'}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Total recebido: {somaAtual.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
          </span>
        </div>
      </div>

      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${statusColor} transition-all duration-300 ease-out`} style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2">
        {pagamentos.map((p, index) => (
          <div key={p.id} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-2.5 z-10 pointer-events-none">
                {getFormaIcon(p.forma)}
              </div>
              <Select value={p.forma} onValueChange={(v) => updatePagamento(p.id, "forma", v)} disabled={disabled}>
                <SelectTrigger className="h-9 text-sm pl-9 font-medium shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((f: any) => (
                    <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36 relative">
              <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">R$</span>
              <Input 
                type="text" 
                className={`h-9 pl-8 text-sm font-semibold shadow-sm ${p.valor < 0 ? 'text-destructive border-destructive' : ''}`}
                value={p.valor || ""}
                onChange={(e) => updatePagamento(p.id, "valor", parseInputNumber(e.target.value))}
                disabled={disabled}
              />
            </div>
            {pagamentos.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removePagamento(p.id)} disabled={disabled}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        className="w-full h-9 text-xs font-medium gap-1.5 border-dashed bg-background/50 hover:bg-background" 
        onClick={addPagamento}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar Parcela de Pagamento
      </Button>
    </div>
  );
}
