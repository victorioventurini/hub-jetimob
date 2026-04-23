import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (tailwind class merge)', () => {
  it('combina classes string', () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  it('resolve conflitos do tailwind (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('lida com condicionais', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('lida com arrays', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('ignora falsy', () => {
    expect(cn('a', null, undefined, false, 'b')).toBe('a b');
  });
});
