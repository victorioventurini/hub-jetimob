import { describe, it, expect } from 'vitest';
import { DIALOG_SIZES, getDialogSizeClass } from './dialog-sizes';

describe('DIALOG_SIZES', () => {
  it('todos tamanhos canônicos definidos', () => {
    expect(DIALOG_SIZES.sm).toContain('480');
    expect(DIALOG_SIZES.md).toContain('560');
    expect(DIALOG_SIZES.lg).toContain('640');
    expect(DIALOG_SIZES.xl).toContain('768');
    expect(DIALOG_SIZES.full).toContain('90vw');
  });
});

describe('getDialogSizeClass', () => {
  it('retorna classe sem extras', () => {
    expect(getDialogSizeClass('md')).toBe(DIALOG_SIZES.md);
  });

  it('concatena classes adicionais', () => {
    const r = getDialogSizeClass('lg', 'p-4');
    expect(r).toContain(DIALOG_SIZES.lg);
    expect(r).toContain('p-4');
  });
});
