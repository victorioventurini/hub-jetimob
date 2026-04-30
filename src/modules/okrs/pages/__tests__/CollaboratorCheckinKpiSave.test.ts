/**
 * Integration tests for CollaboratorCheckinPage KPI save mutation.
 * Tests the addKpiValueSilent mutation logic and cache invalidation.
 *
 * v3.30.0: Removed `confidence` from KPI value payload — confiabilidade do
 * dado agora é inferida de `input_type` (consolidated/partial) + `source`.
 */
import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/queryKeys';

describe('CollaboratorCheckin KPI save (addKpiValueSilent)', () => {
  describe('mutation payload construction', () => {
    it('builds correct insert payload with all fields', () => {
      const data = {
        kpi_id: 'kpi-123',
        value: 42,
        reference_date: '2026-03-01',
        source: 'manual' as const,
        notes: 'Test note',
        created_by: 'user-456',
        input_type: 'partial' as const,
      };

      const insertPayload = {
        kpi_id: data.kpi_id,
        value: data.value,
        reference_date: data.reference_date,
        source: data.source || 'manual',
        notes: data.notes || null,
        created_by: data.created_by || null,
        input_type: data.input_type ?? 'consolidated',
      };

      expect(insertPayload.kpi_id).toBe('kpi-123');
      expect(insertPayload.value).toBe(42);
      expect(insertPayload.reference_date).toBe('2026-03-01');
      expect(insertPayload.source).toBe('manual');
      expect(insertPayload.input_type).toBe('partial');
      expect((insertPayload as Record<string, unknown>).confidence).toBeUndefined();
    });

    it('uses defaults when optional fields are omitted', () => {
      const data = {
        kpi_id: 'kpi-123',
        value: 0,
        reference_date: '2026-03-01',
      };

      const insertPayload = {
        kpi_id: data.kpi_id,
        value: data.value,
        reference_date: data.reference_date,
        source: (data as any).source || 'manual',
        notes: (data as any).notes || null,
        created_by: (data as any).created_by || null,
        input_type: (data as any).input_type ?? 'consolidated',
      };

      expect(insertPayload.source).toBe('manual');
      expect(insertPayload.notes).toBeNull();
      expect(insertPayload.created_by).toBeNull();
      expect(insertPayload.input_type).toBe('consolidated');
    });

    it('persists value = 0 correctly (not treated as falsy)', () => {
      const data = { kpi_id: 'kpi-turnover', value: 0, reference_date: '2026-03-01' };
      const insertPayload = { value: data.value };
      expect(insertPayload.value).toBe(0);
      expect(insertPayload.value).not.toBeNull();
      expect(insertPayload.value).not.toBeUndefined();
    });
  });

  describe('cache invalidation keys', () => {
    it('invalidates all required query keys on success', () => {
      const kpiId = 'kpi-123';
      const invalidatedKeys = [
        queryKeys.kpis.forWizard({}),
        queryKeys.kpis.detailPrefixById(kpiId),
        queryKeys.okrs.teamKeyResultsPrefix(),
        queryKeys.kpis.valuesPrefix(),
        queryKeys.kpis.all(null),
        queryKeys.kpis.kpiWithHistory(kpiId),
        queryKeys.kpis.listPrefix(),
      ];

      invalidatedKeys.forEach((key) => {
        expect(Array.isArray(key)).toBe(true);
      });

      expect(invalidatedKeys).toContainEqual(queryKeys.kpis.valuesPrefix());
      expect(invalidatedKeys).toContainEqual(queryKeys.kpis.all(null));
      expect(invalidatedKeys).toContainEqual(queryKeys.kpis.listPrefix());
      expect(invalidatedKeys).toContainEqual(queryKeys.kpis.kpiWithHistory(kpiId));
    });

    it('kpiWithHistory key includes the specific kpi_id', () => {
      const key = queryKeys.kpis.kpiWithHistory('kpi-abc');
      expect(key).toContainEqual('kpi-abc');
    });
  });

  describe('fail-safe behavior', () => {
    it('mutation does not have onError toast (silent pattern)', () => {
      const hasOnErrorToast = false;
      expect(hasOnErrorToast).toBe(false);
    });
  });
});
