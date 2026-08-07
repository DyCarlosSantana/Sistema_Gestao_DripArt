import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast as showToast } from "@/components/ui/sonner";
import { Building2, QrCode, Clock, Save, Image as ImageIcon, MapPin, Search } from "lucide-react";

export default function EmpresaTab() {
  const qc = useQueryClient();

  const { data: empresaData, isLoading: isLoadingEmpresa } = useQuery({ queryKey: ["configEmpresa"], queryFn: api.configEmpresa });
  const { data: horariosData, isLoading: isLoadingHorarios } = useQuery({ queryKey: ["configHorarios"], queryFn: api.configHorarios });

  const [local, setLocal] = useState({
    logo_url: "",
    razao_social: "", inscricao_estadual: "", validade_orcamento: 7, segmento: "Locação de Móveis e Equipamentos",
    whatsapp: "", instagram: "", site: "", tiktok: "",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "PA — Pará",
    chaves_pix: "", pix_tipo: "aleatoria", pix_identificador: "", pix_instituicao: ""
  });

  const [horarios, setHorarios] = useState<any[]>([]);

  useEffect(() => {
    if (empresaData) {
      setLocal({
        logo_url: empresaData.logo_url || "",
        razao_social: empresaData.razao_social || "",
        inscricao_estadual: empresaData.inscricao_estadual || "",
        validade_orcamento: empresaData.validade_orcamento || 7,
        segmento: empresaData.segmento || "Locação de Móveis e Equipamentos",
        whatsapp: empresaData.whatsapp || "",
        instagram: empresaData.instagram || "",
        site: empresaData.site || "",
        tiktok: empresaData.tiktok || "",
        cep: empresaData.cep || "",
        logradouro: empresaData.logradouro || "",
        numero: empresaData.numero || "",
        complemento: empresaData.complemento || "",
        bairro: empresaData.bairro || "",
        cidade: empresaData.cidade || "",
        estado: empresaData.estado || "PA — Pará",
        chaves_pix: empresaData.chaves_pix || "",
        pix_tipo: empresaData.pix_tipo || "aleatoria",
        pix_identificador: empresaData.pix_identificador || "",
        pix_instituicao: empresaData.pix_instituicao || ""
      });
    }
  }, [empresaData]);

  useEffect(() => {
    if (horariosData) {
      setHorarios(horariosData);
    }
  }, [horariosData]);

  const saveEmpresaM = useMutation({
    mutationFn: (data: any) => api.atualizarConfigEmpresa(data),
    onSuccess: () => { showToast.success("Dados da empresa salvos!"); qc.invalidateQueries({ queryKey: ["configEmpresa"] }); },
    onError: () => showToast.error("Erro ao salvar dados"),
  });

  const saveHorariosM = useMutation({
    mutationFn: (data: any[]) => api.atualizarConfigHorarios({ horarios: data }),
    onSuccess: () => { showToast.success("Horários salvos!"); qc.invalidateQueries({ queryKey: ["configHorarios"] }); },
    onError: () => showToast.error("Erro ao salvar horários"),
  });

  const h = (e: any) => { const { name, value } = e.target; setLocal((p) => ({ ...p, [name]: value })); };

  const handleHorarioChange = (index: number, field: string, value: any) => {
    const newH = [...horarios];
    newH[index] = { ...newH[index], [field]: value };
    setHorarios(newH);
  };

  const handleSaveAll = () => {
    saveEmpresaM.mutate(local);
    saveHorariosM.mutate(horarios);
  };

  if (isLoadingEmpresa || isLoadingHorarios) return <div className="p-4 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      
      {/* ── EMPRESA ── */}
      <div className="card">
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="card-icon" style={{ background: "hsla(var(--primary), 0.12)", color: "hsl(var(--primary))" }}>
              <Building2 className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="card-title">Informações da Empresa</div>
              <div className="card-subtitle">Dados usados em orçamentos, contratos, PDFs e notas fiscais.</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          
          <div className="section-label">Identidade Visual</div>
          <div className="logo-upload">
            <div className="logo-preview">
              {local.logo_url ? <img src={local.logo_url} alt="Logo" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="logo-actions">
              <div className="logo-name">Logomarca da empresa</div>
              <div className="logo-hint">PNG, JPG ou SVG até 2MB. Ideal: 400×200px ou maior, fundo transparente.</div>
              <div className="logo-btns">
                <label className="btn btn-ghost btn-sm cursor-pointer">
                  <ImageIcon className="h-4 w-4" /> Escolher arquivo
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const tid = showToast.loading("Enviando logo...");
                      api.uploadLogo(e.target.files[0])
                        .then((res) => { 
                          setLocal(p => ({ ...p, logo_url: res.logo || res.url || res.caminho || '' }));
                          showToast.success("Logo atualizada!", { id: tid }); 
                        })
                        .catch(() => showToast.error("Erro ao enviar logo", { id: tid }));
                    }
                  }} />
                </label>
                {local.logo_url && (
                  <button className="btn btn-danger btn-sm" onClick={() => setLocal(p => ({...p, logo_url: ""}))}>Remover</button>
                )}
              </div>
            </div>
          </div>

          <div className="section-label mt-6">Dados Cadastrais</div>
          <div className="form-grid col-2">
            <div className="form-group">
              <label className="form-label">Razão Social / Nome Fantasia</label>
              <input className="form-input" type="text" name="razao_social" value={local.razao_social} onChange={h} placeholder="Razão Social Ltda." />
            </div>
            <div className="form-group">
              <label className="form-label">Inscrição Estadual</label>
              <input className="form-input" type="text" name="inscricao_estadual" value={local.inscricao_estadual} onChange={h} placeholder="Opcional" />
            </div>
            <div className="form-group">
              <label className="form-label">Validade do Orçamento (dias)</label>
              <input className="form-input" type="number" name="validade_orcamento" value={local.validade_orcamento} onChange={h} />
              <span className="form-hint">Prazo padrão para orçamentos enviados a clientes.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Segmento / Setor</label>
              <select className="form-select" name="segmento" value={local.segmento} onChange={h}>
                <option>Locação de Móveis e Equipamentos</option>
                <option>Comércio Varejista</option>
                <option>Serviços Gerais</option>
              </select>
            </div>
          </div>

          <div className="section-label mt-6">Contato & Redes Sociais</div>
          <div className="form-grid col-2">
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <div className="input-wrap">
                <span className="input-prefix" style={{ color: "#25D366", fontSize: "16px" }}>●</span>
                <input className="form-input with-prefix" type="tel" name="whatsapp" value={local.whatsapp} onChange={h} />
              </div>
              <span className="form-hint ok">✓ Usado em comprovantes e mensagens automáticas.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <div className="input-wrap">
                <span className="input-prefix">@</span>
                <input className="form-input with-prefix" type="text" name="instagram" value={local.instagram} onChange={h} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Site</label>
              <div className="input-wrap">
                <span className="input-prefix"><Search className="h-4 w-4" /></span>
                <input className="form-input with-prefix" type="url" name="site" value={local.site} onChange={h} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">TikTok</label>
              <div className="input-wrap">
                <span className="input-prefix">@</span>
                <input className="form-input with-prefix" type="text" name="tiktok" value={local.tiktok} onChange={h} placeholder="usuário opcional" />
              </div>
            </div>
          </div>

          <div className="section-label mt-6">Endereço</div>
          <div className="form-grid col-3">
            <div className="form-group">
              <label className="form-label">CEP</label>
              <input className="form-input" type="text" name="cep" value={local.cep} onChange={h} />
            </div>
            <div className="form-group span-2">
              <label className="form-label">Logradouro</label>
              <input className="form-input" type="text" name="logradouro" value={local.logradouro} onChange={h} />
            </div>
            <div className="form-group">
              <label className="form-label">Número</label>
              <input className="form-input" type="text" name="numero" value={local.numero} onChange={h} placeholder="S/N" />
            </div>
            <div className="form-group">
              <label className="form-label">Complemento</label>
              <input className="form-input" type="text" name="complemento" value={local.complemento} onChange={h} placeholder="Sala, loja…" />
            </div>
            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input className="form-input" type="text" name="bairro" value={local.bairro} onChange={h} placeholder="Bairro" />
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input className="form-input" type="text" name="cidade" value={local.cidade} onChange={h} placeholder="Cidade" />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" name="estado" value={local.estado} onChange={h}>
                <option>PA — Pará</option>
                <option>AM — Amazonas</option>
                <option>SP — São Paulo</option>
                <option>RJ — Rio de Janeiro</option>
              </select>
            </div>
          </div>

        </div>
        <div className="card-foot">
          <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>Alterações afetam todos os documentos emitidos</span>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saveEmpresaM.isPending}>
            <Save className="h-4 w-4" /> {saveEmpresaM.isPending ? "Salvando..." : "Salvar Empresa"}
          </button>
        </div>
      </div>

      {/* ── PIX ── */}
      <div className="card">
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="card-icon" style={{ background: "hsla(var(--success), 0.12)", color: "hsl(var(--success))" }}>
              <QrCode className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="card-title">Chaves PIX</div>
              <div className="card-subtitle">Usadas em PDFs de orçamento e comprovantes de venda.</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {local.chaves_pix && (
            <div className="pix-item mb-4">
              <span className="pix-type uppercase">{local.pix_tipo}</span>
              <span className="pix-key">{local.chaves_pix}</span>
              <span className="pix-default">Principal</span>
            </div>
          )}
          <div className="form-grid col-2">
            <div className="form-group">
              <label className="form-label">Tipo de Chave</label>
              <select className="form-select" name="pix_tipo" value={local.pix_tipo} onChange={h}>
                <option value="cpf_cnpj">CPF/CNPJ</option>
                <option value="telefone">Telefone</option>
                <option value="email">E-mail</option>
                <option value="aleatoria">Chave Aleatória</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Chave PIX Principal</label>
              <input className="form-input" name="chaves_pix" value={local.chaves_pix} onChange={h} placeholder="Insira a chave..." />
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Titular (Beneficiário)</label>
              <input className="form-input" name="pix_identificador" value={local.pix_identificador} onChange={h} placeholder="Nome completo ou Razão Social" />
            </div>
            <div className="form-group">
              <label className="form-label">Instituição Financeira (Banco)</label>
              <input className="form-input" name="pix_instituicao" value={local.pix_instituicao} onChange={h} placeholder="Ex: Nubank, Itaú..." />
            </div>
          </div>
          <span className="form-hint mt-2 block">Esta chave será incluída automaticamente nos PDFs de orçamento e faturamento.</span>
        </div>
        <div className="card-foot">
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saveEmpresaM.isPending}>
            <Save className="h-4 w-4" /> Salvar PIX
          </button>
        </div>
      </div>

      {/* ── HORÁRIOS ── */}
      <div className="card">
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="card-icon" style={{ background: "hsla(var(--warning), 0.12)", color: "hsl(var(--warning))" }}>
              <Clock className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="card-title">Horário de Funcionamento</div>
              <div className="card-subtitle">Usado como referência na agenda, relatórios e notificações automáticas.</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="hours-grid">
            <div className="hours-head">Dia</div><div className="hours-head">Abertura</div><div className="hours-head">Fechamento</div><div className="hours-head">Status</div>
            {horarios.map((h, i) => (
              <div className="hours-row" key={i}>
                <div>
                  <span className={`hours-day ${["Sábado", "Domingo"].includes(h.dia_semana) ? "weekend" : ""}`}>
                    {h.dia_semana}
                  </span>
                </div>
                <div>
                  <input className="form-input" type="time" value={h.abertura || "00:00"} disabled={!h.ativo} style={{ width: "120px", padding: "6px 10px", fontSize: "13px" }} onChange={(e) => handleHorarioChange(i, "abertura", e.target.value)} />
                </div>
                <div>
                  <input className="form-input" type="time" value={h.fechamento || "00:00"} disabled={!h.ativo} style={{ width: "120px", padding: "6px 10px", fontSize: "13px" }} onChange={(e) => handleHorarioChange(i, "fechamento", e.target.value)} />
                </div>
                <div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!h.ativo} onChange={(e) => handleHorarioChange(i, "ativo", e.target.checked ? 1 : 0)} />
                    <div className="toggle-track"></div><div className="toggle-thumb"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-foot">
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saveHorariosM.isPending}>
            <Save className="h-4 w-4" /> {saveHorariosM.isPending ? "Salvando..." : "Salvar horários"}
          </button>
        </div>
      </div>

    </div>
  );
}
