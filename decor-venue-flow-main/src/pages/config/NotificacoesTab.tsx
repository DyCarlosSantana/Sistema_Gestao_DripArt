import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NotificacoesTab() {
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["config_notificacoes"], queryFn: api.configNotificacoes });

  const [form, setForm] = useState({
    locacao_vencimento_iminente: 1,
    locacao_vencido: 1,
    locacao_confirmacao_entrega: 1,
    fin_pagamento_recebido: 1,
    fin_pagamento_atraso: 1,
    fin_desconto_acima_limite: 1,
    est_baixo_minimo: 1,
    est_zerado: 1,
    canal_whatsapp: "93992061371",
    canal_email: "edy@dripArt.com.br"
  });

  useEffect(() => {
    if (config) {
      setForm((prev) => ({ ...prev, ...config }));
    }
  }, [config]);

  const saveM = useMutation({
    mutationFn: (data: any) => api.atualizarConfigNotificacoes(data),
    onSuccess: () => {
      showToast.success("Notificações salvas com sucesso!");
      qc.invalidateQueries({ queryKey: ["config_notificacoes"] });
    },
    onError: () => showToast.error("Erro ao salvar notificações"),
  });

  const handleToggle = (field: keyof typeof form, checked: boolean) => {
    setForm(prev => ({ ...prev, [field]: checked ? 1 : 0 }));
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveM.mutate(form);
  };

  return (
    <div className="w-full">
      <div className="card">
        <div className="card-head" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(348, 83%, 47%, 0.1)", color: "hsl(348, 83%, 47%)" }}>
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: "15px" }}>Central de Notificações</div>
              <div style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "2px" }}>Configure quando e como o sistema deve alertar você e sua equipe.</div>
            </div>
          </div>
        </div>
        
        <div className="card-body p-6 space-y-6">
          {/* Locações */}
          <div>
            <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-border">
              Locações
            </div>
            <div className="flex flex-col border-b border-border/50 py-3.5 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Alerta de vencimento iminente</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Avisar 3 dias antes do vencimento de um contrato de locação.</div>
                </div>
                <Switch checked={form.locacao_vencimento_iminente === 1} onCheckedChange={(c) => handleToggle("locacao_vencimento_iminente", c)} />
              </div>
            </div>
            <div className="flex flex-col border-b border-border/50 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Contrato vencido sem renovação</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Notificar o responsável e o admin quando a locação passar da data.</div>
                </div>
                <Switch checked={form.locacao_vencido === 1} onCheckedChange={(c) => handleToggle("locacao_vencido", c)} />
              </div>
            </div>
            <div className="flex flex-col py-3.5 pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Confirmação de entrega/retirada</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Enviar notificação ao cliente quando o status da entrega mudar.</div>
                </div>
                <Switch checked={form.locacao_confirmacao_entrega === 1} onCheckedChange={(c) => handleToggle("locacao_confirmacao_entrega", c)} />
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-border">
              Financeiro
            </div>
            <div className="flex flex-col border-b border-border/50 py-3.5 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Pagamento recebido</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Notificar o admin quando uma venda ou locação for paga.</div>
                </div>
                <Switch checked={form.fin_pagamento_recebido === 1} onCheckedChange={(c) => handleToggle("fin_pagamento_recebido", c)} />
              </div>
            </div>
            <div className="flex flex-col border-b border-border/50 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Pagamento em atraso</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Alertar após X dias sem pagamento confirmado.</div>
                </div>
                <Switch checked={form.fin_pagamento_atraso === 1} onCheckedChange={(c) => handleToggle("fin_pagamento_atraso", c)} />
              </div>
            </div>
            <div className="flex flex-col py-3.5 pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Desconto acima do limite aprovado</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Admin recebe alerta quando um vendedor tenta aplicar desconto acima do permitido.</div>
                </div>
                <Switch checked={form.fin_desconto_acima_limite === 1} onCheckedChange={(c) => handleToggle("fin_desconto_acima_limite", c)} />
              </div>
            </div>
          </div>

          {/* Estoque */}
          <div>
            <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-border">
              Estoque
            </div>
            <div className="flex flex-col border-b border-border/50 py-3.5 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Produto abaixo do estoque mínimo</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Alertar quando qualquer produto atingir o nível mínimo configurado.</div>
                </div>
                <Switch checked={form.est_baixo_minimo === 1} onCheckedChange={(c) => handleToggle("est_baixo_minimo", c)} />
              </div>
            </div>
            <div className="flex flex-col py-3.5 pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">Produto zerado</div>
                  <div className="text-[12px] text-muted-foreground mt-[3px]">Notificação crítica quando o estoque de um produto chegar a zero.</div>
                </div>
                <Switch checked={form.est_zerado === 1} onCheckedChange={(c) => handleToggle("est_zerado", c)} />
              </div>
            </div>
          </div>

          {/* Canais de Envio */}
          <div>
            <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-border">
              Canais de Envio
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-[0.07em]">WhatsApp (número receptor)</label>
                <Input 
                  value={form.canal_whatsapp} 
                  onChange={(e) => handleChange("canal_whatsapp", e.target.value)} 
                  className="bg-surface2"
                />
                <p className="text-[11.5px] text-muted-foreground mt-1">Requer integração ativa com WhatsApp Business API.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-[0.07em]">E-mail receptor de alertas</label>
                <Input 
                  type="email"
                  value={form.canal_email} 
                  onChange={(e) => handleChange("canal_email", e.target.value)} 
                  className="bg-surface2"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-foot" style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.15)", display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={handleSave} disabled={saveM.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            {saveM.isPending ? "Salvando..." : "Salvar preferências"}
          </Button>
        </div>
      </div>
    </div>
  );
}
