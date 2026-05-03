/**
 * @file actionModeForKpi.test.ts
 * @description Testes da regra canônica que decide a obrigatoriedade do
 * "Plano de ação do líder" no KPI Gate (SSOT mem://features/kpis/kpis-master-standard §4).
 */

import { describe, it, expect } from 'vitest';
import { actionModeForKpi } from '../KpiGateStep';
import type { KpiGateBucketId, KpiGateItem } from '../../config/stepContentAdapters';

const baseKpi = (overrides: Partial<KpiGateItem> = {}): KpiGateItem => ({
  id: 'k1',
  name: 'KPI Test',
  status: 'green',
  currentValue: 10,
  target: 15,
  unit: '',
  scope: 'team',
  requiresDecision: false,
  resolved: false,
  ...overrides,
}) as KpiGateItem;

describe('actionModeForKpi (regra canônica do Plano de Ação do Líder)', () => {
  describe('buckets MANDATORY', () => {
    it('overdue → explain-no-data (obrigatório)', () => {
      expect(actionModeForKpi('overdue', baseKpi())).toBe('explain-no-data');
    });
    it('critical → justify-required', () => {
      expect(actionModeForKpi('critical', baseKpi())).toBe('justify-required');
    });
    it('guardrailViolated → justify-required', () => {
      expect(actionModeForKpi('guardrailViolated', baseKpi())).toBe('justify-required');
    });
  });

  describe('teamContext', () => {
    it('status unknown (sem dados) → explain-no-data (obrigatório)', () => {
      expect(actionModeForKpi('teamContext', baseKpi({ status: 'unknown' }))).toBe('explain-no-data');
    });
    it('sem meta (target=null) → justify-required (obrigatório)', () => {
      expect(actionModeForKpi('teamContext', baseKpi({ target: null }))).toBe('justify-required');
    });
    it('status red → justify-required', () => {
      expect(actionModeForKpi('teamContext', baseKpi({ status: 'red' }))).toBe('justify-required');
    });
    it('status amber + com meta → justify-optional', () => {
      expect(actionModeForKpi('teamContext', baseKpi({ status: 'amber' }))).toBe('justify-optional');
    });
    it('status green + com meta + com dados → view (sem textarea)', () => {
      expect(actionModeForKpi('teamContext', baseKpi({ status: 'green' }))).toBe('view');
    });
  });

  describe('healthy', () => {
    it('com meta → view (sem textarea)', () => {
      expect(actionModeForKpi('healthy', baseKpi())).toBe('view');
    });
    it('sem meta → justify-required (obrigatório)', () => {
      expect(actionModeForKpi('healthy', baseKpi({ target: null }))).toBe('justify-required');
    });
  });

  describe('attention', () => {
    it('com meta → justify-optional', () => {
      expect(actionModeForKpi('attention', baseKpi())).toBe('justify-optional');
    });
    it('sem meta → justify-required (obrigatório)', () => {
      expect(actionModeForKpi('attention', baseKpi({ target: null }))).toBe('justify-required');
    });
  });
});
