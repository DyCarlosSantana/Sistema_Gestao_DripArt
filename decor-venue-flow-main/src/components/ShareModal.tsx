import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Send, ExternalLink, FileText, Search } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  arquivo: string;
  docLabel: string;
  tipo: "orcamento" | "venda" | "locacao" | "encomenda";
  telefoneCliente?: string;
  emailCliente?: string;
  total?: number;
}

const TIPO_LABELS: Record<string, string> = {
  orcamento: "Orçamento",
  venda: "Comprovante de Venda",
  locacao: "Contrato de Locação",
  encomenda: "Pedido de Encomenda",
};

export default function ShareModal({
  open, onClose, arquivo, docLabel, tipo,
  telefoneCliente = "", emailCliente = "", total,
}: ShareModalProps) {
  const docUrl = api.docUrl(arquivo);
  const tipoLabel = TIPO_LABELS[tipo] || "Documento";

  const defaultMsgLink = total
    ? `Olá! Segue o ${tipoLabel} *${docLabel}* no valor de *R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*.\n\nAcesse o documento: ${docUrl}`
    : `Olá! Segue o ${tipoLabel} *${docLabel}*.\n\nAcesse o documento: ${docUrl}`;
    
  const defaultMsgAnexo = total
    ? `Olá! Segue em anexo o ${tipoLabel} *${docLabel}* no valor de *R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*.`
    : `Olá! Segue em anexo o ${tipoLabel} *${docLabel}*.`;

  const defaultAssunto = `${tipoLabel} ${docLabel} — Dycore ERP`;

  const [tab, setTab] = useState<"whatsapp" | "email">("whatsapp");
  const [modoEnvio, setModoEnvio] = useState<"link" | "anexo">("link");
  
  const [telefone, setTelefone] = useState(telefoneCliente.replace(/\D/g, ""));
  const [waMensagem, setWaMensagem] = useState(defaultMsgLink);
  const [emailDest, setEmailDest] = useState(emailCliente);
  const [assunto, setAssunto] = useState(defaultAssunto);
  const [mensagem, setMensagem] = useState(defaultMsgLink);
  
  const [buscaCliente, setBuscaCliente] = useState("");

  const clientesQ = useQuery({
    queryKey: ["clientes_share"],
    queryFn: () => api.clientes(),
    enabled: open
  });

  const emailM = useMutation({
    mutationFn: () => api.enviarEmail({
      destinatario: emailDest,
      assunto,
      mensagem,
      arquivo: modoEnvio === "anexo" ? arquivo : undefined,
    }),
    onSuccess: (res) => {
      showToast.success(res.mensagem || "Email enviado com sucesso!");
      onClose();
    },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao enviar email."),
  });

  const waM = useMutation({
    mutationFn: () => api.enviarWhatsapp({
      numero: telefone,
      mensagem: waMensagem,
      arquivo: modoEnvio === "anexo" ? arquivo : undefined,
    }),
    onSuccess: (res) => {
      showToast.success(res.mensagem || "WhatsApp enviado com sucesso!");
      onClose();
    },
    onError: (e: any) => showToast.error(e.details?.erro || "Erro ao enviar via WhatsApp API. Verifique a Evolution API em Configurações > Integrações."),
  });

  const handleWhatsAppWeb = () => {
    const num = telefone.replace(/\D/g, "");
    const numFormatado = num.startsWith("55") ? num : `55${num}`;
    const url = `https://api.whatsapp.com/send?phone=${numFormatado}&text=${encodeURIComponent(waMensagem)}`;
    window.open(url, "_blank");
  };
  
  const handleModoEnvioChange = (modo: "link" | "anexo") => {
    setModoEnvio(modo);
    if (modo === "link") {
      setWaMensagem(defaultMsgLink);
      setMensagem(defaultMsgLink);
    } else {
      setWaMensagem(defaultMsgAnexo);
      setMensagem(defaultMsgAnexo);
    }
  };

  const selecionarCliente = (c: any) => {
    if (c.telefone) setTelefone(c.telefone.replace(/\D/g, ""));
    if (c.email) setEmailDest(c.email);
    setBuscaCliente("");
  };

  const clientesFiltrados = (clientesQ.data || []).filter((c: any) => 
    buscaCliente && c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  ).slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-background border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold">Compartilhar Documento</DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                {tipoLabel} · {docLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Abrir PDF */}
          <a
            href={docUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary hover:border-primary/40 transition-colors text-sm font-medium text-foreground"
          >
            <ExternalLink className="h-4 w-4 text-primary shrink-0" />
            Visualizar PDF em nova aba
          </a>
          
          <div className="space-y-1.5 pt-2">
             <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
               Buscar Cliente (Preencher Contato)
             </label>
             <div className="relative">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Digite o nome do cliente..." 
                 value={buscaCliente}
                 onChange={(e) => setBuscaCliente(e.target.value)}
                 className="pl-9 bg-secondary border-border"
               />
             </div>
             {clientesFiltrados.length > 0 && (
               <div className="bg-background border border-border rounded-md mt-1 p-1 shadow-sm absolute z-10 w-[470px]">
                 {clientesFiltrados.map((c: any) => (
                   <div key={c.id} onClick={() => selecionarCliente(c)} className="p-2 hover:bg-secondary rounded-sm cursor-pointer text-sm">
                     <span className="font-medium">{c.nome}</span>
                     <span className="text-muted-foreground ml-2 text-xs">{c.telefone || c.email || 'Sem contato'}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
          
          <div className="space-y-1.5 pt-2">
             <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
               Modo de Envio
             </label>
             <RadioGroup defaultValue="link" value={modoEnvio} onValueChange={handleModoEnvioChange as any} className="flex gap-4">
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="link" id="r1" />
                 <label htmlFor="r1" className="text-sm cursor-pointer">Enviar Link (Recomendado)</label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="anexo" id="r2" />
                 <label htmlFor="r2" className="text-sm cursor-pointer">Enviar PDF em Anexo</label>
               </div>
             </RadioGroup>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 gap-1 mt-4">
            {[
              { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
              { key: "email", label: "Email", icon: Mail, color: "hsl(var(--primary))" },
            ].map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-semibold transition-all ${
                  tab === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: tab === key ? color : undefined }} />
                {label}
              </button>
            ))}
          </div>

          {/* WhatsApp */}
          {tab === "whatsapp" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Número do WhatsApp
                </label>
                <Input
                  placeholder="Ex: 93992061234"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Mensagem
                </label>
                <textarea
                  rows={5}
                  value={waMensagem}
                  onChange={(e) => setWaMensagem(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  className="w-full gap-2 font-bold bg-[#25D366] hover:bg-[#20ba59] text-white"
                  onClick={() => waM.mutate()}
                  disabled={waM.isPending || !telefone.replace(/\D/g, "")}
                >
                  <Send className="h-4 w-4" />
                  {waM.isPending ? "Enviando via API..." : "Enviar via API (Background)"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 font-semibold"
                  onClick={handleWhatsAppWeb}
                  disabled={!telefone.replace(/\D/g, "") || modoEnvio === "anexo"}
                  title={modoEnvio === "anexo" ? "O WhatsApp Web não suporta envio automático de anexos. Use o envio via API." : ""}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no WhatsApp Web
                </Button>
              </div>
            </div>
          )}

          {/* Email */}
          {tab === "email" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Destinatário
                </label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={emailDest}
                  onChange={(e) => setEmailDest(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Assunto
                </label>
                <Input
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Mensagem
                </label>
                <textarea
                  rows={4}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <Button
                className="w-full gap-2 font-bold mt-2"
                onClick={() => emailM.mutate()}
                disabled={emailM.isPending || !emailDest}
              >
                <Send className="h-4 w-4" />
                {emailM.isPending ? "Enviando..." : "Enviar por Email"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
