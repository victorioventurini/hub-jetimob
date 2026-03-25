import { describe, it, expect } from 'vitest';
import { calculateProgress, calculateAggregatedProgress, calculateProgressFromNullable } from './progressCalculation';

describe('calculateProgress', () => {
  describe('Crescimento (direction=up)', () => {
    it('deve calcular corretamente com baseline - Exemplo 1', () => {
      // Baseline: 150, Meta: 300, Resultado: 250
      // Progresso = (250 - 150) / (300 - 150) = 100/150 = 66.67%
      expect(calculateProgress(150, 250, 300, 'up')).toBeCloseTo(66.67, 1);
    });

    it('deve retornar 0% quando resultado igual ao baseline', () => {
      expect(calculateProgress(150, 150, 300, 'up')).toBe(0);
    });

    it('deve retornar 100% quando atingiu a meta', () => {
      expect(calculateProgress(150, 300, 300, 'up')).toBe(100);
    });

    it('deve permitir valores acima de 100% quando ultrapassou a meta', () => {
      // (350 - 150) / (300 - 150) = 200/150 = 133.33%
      expect(calculateProgress(150, 350, 300, 'up')).toBeCloseTo(133.33, 1);
    });

    it('não deve retornar valores negativos', () => {
      expect(calculateProgress(150, 100, 300, 'up')).toBe(0);
    });
  });

  describe('Redução (direction=down)', () => {
    it('deve calcular corretamente - Exemplo 2', () => {
      // Baseline: 50, Meta: 15, Resultado: 25
      // Progresso = (50 - 25) / (50 - 15) = 25/35 = 71.43%
      expect(calculateProgress(50, 25, 15, 'down')).toBeCloseTo(71.43, 1);
    });

    it('deve retornar 0% quando resultado igual ao baseline', () => {
      expect(calculateProgress(50, 50, 15, 'down')).toBe(0);
    });

    it('deve retornar 100% quando atingiu a meta de redução', () => {
      expect(calculateProgress(50, 15, 15, 'down')).toBe(100);
    });

    it('deve permitir valores acima de 100% quando reduziu além da meta', () => {
      // (50 - 10) / (50 - 15) = 40/35 = 114.29%
      expect(calculateProgress(50, 10, 15, 'down')).toBeCloseTo(114.29, 1);
    });

    it('não deve retornar valores negativos quando aumentou ao invés de reduzir', () => {
      expect(calculateProgress(50, 60, 15, 'down')).toBe(0);
    });
  });

  describe('Baseline zero - Exemplo 3', () => {
    it('deve calcular corretamente com baseline zero', () => {
      // Baseline: 0, Meta: 50, Resultado: 45
      // Progresso = (45 - 0) / (50 - 0) = 45/50 = 90%
      expect(calculateProgress(0, 45, 50, 'up')).toBe(90);
    });

    it('deve retornar 0% quando ainda não há progresso', () => {
      expect(calculateProgress(0, 0, 50, 'up')).toBe(0);
    });

    it('deve retornar 100% quando atingiu a meta', () => {
      expect(calculateProgress(0, 50, 50, 'up')).toBe(100);
    });
  });

  describe('KR de Manutenção (binário) - Exemplo 4', () => {
    describe('direction=up (manter ou crescer)', () => {
      it('deve retornar 0% quando não atingiu - Exemplo 4 principal', () => {
        // Baseline: 75%, Meta: 75%, Resultado: 70%
        expect(calculateProgress(75, 70, 75, 'up')).toBe(0);
      });

      it('deve retornar 100% quando atingiu exatamente', () => {
        expect(calculateProgress(75, 75, 75, 'up')).toBe(100);
      });

      it('deve retornar 100% quando superou', () => {
        expect(calculateProgress(75, 80, 75, 'up')).toBe(100);
      });
    });

    describe('direction=down (manter ou reduzir)', () => {
      it('deve retornar 100% quando manteve ou reduziu', () => {
        expect(calculateProgress(75, 75, 75, 'down')).toBe(100);
        expect(calculateProgress(75, 70, 75, 'down')).toBe(100);
      });

      it('deve retornar 0% quando aumentou (não atingiu meta de manutenção)', () => {
        expect(calculateProgress(75, 80, 75, 'down')).toBe(0);
      });
    });
  });

  describe('Casos edge', () => {
    it('deve lidar com valores decimais', () => {
      expect(calculateProgress(10.5, 15.25, 20, 'up')).toBeCloseTo(50, 0);
    });

    it('deve lidar com valores grandes', () => {
      expect(calculateProgress(1000000, 1500000, 2000000, 'up')).toBe(50);
    });

    it('deve lidar com valores muito pequenos', () => {
      expect(calculateProgress(0.001, 0.0015, 0.002, 'up')).toBeCloseTo(50, 0);
    });
  });
});

describe('calculateAggregatedProgress', () => {
  it('deve calcular média de múltiplas KRs', () => {
    const krs = [
      { baseline: 0, current_value: 50, target: 100, direction: 'up' as const },
      { baseline: 0, current_value: 100, target: 100, direction: 'up' as const },
    ];
    // KR1: 50%, KR2: 100% → média = 75%
    expect(calculateAggregatedProgress(krs)).toBe(75);
  });

  it('deve retornar 0 para array vazio', () => {
    expect(calculateAggregatedProgress([])).toBe(0);
  });

  it('deve lidar com KRs mistas (up e down)', () => {
    const krs = [
      { baseline: 0, current_value: 50, target: 100, direction: 'up' as const },
      { baseline: 100, current_value: 50, target: 0, direction: 'down' as const },
    ];
    // KR1: 50%, KR2: 50% → média = 50%
    expect(calculateAggregatedProgress(krs)).toBe(50);
  });
});

describe('calculateProgressFromNullable', () => {
  it('deve converter valores string para number', () => {
    expect(calculateProgressFromNullable('0', '50', '100', 'up')).toBe(50);
  });

  it('deve tratar null/undefined como 0 para valores numéricos', () => {
    expect(calculateProgressFromNullable(null, 50, 100, 'up')).toBe(50);
    expect(calculateProgressFromNullable(undefined, 50, 100, 'up')).toBe(50);
  });

  it('deve usar "up" como direction padrão', () => {
    expect(calculateProgressFromNullable(0, 50, 100, null)).toBe(50);
    expect(calculateProgressFromNullable(0, 50, 100, undefined)).toBe(50);
  });
});
