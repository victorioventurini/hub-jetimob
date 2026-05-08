/**
 * All Hands — Tipos do draft
 *
 * Rito mensal de comunicação da BU. Reaproveita os snapshots do MBR
 * (panorama, KPI gate, OKRs Org). NÃO duplica dados — referencia o
 * MBR de origem por `sourceMbrSessionId` e armazena apenas o
 * mês de referência + cursor de step.
 */

export type AllHandsStep = 'summary' | 'kpi-gate' | 'org-okrs' | 'evaluation';

export interface AllHandsDraftData {
  /** Mês de referência (formato YYYY-MM-01). Default: mês fechado anterior. */
  referenceMonth: string;
  /** Sessão MBR (status='completed') que abastece o conteúdo dos steps 1-3. */
  sourceMbrSessionId: string | null;
  /**
   * Resumo executivo regenerado especificamente para o All Hands.
   * Quando preenchido, sobrepõe `panoramaCuration.summary` do MBR de origem.
   */
  overrideExecutiveSummary?: string | null;
}
