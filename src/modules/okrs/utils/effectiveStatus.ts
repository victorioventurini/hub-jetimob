/**
 * Effective KR RAG Status — Canonical utility
 * 
 * Regra: Se o status no banco é `not_started` mas houve atualização de valor
 * (current_value ≠ baseline), o status efetivo deve ser `green` (iniciado/on track).
 * 
 * Isso ocorre porque check-ins de KR ou atualizações de KPI primário vinculado
 * alteram `current_value` sem necessariamente atualizar o campo `status` da KR.
 * 
 * Uso obrigatório em TODOS os pontos que exibem status de KR (org ou time).
 */

import type { OkrRagStatus } from '../types';

/**
 * Retorna o status RAG efetivo de uma KR, corrigindo `not_started` quando há atividade.
 * 
 * @param dbStatus - Status armazenado no banco (campo `status`)
 * @param baseline - Valor baseline da KR
 * @param currentValue - Valor atual da KR
 * @returns Status RAG efetivo para exibição
 */
export function getEffectiveKrRagStatus(
  dbStatus: OkrRagStatus,
  baseline: number,
  currentValue: number,
): OkrRagStatus {
  if (dbStatus === 'not_started' && currentValue !== baseline) {
    return 'green';
  }
  return dbStatus;
}
