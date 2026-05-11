import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, MessageSquare, Info } from "lucide-react";

export default function IntegracoesTab() {
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["config_integracoes"], queryFn: api.configIntegracoes });

  const [form, setForm] = useState({
    gateway_pagamento: "nenhum",
    gateway_api_key: "",
    whatsapp_api_token: "",
    whatsapp_ativo: 0,
    google_calendar_sync: 0,
  });

  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setForm((prev) => ({ ...prev, ...config }));
    }
  }, [config]);

  const saveM = useMutation({
    mutationFn: (data: any) => api.atualizarConfigIntegracoes(data),
    onSuccess: () => {
      showToast.success("Integrações salvas com sucesso!");
      qc.invalidateQueries({ queryKey: ["config_integracoes"] });
      setActiveModal(null);
    },
    onError: () => showToast.error("Erro ao salvar integrações"),
  });

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleDisconnectGateway = () => {
    setForm({ ...form, gateway_pagamento: "nenhum", gateway_api_key: "" });
    saveM.mutate({ ...form, gateway_pagamento: "nenhum", gateway_api_key: "" });
  };

  const handleDisconnectWhatsapp = () => {
    setForm({ ...form, whatsapp_ativo: 0, whatsapp_api_token: "" });
    saveM.mutate({ ...form, whatsapp_ativo: 0, whatsapp_api_token: "" });
  };

  const saveChanges = () => {
    saveM.mutate(form);
  };

  const isGatewayActive = form.gateway_pagamento !== "nenhum";
  const isWhatsappActive = form.whatsapp_ativo === 1;

  const handleComingSoon = () => {
    showToast.info("Esta integração estará disponível em breve!");
  };

  return (
    <div className="space-y-6 max-w-[1000px]">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--blue-soft)] border border-[var(--blue-border)] rounded-md text-[13px] text-muted-foreground">
        <Info className="h-4 w-4 text-blue-500 shrink-0" />
        Integrações conectam o sistema a serviços externos. As credenciais são criptografadas e nunca exibidas após salvas.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* WhatsApp Business */}
        <div className={`bg-surface2 border rounded-lg p-4 flex items-center gap-3.5 transition-colors hover:border-border-hover ${isWhatsappActive ? "border-green-500/30" : "border-border"}`}>
          <div className="w-11 h-11 rounded-lg bg-surface3 flex items-center justify-center text-[22px] shrink-0">📦</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-foreground">WhatsApp Business</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">Envio automático de notificações, comprovantes e alertas.</div>
            <div className={`text-[11px] mt-1.5 font-semibold ${isWhatsappActive ? "text-green-500" : "text-muted-foreground"}`}>
              ● {isWhatsappActive ? "Conectado" : "Desconectado"}
            </div>
          </div>
          <div className="ml-auto shrink-0">
            {isWhatsappActive ? (
              <Button size="sm" variant="destructive" onClick={handleDisconnectWhatsapp} className="h-7 text-[11.5px] px-3 font-semibold">Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => setActiveModal('whatsapp')} className="h-7 text-[11.5px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Conectar</Button>
            )}
          </div>
        </div>

        {/* Google Drive */}
        <div className="bg-surface2 border border-border rounded-lg p-4 flex items-center gap-3.5 transition-colors hover:border-border-hover">
          <div className="w-11 h-11 rounded-lg bg-surface3 flex items-center justify-center text-[22px] shrink-0">📄</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-foreground">Google Drive</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">Backup automático de contratos, relatórios e documentos.</div>
            <div className="text-[11px] mt-1.5 font-semibold text-muted-foreground">● Desconectado</div>
          </div>
          <div className="ml-auto shrink-0">
            <Button size="sm" onClick={handleComingSoon} className="h-7 text-[11.5px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Conectar</Button>
          </div>
        </div>

        {/* NFe / NFS-e */}
        <div className="bg-surface2 border border-border rounded-lg p-4 flex items-center gap-3.5 transition-colors hover:border-border-hover">
          <div className="w-11 h-11 rounded-lg bg-surface3 flex items-center justify-center text-[22px] shrink-0">🧾</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-foreground">NFe / NFS-e</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">Emissão de notas fiscais diretamente pelo sistema.</div>
            <div className="text-[11px] mt-1.5 font-semibold text-muted-foreground">● Desconectado</div>
          </div>
          <div className="ml-auto shrink-0">
            <Button size="sm" onClick={handleComingSoon} className="h-7 text-[11.5px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Configurar</Button>
          </div>
        </div>

        {/* Asaas / PagBank */}
        <div className={`bg-surface2 border rounded-lg p-4 flex items-center gap-3.5 transition-colors hover:border-border-hover ${isGatewayActive ? "border-green-500/30" : "border-border"}`}>
          <div className="w-11 h-11 rounded-lg bg-surface3 flex items-center justify-center text-[22px] shrink-0">💳</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-foreground">Asaas / PagBank</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">Cobranças automáticas, boleto, PIX e link de pagamento.</div>
            <div className={`text-[11px] mt-1.5 font-semibold ${isGatewayActive ? "text-green-500" : "text-muted-foreground"}`}>
              ● {isGatewayActive ? "Conectado" : "Desconectado"}
            </div>
          </div>
          <div className="ml-auto shrink-0">
            {isGatewayActive ? (
              <Button size="sm" variant="destructive" onClick={handleDisconnectGateway} className="h-7 text-[11.5px] px-3 font-semibold">Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => setActiveModal('gateway')} className="h-7 text-[11.5px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Conectar</Button>
            )}
          </div>
        </div>

        {/* Google Sheets */}
        <div className="bg-surface2 border border-border rounded-lg p-4 flex items-center gap-3.5 transition-colors hover:border-border-hover">
          <div className="w-11 h-11 rounded-lg bg-surface3 flex items-center justify-center text-[22px] shrink-0">📊</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-foreground">Google Sheets</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">Exportação automática de relatórios para planilhas.</div>
            <div className="text-[11px] mt-1.5 font-semibold text-muted-foreground">● Desconectado</div>
          </div>
          <div className="ml-auto shrink-0">
            <Button size="sm" onClick={handleComingSoon} className="h-7 text-[11.5px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Conectar</Button>
          </div>
        </div>

        {/* Webhooks */}
        <div className="bg-surface2 border border-border rounded-lg p-4 flex items-center gap-3.5 transition-colors hover:border-border-hover opacity-80">
          <div className="w-11 h-11 rounded-lg bg-surface3 flex items-center justify-center text-[22px] shrink-0">🔗</div>
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div>
              <div className="text-[13.5px] font-semibold text-foreground">Webhooks</div>
              <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">Envie eventos do sistema para qualquer URL externa.</div>
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">Novo</span>
              </div>
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <Button size="sm" variant="ghost" disabled className="h-7 text-[11.5px] px-3 font-semibold opacity-50">Indisponível</Button>
          </div>
        </div>

      </div>

      {/* Gateway Dialog */}
      <Dialog open={activeModal === 'gateway'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-background border-border rounded-lg shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-bold flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><CreditCard className="h-4 w-4"/></div>
              Conectar Gateway
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4 bg-surface/50">
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">Provedor de Pagamento</label>
              <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" value={form.gateway_pagamento} onChange={(e) => handleChange("gateway_pagamento", e.target.value)}>
                <option value="nenhum">Nenhum (Apenas controle manual)</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="asaas">Asaas</option>
                <option value="pagseguro">PagSeguro</option>
              </select>
            </div>
            {form.gateway_pagamento !== "nenhum" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">Chave de API / Access Token</label>
                <Input type="password" placeholder="Insira a API Key do provedor" value={form.gateway_api_key} onChange={(e) => handleChange("gateway_api_key", e.target.value)} className="h-10 bg-background border-border" />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t border-border bg-surface2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">Cancelar</Button>
            <Button size="sm" onClick={saveChanges} disabled={saveM.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6">
              {saveM.isPending ? "Salvando..." : "Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={activeModal === 'whatsapp'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-background border-border rounded-lg shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-bold flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-green-500/10 text-green-500 flex items-center justify-center"><MessageSquare className="h-4 w-4"/></div>
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-5 bg-surface/50">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
              <div>
                <h4 className="font-bold text-[13.5px] text-foreground">Habilitar WhatsApp</h4>
                <p className="text-[12px] text-muted-foreground mt-0.5">Envie mensagens automáticas para os clientes.</p>
              </div>
              <Switch checked={form.whatsapp_ativo === 1} onCheckedChange={(c) => handleChange("whatsapp_ativo", c ? 1 : 0)} />
            </div>

            {form.whatsapp_ativo === 1 && (
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">Token da API (Z-API / Evolution)</label>
                <Input type="password" placeholder="Insira o token de integração" value={form.whatsapp_api_token} onChange={(e) => handleChange("whatsapp_api_token", e.target.value)} className="h-10 bg-background border-border" />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t border-border bg-surface2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">Cancelar</Button>
            <Button size="sm" onClick={saveChanges} disabled={saveM.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6">
              {saveM.isPending ? "Salvando..." : "Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
