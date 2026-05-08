/**
 * AllHandsPage — constantes e helpers puros.
 */
import type { AllHandsStep, AllHandsDraftData } from '@/modules/okrs/types/wizard';
import { defaultReferenceMonth } from '@/modules/okrs/utils/mbr/referenceMonth';

export const WIZARD_STEPS = [
  { id: 'summary' as const, label: 'Sumário do MBR', description: 'Panorama, decisões e destaques do mês' },
  { id: 'kpi-gate' as const, label: 'KPI Gate', description: 'KPIs em alerta' },
  { id: 'org-okrs' as const, label: 'OKRs Org', description: 'Cobertura e progresso' },
  { id: 'evaluation' as const, label: 'Avaliação do Rito', description: 'Coleta anônima' },
];

export const STEP_ORDER: AllHandsStep[] = ['summary', 'kpi-gate', 'org-okrs', 'evaluation'];

export const DEFAULT_DATA: AllHandsDraftData = {
  referenceMonth: defaultReferenceMonth(),
  sourceMbrSessionId: null,
};
