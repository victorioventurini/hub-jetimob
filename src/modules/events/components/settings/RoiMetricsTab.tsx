/**
 * RoiMetricsTab — Métricas para cálculo de ROI + parâmetros de Fit
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { DollarSign, SlidersHorizontal } from "lucide-react";

const COMPANY_TYPES = [
  "Imobiliária de vendas",
  "Imobiliária de aluguéis",
  "Imobiliária de vendas e aluguéis",
  "Corretor autônomo",
  "Incorporadora / loteadora",
  "Agência de marketing",
  "Empresa de tecnologia",
  "Outros",
];

const JOB_TITLES = [
  "Analista de marketing",
  "Gerente de marketing",
  "Assessor de locações",
  "Gerente de locações",
  "Corretor de imóveis",
  "Gerente de vendas",
  "Diretor geral / Proprietário / CEO",
  "Outros",
];

export function RoiMetricsTab() {
  const [ltv, setLtv] = useState("150000");
  const [conversionRate, setConversionRate] = useState("18");
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<string[]>(["Imobiliária de aluguéis", "Imobiliária de vendas e aluguéis"]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>(["Assessor de locações", "Gerente de locações", "Diretor geral / Proprietário / CEO"]);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  return (
    <div className="space-y-6">
      {/* LTV */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Métricas Financeiras
            <HelpTooltip content="Valores usados como base para cálculo de ROI projetado nos dashboards de eventos." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Label className="text-xs">
              LTV Médio por Cliente
              <HelpTooltip content="Lifetime Value médio estimado de um cliente convertido. Usado como multiplicador no cálculo de ROI projetado do pipeline de oportunidades." size="sm" />
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                value={ltv}
                onChange={(e) => setLtv(e.target.value.replace(/\D/g, ""))}
                className="pl-10 text-sm font-mono"
                placeholder="150000"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Valor atual: {Number(ltv || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="max-w-sm space-y-2 mt-4">
            <Label className="text-xs">
              Taxa de Conversão Estimada
              <HelpTooltip content="Percentual estimado de conversão de leads qualificados em clientes. Usado como fator no cálculo de ROI projetado." size="sm" />
            </Label>
            <div className="relative">
              <Input
                value={conversionRate}
                onChange={(e) => setConversionRate(e.target.value.replace(/[^\d]/g, ""))}
                className="pr-8 text-sm font-mono"
                placeholder="18"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Valor atual: {conversionRate || 0}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fit Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Parâmetros de Fit
            <HelpTooltip content="Defina os critérios que compõem o score de Fit do lead. Leads que atendem mais critérios recebem score mais alto, priorizando oportunidades com maior potencial de conversão." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Grupo: Negócio */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Negócio</h4>
            <div className="space-y-3">
              <Label className="text-xs font-medium">
                Tipos de empresa com peso positivo
                <HelpTooltip content="Tipos de empresa que indicam maior aderência ao perfil ideal de cliente (ICP)." size="sm" />
              </Label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_TYPES.map((ct) => (
                  <label key={ct} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={selectedCompanyTypes.includes(ct)}
                      onCheckedChange={() => toggleItem(selectedCompanyTypes, ct, setSelectedCompanyTypes)}
                    />
                    <span className="text-sm">{ct}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {selectedCompanyTypes.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Grupo: Prospect */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prospect</h4>
            <div className="space-y-3">
              <Label className="text-xs font-medium">
                Cargos com peso positivo
                <HelpTooltip content="Cargos que aumentam o score de Fit quando presentes no perfil do participante." size="sm" />
              </Label>
              <div className="flex flex-wrap gap-2">
                {JOB_TITLES.map((title) => (
                  <label key={title} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={selectedTitles.includes(title)}
                      onCheckedChange={() => toggleItem(selectedTitles, title, setSelectedTitles)}
                    />
                    <span className="text-sm">{title}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {selectedTitles.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
