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
import { DollarSign, SlidersHorizontal, Layers } from "lucide-react";

const BRAND_FRONTS: { category: string; subcategories: string[] }[] = [
  {
    category: "Geração de Leads",
    subcategories: [
      "Portais imobiliários",
      "Agências de marketing e performance",
      "Sites",
      "Plataformas de Ads",
    ],
  },
  {
    category: "Estoque de Imóveis",
    subcategories: [
      "Incorporadoras",
      "Loteadoras",
      "Hubs de estoque de imóveis e empreendimentos (Órulo, DWV, Bloco)",
    ],
  },
  {
    category: "Relacionamento e IA",
    subcategories: [
      "CRMs",
      "IAs de atendimento",
      "Chatbots",
    ],
  },
  {
    category: "Viabilização de Negócios",
    subcategories: [
      "Bancos",
      "Fintechs de crédito",
      "Garantidoras",
      "Seguradoras",
    ],
  },
  {
    category: "Formalização e Entrega",
    subcategories: [
      "Vistorias",
      "Soluções de geração de contratos",
      "Assinaturas digitais",
      "Soluções de pós-venda",
    ],
  },
  {
    category: "Gestão Financeira",
    subcategories: [
      "ERPs de Locação",
      "Fintechs de antecipação",
      "Gestão de fluxo de caixa",
    ],
  },
  {
    category: "Educação e Desenvolvimento Profissional",
    subcategories: [
      "Escolas de negócios",
      "Consultorias",
      "Entidades de classe",
    ],
  },
];

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

const BRAND_PAINS = [
  "Receber muitos contatos, mas a maioria sem perfil de compra.",
  "Ter o cliente pronto, mas não encontrar o imóvel atualizado para ele.",
  "Perder vendas pela demora no primeiro atendimento ao lead.",
  "Negócios que caem no final por reprovação de crédito ou garantia.",
  "Lentidão e burocracia para assinar contratos e fazer vistorias.",
  "Sentimento de estar desatualizado perante as novas tecnologias.",
];

export function RoiMetricsTab() {
  const [ltv, setLtv] = useState("150000");
  const [conversionRate, setConversionRate] = useState("18");
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<string[]>(["Imobiliária de aluguéis", "Imobiliária de vendas e aluguéis"]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>(["Assessor de locações", "Gerente de locações", "Diretor geral / Proprietário / CEO"]);
  const [selectedBrandSubs, setSelectedBrandSubs] = useState<string[]>(
    BRAND_FRONTS.flatMap((f) => f.subcategories)
  );
  const [selectedPains, setSelectedPains] = useState<string[]>([
    "Negócios que caem no final por reprovação de crédito ou garantia.",
    "Lentidão e burocracia para assinar contratos e fazer vistorias.",
  ]);

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

      {/* Frentes Estratégicas de Brand */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Frente Estratégica de Brand
            <HelpTooltip content="Categorias e subcategorias que representam as frentes estratégicas do patrocinador para segmentação de marca nos eventos." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {BRAND_FRONTS.map((front, idx) => (
            <div key={front.category}>
              {idx > 0 && <Separator className="mb-6" />}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {front.category}
                </h4>
                <div className="space-y-2 pl-1">
                  {front.subcategories.map((sub) => (
                    <label key={sub} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={selectedBrandSubs.includes(sub)}
                        onCheckedChange={() => toggleItem(selectedBrandSubs, sub, setSelectedBrandSubs)}
                      />
                      <span className="text-sm">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dores que a marca resolve */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Dores que a sua marca resolve
            <HelpTooltip content="Dores de mercado que o patrocinador endereça diretamente com seus produtos e serviços. Usadas para segmentação e associação marca-dor nos dashboards." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 pl-1">
            {BRAND_PAINS.map((pain) => (
              <label key={pain} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={selectedPains.includes(pain)}
                  onCheckedChange={() => toggleItem(selectedPains, pain, setSelectedPains)}
                />
                <span className="text-sm">{pain}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
