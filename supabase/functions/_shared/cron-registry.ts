/**
 * Cron Registry — Single Source of Truth para jobs agendados
 *
 * Mapeia cada slug de cron job para a edge function que ele invoca.
 * Consumido pelo `cron-dispatcher` e documentado para manutenção.
 *
 * Para adicionar um novo cron:
 *   1) Adicione a entrada aqui com `{ slug, functionName, schedule, description }`
 *   2) Garanta que o cron-job.org está configurado para chamar `cron-dispatcher`
 *      com o slug correto no header `x-cron-slug` (opcional) ou que a função
 *      seja invocada como parte do pipeline padrão.
 *   3) Documente em docs/canonical/CRON_JOBS.md
 *
 * @module _shared/cron-registry
 */

export interface CronJobEntry {
  /** Identificador único do job (kebab-case). */
  slug: string;
  /** Nome da edge function invocada. */
  functionName: string;
  /** Frequência cron (descritiva — pg_cron/cron-job.org). */
  schedule: string;
  /** Descrição curta do propósito. */
  description: string;
  /** Se requer x-cron-secret. */
  requiresSecret: boolean;
}

export const CRON_REGISTRY: readonly CronJobEntry[] = [
  {
    slug: "process-notification-outbox",
    functionName: "process-notification-outbox",
    schedule: "*/1 * * * *",
    description: "Processa fila de notificações pendentes (e-mail, in-app).",
    requiresSecret: true,
  },
  {
    slug: "evaluate-notification-health",
    functionName: "evaluate-notification-health",
    schedule: "*/5 * * * *",
    description: "Avalia saúde da entrega de notificações e cria/resolve alertas.",
    requiresSecret: true,
  },
  {
    slug: "generate-ritual-occurrences",
    functionName: "generate-ritual-occurrences",
    schedule: "0 3 * * *",
    description: "Gera ocorrências futuras de rituais a partir das cadências.",
    requiresSecret: true,
  },
  {
    slug: "sync-ritual-calendar-from-cycles",
    functionName: "sync-ritual-calendar-from-cycles",
    schedule: "0 4 * * *",
    description: "Sincroniza calendário operacional de rituais com ciclos de OKR ativos.",
    requiresSecret: true,
  },
  {
    slug: "weekly-curate-opening",
    functionName: "weekly-curate-opening",
    schedule: "0 7 * * 1",
    description: "Cura semanal de abertura (segunda-feira 07:00 BRT).",
    requiresSecret: true,
  },
] as const;

export function getCronEntryBySlug(slug: string): CronJobEntry | undefined {
  return CRON_REGISTRY.find((c) => c.slug === slug);
}

export function getCronEntryByFunction(functionName: string): CronJobEntry | undefined {
  return CRON_REGISTRY.find((c) => c.functionName === functionName);
}
