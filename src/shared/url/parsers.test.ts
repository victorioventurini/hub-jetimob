/**
 * Wave 2 — Tests for URL parsers & serializers (pure functions).
 */
import { describe, it, expect } from 'vitest';
import { parsers, serializers, arrayParams, dateRangeParams } from './parsers';

describe('parsers.string', () => {
  it('retorna o valor como está', () => {
    expect(parsers.string('hello')).toBe('hello');
    expect(parsers.string('')).toBe('');
  });
});

describe('parsers.stringOrUndefined', () => {
  it('retorna undefined para vazio/whitespace', () => {
    expect(parsers.stringOrUndefined('')).toBeUndefined();
    expect(parsers.stringOrUndefined('   ')).toBeUndefined();
  });
  it('retorna valor trimado', () => {
    expect(parsers.stringOrUndefined('  abc  ')).toBe('abc');
    expect(parsers.stringOrUndefined('xyz')).toBe('xyz');
  });
});

describe('parsers.number', () => {
  it('parseInt com fallback 0', () => {
    expect(parsers.number('42')).toBe(42);
    expect(parsers.number('abc')).toBe(0);
    expect(parsers.number('')).toBe(0);
  });
});

describe('parsers.numberWithDefault', () => {
  it('usa default quando NaN', () => {
    const p = parsers.numberWithDefault(10);
    expect(p('5')).toBe(5);
    expect(p('xyz')).toBe(10);
  });
});

describe('parsers.float', () => {
  it('parseFloat com fallback', () => {
    expect(parsers.float('3.14')).toBeCloseTo(3.14);
    expect(parsers.float('abc')).toBe(0);
  });
});

describe('parsers.boolean', () => {
  it.each([['true', true], ['1', true], ['yes', true], ['false', false], ['0', false], ['', false]])(
    'parsers.boolean(%s) === %s',
    (input, expected) => expect(parsers.boolean(input)).toBe(expected)
  );
});

describe('parsers.stringArray', () => {
  it('split CSV com trim e filter empty', () => {
    expect(parsers.stringArray('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(parsers.stringArray('a, b , c')).toEqual(['a', 'b', 'c']);
    expect(parsers.stringArray('a,,b,')).toEqual(['a', 'b']);
    expect(parsers.stringArray('')).toEqual([]);
  });
});

describe('parsers.date', () => {
  it('parseISO válido', () => {
    const r = parsers.date('2026-04-23');
    expect(r).toBeInstanceOf(Date);
    expect(r?.getUTCFullYear()).toBe(2026);
  });
  it('null para inválido', () => {
    expect(parsers.date('not-a-date')).toBeNull();
    expect(parsers.date('')).toBeNull();
  });
});

describe('parsers.enum', () => {
  it('valida contra lista permitida', () => {
    const p = parsers.enum(['asc', 'desc'] as const, 'desc');
    expect(p('asc')).toBe('asc');
    expect(p('desc')).toBe('desc');
    expect(p('invalid')).toBe('desc');
  });
});

describe('parsers.numberInRange', () => {
  it('clamp + default', () => {
    const p = parsers.numberInRange(1, 100, 25);
    expect(p('50')).toBe(50);
    expect(p('200')).toBe(100);
    expect(p('-5')).toBe(1);
    expect(p('abc')).toBe(25);
  });
});

describe('serializers', () => {
  it('string null para vazio/whitespace', () => {
    expect(serializers.string('abc')).toBe('abc');
    expect(serializers.string('  ')).toBeNull();
    expect(serializers.string(null)).toBeNull();
    expect(serializers.string(undefined)).toBeNull();
  });
  it('number', () => {
    expect(serializers.number(42)).toBe('42');
    expect(serializers.number(0)).toBe('0');
    expect(serializers.number(null)).toBeNull();
    expect(serializers.number(undefined)).toBeNull();
  });
  it('boolean', () => {
    expect(serializers.boolean(true)).toBe('true');
    expect(serializers.boolean(false)).toBe('false');
    expect(serializers.boolean(null)).toBeNull();
  });
  it('stringArray', () => {
    expect(serializers.stringArray(['a', 'b'])).toBe('a,b');
    expect(serializers.stringArray([])).toBeNull();
    expect(serializers.stringArray(null)).toBeNull();
  });
  it('date YYYY-MM-DD', () => {
    expect(serializers.date(new Date('2026-04-23T00:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(serializers.date(null)).toBeNull();
    expect(serializers.date(new Date('invalid'))).toBeNull();
  });
  it('dateTime ISO', () => {
    const r = serializers.dateTime(new Date('2026-04-23T12:00:00Z'));
    expect(r).toContain('2026-04-23T12:00:00');
    expect(serializers.dateTime(null)).toBeNull();
  });
});

describe('arrayParams', () => {
  it('parseRepeated', () => {
    const sp = new URLSearchParams('status=open&status=paused&status=');
    expect(arrayParams.parseRepeated(sp, 'status')).toEqual(['open', 'paused']);
  });
  it('serializeRepeated remove e adiciona com trim', () => {
    const sp = new URLSearchParams('status=old');
    arrayParams.serializeRepeated(sp, 'status', [' a ', 'b', '']);
    expect(sp.getAll('status')).toEqual(['a', 'b']);
  });
  it('serializeRepeated null limpa', () => {
    const sp = new URLSearchParams('x=1&x=2');
    arrayParams.serializeRepeated(sp, 'x', null);
    expect(sp.getAll('x')).toEqual([]);
  });
});

describe('dateRangeParams', () => {
  it('parse válido', () => {
    const sp = new URLSearchParams('start=2026-01-01&end=2026-12-31');
    const r = dateRangeParams.parse(sp);
    expect(r.start).toBeInstanceOf(Date);
    expect(r.end).toBeInstanceOf(Date);
  });
  it('parse vazio = null', () => {
    const r = dateRangeParams.parse(new URLSearchParams());
    expect(r.start).toBeNull();
    expect(r.end).toBeNull();
  });
  it('serialize seta e deleta', () => {
    const sp = new URLSearchParams('start=old&end=old');
    dateRangeParams.serialize(sp, { start: new Date('2026-04-01T00:00:00Z'), end: null });
    expect(sp.get('start')).toMatch(/2026-04-01/);
    expect(sp.has('end')).toBe(false);
  });
  it('serialize com chaves customizadas', () => {
    const sp = new URLSearchParams();
    dateRangeParams.serialize(sp, { start: new Date('2026-01-15T00:00:00Z') }, 'from', 'to');
    expect(sp.has('from')).toBe(true);
    expect(sp.has('to')).toBe(false);
  });
});
