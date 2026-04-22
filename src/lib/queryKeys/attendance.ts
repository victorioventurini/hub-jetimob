/**
 * Attendance Query Keys
 *
 * Chaves canônicas para o sistema centralizado de presença em ritos coletivos.
 * Padrão: ['attendance', <subdomain>, ...args].
 *
 * Use prefix helpers para invalidação ampla (ex.: ao concluir um rito).
 */

export const attendanceKeys = {
  /** Prefixo global — invalida tudo de presença */
  all: () => ['attendance'] as const,

  /** Prefixo de sessões individuais */
  sessionsPrefix: () => ['attendance', 'session'] as const,
  /** Lista de presença de uma sessão (para o condutor editar) */
  session: (sessionId: string | null) =>
    ['attendance', 'session', sessionId] as const,

  /** Prefixo de summaries agregados */
  summariesPrefix: () => ['attendance', 'summary'] as const,
  /** Summary agregada de uma sessão (X de Y presentes / taxa) */
  summary: (sessionId: string | null) =>
    ['attendance', 'summary', sessionId] as const,

  /** Prefixo de histórico individual de participação */
  historyPrefix: () => ['attendance', 'history'] as const,
  /** Histórico de presença de uma pessoa em um tipo de rito */
  participantHistory: (
    profileId: string | null,
    persona: string | null,
    range?: string,
  ) =>
    ['attendance', 'history', profileId, persona, range ?? 'all'] as const,

  /** Prefixo de série temporal por rito (BU + persona) */
  seriesPrefix: () => ['attendance', 'series'] as const,
  /** Série temporal da taxa de presença para um rito em uma BU */
  buRitualSeries: (
    buId: string | null,
    persona: string | null,
    range?: string,
  ) =>
    ['attendance', 'series', buId, persona, range ?? 'all'] as const,
} as const;
