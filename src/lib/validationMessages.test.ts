/**
 * Wave 1 — Tests for validation messages catalog.
 */
import { describe, it, expect } from 'vitest';
import { validation, zodMessages } from './validationMessages';

describe('validation.required', () => {
  it('com fieldName', () => {
    expect(validation.required('Nome')).toBe('Nome é obrigatório');
  });

  it('sem fieldName', () => {
    expect(validation.required()).toBe('Campo obrigatório');
  });
});

describe('validation.requiredSelect', () => {
  it('com fieldName em lowercase', () => {
    expect(validation.requiredSelect('Cargo')).toBe('Selecione cargo');
  });

  it('sem fieldName', () => {
    expect(validation.requiredSelect()).toBe('Selecione uma opção');
  });
});

describe('validation length', () => {
  it('minLength com fieldName', () => {
    expect(validation.minLength(3, 'Nome')).toBe('Nome deve ter pelo menos 3 caracteres');
  });
  it('maxLength sem fieldName', () => {
    expect(validation.maxLength(10)).toBe('Máximo de 10 caracteres');
  });
  it('exactLength', () => {
    expect(validation.exactLength(11, 'CPF')).toBe('CPF deve ter exatamente 11 caracteres');
  });
});

describe('validation números', () => {
  it('min/max', () => {
    expect(validation.min(1, 'Quantidade')).toBe('Quantidade deve ser no mínimo 1');
    expect(validation.max(99)).toBe('Valor máximo: 99');
  });
  it('positive/integer', () => {
    expect(validation.positive('Preço')).toBe('Preço deve ser maior que zero');
    expect(validation.integer()).toBe('Deve ser um número inteiro');
  });
});

describe('validation formatos', () => {
  it('formatos canônicos', () => {
    expect(validation.email()).toBe('E-mail inválido');
    expect(validation.url()).toBe('URL inválida');
    expect(validation.phone()).toBe('Telefone inválido');
    expect(validation.cpf()).toBe('CPF inválido');
    expect(validation.cnpj()).toBe('CNPJ inválido');
    expect(validation.cep()).toBe('CEP inválido');
  });
});

describe('validation datas', () => {
  it('mensagens de data', () => {
    expect(validation.invalidDate()).toBe('Data inválida');
    expect(validation.futureDate('Início')).toBe('Início deve ser uma data futura');
    expect(validation.pastDate()).toBe('Data deve ser no passado');
    expect(validation.dateAfter('Início')).toBe('Deve ser posterior a Início');
    expect(validation.dateBefore('Fim')).toBe('Deve ser anterior a Fim');
    expect(validation.consolidatedDate()).toContain('encerrado');
  });
});

describe('validation arquivos/senha/duplicate', () => {
  it('arquivo', () => {
    expect(validation.fileSize(5)).toBe('Arquivo deve ter no máximo 5MB');
    expect(validation.fileType('PDF, PNG')).toBe('Formatos permitidos: PDF, PNG');
  });
  it('senha', () => {
    expect(validation.weakPassword()).toContain('8 caracteres');
    expect(validation.passwordMismatch()).toBe('As senhas não conferem');
  });
  it('duplicate', () => {
    expect(validation.duplicate('E-mail')).toBe('Este e-mail já está em uso');
    expect(validation.duplicate()).toBe('Este valor já existe');
  });
  it('invalidFormat', () => {
    expect(validation.invalidFormat('CEP')).toBe('Formato de cep inválido');
    expect(validation.invalidFormat()).toBe('Formato inválido');
  });
});

describe('zodMessages', () => {
  it('string helper', () => {
    const m = zodMessages.string('Nome');
    expect(m.required_error).toBe('Nome é obrigatório');
    expect(m.invalid_type_error).toBe('Nome é obrigatório');
  });
  it('number helper', () => {
    const m = zodMessages.number('Idade');
    expect(m.invalid_type_error).toBe('Idade deve ser um número');
  });
  it('enum helper', () => {
    const m = zodMessages.enum('Status');
    expect(m.required_error).toBe('Selecione status');
  });
});
