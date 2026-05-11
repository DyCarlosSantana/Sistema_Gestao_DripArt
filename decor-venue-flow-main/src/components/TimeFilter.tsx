import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type TimeFilterOption = "hoje" | "ontem" | "7dias" | "30dias" | "este_mes" | "mes_passado" | "personalizado";

interface TimeFilterProps {
  onFilterChange: (dataIni: string, dataFim: string) => void;
  defaultOption?: TimeFilterOption;
}

export function TimeFilter({ onFilterChange, defaultOption = "este_mes" }: TimeFilterProps) {
  const [option, setOption] = useState<TimeFilterOption>(defaultOption);
  const [customIni, setCustomIni] = useState("");
  const [customFim, setCustomFim] = useState("");

  useEffect(() => {
    const today = new Date();
    let ini = "";
    let fim = "";

    switch (option) {
      case "hoje":
        ini = format(startOfDay(today), "yyyy-MM-dd");
        fim = format(endOfDay(today), "yyyy-MM-dd");
        break;
      case "ontem":
        const ontem = subDays(today, 1);
        ini = format(startOfDay(ontem), "yyyy-MM-dd");
        fim = format(endOfDay(ontem), "yyyy-MM-dd");
        break;
      case "7dias":
        ini = format(subDays(today, 6), "yyyy-MM-dd");
        fim = format(today, "yyyy-MM-dd");
        break;
      case "30dias":
        ini = format(subDays(today, 29), "yyyy-MM-dd");
        fim = format(today, "yyyy-MM-dd");
        break;
      case "este_mes":
        ini = format(startOfMonth(today), "yyyy-MM-dd");
        fim = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      case "mes_passado":
        const mesPassado = subMonths(today, 1);
        ini = format(startOfMonth(mesPassado), "yyyy-MM-dd");
        fim = format(endOfMonth(mesPassado), "yyyy-MM-dd");
        break;
      case "personalizado":
        ini = customIni;
        fim = customFim;
        break;
    }

    if (option !== "personalizado") {
      setCustomIni(ini);
      setCustomFim(fim);
      onFilterChange(ini, fim);
    } else if (customIni && customFim) {
      onFilterChange(customIni, customFim);
    }
  }, [option, customIni, customFim, onFilterChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-end">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Período</label>
        <Select value={option} onValueChange={(v: TimeFilterOption) => setOption(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="ontem">Ontem</SelectItem>
            <SelectItem value="7dias">Últimos 7 dias</SelectItem>
            <SelectItem value="30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="este_mes">Este Mês</SelectItem>
            <SelectItem value="mes_passado">Mês Passado</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {option === "personalizado" && (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Data Início</label>
            <Input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Data Fim</label>
            <Input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
}
