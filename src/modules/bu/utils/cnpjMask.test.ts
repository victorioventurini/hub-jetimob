/**
 * BU module — CNPJ mask & validation (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import { formatCNPJ, unformatCNPJ, validateCNPJ } from './cnpjMask';

describe('BU · formatCNPJ', () => {
  it('formata CNPJ completo no padrão 00.000.000/0000-00', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('formata progressivamente conforme o usuário digita', () => {
    expect(formatCNPJ('11')).toBe('11');
    expect(formatCNPJ('11222')).toBe('11.222');
    expect(formatCNPJ('11222333')).toBe('11.222.333');
    expect(formatCNPJ('112223330001')).toBe('11.222.333/0001');
  });

  it('descarta caracteres não numéricos e trunca acima de 14 dígitos', () => {
    expect(formatCNPJ('aa11.222.333/0001-81xx99999')).toBe('11.222.333/0001-81');
  });
});

describe('BU · unformatCNPJ', () => {
  it('remove tudo que não for dígito', () => {
    expect(unformatCNPJ('11.222.333/0001-81')).toBe('11222333000181');
    expect(unformatCNPJ('abc')).toBe('');
  });
});

describe('BU · validateCNPJ', () => {
  it('aceita CNPJ matematicamente válido', () => {
    // CNPJ de teste com dígito verificador correto
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJs com tamanho errado', () => {
    expect(validateCNPJ('123')).toBe(false);
    expect(validateCNPJ('1'.repeat(15))).toBe(false);
  });

  it('rejeita sequências de dígitos repetidos (11111111111111)', () => {
    expect(validateCNPJ('11111111111111')).toBe(false);
    expect(validateCNPJ('00000000000000')).toBe(false);
  });

  it('rejeita CNPJ com dígitos verificadores inválidos', () => {
    expect(validateCNPJ('11.222.333/0001-00')).toBe(false);
  });
});
