// KR Unit Categories and Options

export interface KrUnitOption {
  value: string;
  label: string;
  category: string;
}

export interface KrUnitCategory {
  label: string;
  options: KrUnitOption[];
}

export const KR_UNIT_CATEGORIES: KrUnitCategory[] = [
  {
    label: 'Financeiro',
    options: [
      { value: 'R$', label: 'R$', category: 'Financeiro' },
      { value: 'R$ mil', label: 'R$ mil', category: 'Financeiro' },
      { value: 'R$ milhão', label: 'R$ milhão', category: 'Financeiro' },
    ],
  },
  {
    label: 'Volume / Quantidade',
    options: [
      { value: 'Número', label: 'Número', category: 'Volume / Quantidade' },
      { value: 'Clientes', label: 'Clientes', category: 'Volume / Quantidade' },
      { value: 'Contas', label: 'Contas', category: 'Volume / Quantidade' },
      { value: 'Usuários', label: 'Usuários', category: 'Volume / Quantidade' },
      { value: 'Leads', label: 'Leads', category: 'Volume / Quantidade' },
      { value: 'Tickets', label: 'Tickets', category: 'Volume / Quantidade' },
      { value: 'Features', label: 'Features', category: 'Volume / Quantidade' },
      { value: 'Projetos', label: 'Projetos', category: 'Volume / Quantidade' },
    ],
  },
  {
    label: 'Experiência / Qualidade',
    options: [
      { value: 'Pontos', label: 'Pontos (NPS, eNPS)', category: 'Experiência / Qualidade' },
      { value: 'Score', label: 'Score', category: 'Experiência / Qualidade' },
      { value: 'Índice', label: 'Índice', category: 'Experiência / Qualidade' },
    ],
  },
  {
    label: 'Tempo',
    options: [
      { value: 'Dias', label: 'Dias', category: 'Tempo' },
      { value: 'Horas', label: 'Horas', category: 'Tempo' },
      { value: 'Minutos', label: 'Minutos', category: 'Tempo' },
    ],
  },
  {
    label: 'Taxas e Proporções',
    options: [
      { value: '%', label: '%', category: 'Taxas e Proporções' },
      { value: 'p.p.', label: 'p.p. (pontos percentuais)', category: 'Taxas e Proporções' },
    ],
  },
  {
    label: 'Customizada',
    options: [
      { value: 'custom', label: 'Unidade personalizada', category: 'Customizada' },
    ],
  },
];

export const ALL_UNITS = KR_UNIT_CATEGORIES.flatMap((cat) => cat.options);

export function getUnitLabel(value: string): string {
  const unit = ALL_UNITS.find((u) => u.value === value);
  return unit?.label || value;
}

export function formatValueWithUnit(
  value: number,
  unit: string,
  showPrefix = true
): string {
  const numStr = value.toLocaleString('pt-BR');
  
  // Units that come before the number
  const prefixUnits = ['R$', 'R$ mil', 'R$ milhão'];
  
  if (prefixUnits.includes(unit) && showPrefix) {
    return `${unit} ${numStr}`;
  }
  
  return `${numStr} ${unit}`;
}
