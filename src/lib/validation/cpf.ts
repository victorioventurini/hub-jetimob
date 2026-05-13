/**
 * CPF — SSOT de normalização, formatação e validação.
 *
 * - normalizeCpf: remove tudo que não é dígito.
 * - formatCpf:    aplica máscara 000.000.000-00 para exibição.
 * - isValidCpf:   valida 11 dígitos + dígitos verificadores; rejeita sequências repetidas.
 * - cpfZodSchema: schema Zod já normalizado e validado.
 *
 * Espelha exatamente a função SQL `public.is_valid_cpf` + trigger `validate_profile_cpf`.
 */
import { z } from "zod";

export function normalizeCpf(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(/\D/g, "");
}

export function formatCpf(input: string | null | undefined): string {
  const digits = normalizeCpf(input);
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCpf(input: string | null | undefined): boolean {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  if (d2 !== parseInt(cpf[10], 10)) return false;

  return true;
}

/** Aplica a máscara progressivamente conforme o usuário digita. */
export function maskCpfInput(input: string): string {
  const d = normalizeCpf(input).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export const cpfZodSchema = z
  .string({ required_error: "CPF é obrigatório" })
  .transform(normalizeCpf)
  .refine((v) => v.length === 11, { message: "CPF deve ter 11 dígitos" })
  .refine(isValidCpf, { message: "CPF inválido" });
