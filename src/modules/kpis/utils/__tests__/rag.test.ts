import { describe, it, expect } from 'vitest';
import { calculateKpiRag } from '../rag';

describe('calculateKpiRag — espelha kpi_calculate_rag SQL', () => {
  describe('no_data (sem base para avaliar)', () => {
    it('retorna no_data quando value é null', () => {
      expect(calculateKpiRag(null, 100, 'up')).toBe('no_data');
    });
    it('retorna no_data quando value é undefined', () => {
      expect(calculateKpiRag(undefined, 100, 'up')).toBe('no_data');
    });
    it('retorna no_data quando target é null', () => {
      expect(calculateKpiRag(50, null, 'up')).toBe('no_data');
    });
    it('retorna no_data quando value = 0', () => {
      expect(calculateKpiRag(0, 100, 'up')).toBe('no_data');
    });
    it('retorna no_data quando target = 0', () => {
      expect(calculateKpiRag(50, 0, 'up')).toBe('no_data');
    });
  });

  describe('direction = up (maior é melhor)', () => {
    it('value acima da meta → on_track (caso EBITDA do usuário)', () => {
      // target=20, value=25 → 125% → on_track. NÃO deve exigir notes.
      expect(calculateKpiRag(25, 20, 'up')).toBe('on_track');
    });
    it('value = meta → on_track (100%)', () => {
      expect(calculateKpiRag(20, 20, 'up')).toBe('on_track');
    });
    it('value = 95% da meta → on_track (≥90)', () => {
      expect(calculateKpiRag(95, 100, 'up')).toBe('on_track');
    });
    it('value = 80% da meta → at_risk (≥70)', () => {
      expect(calculateKpiRag(80, 100, 'up')).toBe('at_risk');
    });
    it('value = 50% da meta → off_track (<70)', () => {
      expect(calculateKpiRag(50, 100, 'up')).toBe('off_track');
    });
  });

  describe('direction = down (menor é melhor)', () => {
    it('value abaixo da meta → on_track (melhor que esperado)', () => {
      // target=10, value=8 → 10/8*100 = 125% → on_track. NÃO deve exigir notes.
      expect(calculateKpiRag(8, 10, 'down')).toBe('on_track');
    });
    it('value = meta → on_track (100%)', () => {
      expect(calculateKpiRag(10, 10, 'down')).toBe('on_track');
    });
    it('value 10% acima da meta → at_risk (~91% > on_track? não, 10/11=90.9 → on_track)', () => {
      // target=10, value=11 → 10/11*100 ≈ 90.9 → on_track
      expect(calculateKpiRag(11, 10, 'down')).toBe('on_track');
    });
    it('value 20% acima da meta → at_risk', () => {
      // target=10, value=12 → 10/12*100 ≈ 83.3 → at_risk
      expect(calculateKpiRag(12, 10, 'down')).toBe('at_risk');
    });
    it('value muito acima da meta → off_track', () => {
      // target=10, value=20 → 10/20*100 = 50 → off_track
      expect(calculateKpiRag(20, 10, 'down')).toBe('off_track');
    });
  });
});
