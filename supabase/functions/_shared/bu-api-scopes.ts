/**
 * Catálogo canônico de escopos das chaves de API por BU.
 *
 * IMPORTANTE: este arquivo é a fonte de verdade do backend (edge functions).
 * O espelho de frontend vive em `src/modules/settings/api-keys/scopes.ts`
 * e é validado por teste para não divergir deste catálogo.
 */

export type BuApiAccessLevel = 'none' | 'read' | 'write';

export interface BuApiModuleDef {
  key: string;
  label: string;
  description: string;
  /** Se o módulo suporta escrita via API. */
  supportsWrite: boolean;
  /** Endpoints de leitura liberados por `<module>:read`. */
  readEndpoints: string[];
  /** Endpoints de escrita liberados por `<module>:write`. */
  writeEndpoints: string[];
}

export const BU_API_MODULES: BuApiModuleDef[] = [
  {
    key: 'users',
    label: 'Usuários e times',
    description: 'Pessoas, times e áreas da BU.',
    supportsWrite: false,
    readEndpoints: [
      'GET /users',
      'GET /users/by-email?email=',
      'GET /users/:id',
      'GET /teams',
      'GET /areas',
    ],
    writeEndpoints: [],
  },
  {
    key: 'okrs',
    label: 'OKRs',
    description: 'Objetivos organizacionais e de time, KRs e check-ins.',
    supportsWrite: true,
    readEndpoints: [
      'GET /okrs/objectives?scope=org|team&cycle_id=',
      'GET /okrs/key-results?objective_id=',
      'GET /okrs/checkins?kr_id=',
    ],
    writeEndpoints: ['POST /okrs/key-results/:id/checkins'],
  },
  {
    key: 'kpis',
    label: 'KPIs',
    description: 'Indicadores da BU e seus valores.',
    supportsWrite: true,
    readEndpoints: ['GET /kpis', 'GET /kpis/:id', 'GET /kpis/:id/values'],
    writeEndpoints: ['POST /kpis/:id/values'],
  },
  {
    key: 'projects',
    label: 'Projetos',
    description: 'Projetos e marcos da BU.',
    supportsWrite: false,
    readEndpoints: ['GET /projects', 'GET /projects/:id', 'GET /projects/:id/milestones'],
    writeEndpoints: [],
  },
  {
    key: 'tickets',
    label: 'Tickets',
    description: 'Solicitações internas e externas da BU.',
    supportsWrite: true,
    readEndpoints: ['GET /tickets', 'GET /tickets/:id'],
    writeEndpoints: ['POST /tickets'],
  },
  {
    key: 'rituals',
    label: 'Ritos',
    description: 'Ocorrências dos ritos de gestão (weekly, MBR, QBR).',
    supportsWrite: false,
    readEndpoints: ['GET /rituals/occurrences?wizard_type=&team_id='],
    writeEndpoints: [],
  },
];

export const BU_API_MODULE_KEYS = BU_API_MODULES.map((m) => m.key);

export function allScopes(): string[] {
  return BU_API_MODULES.flatMap((m) =>
    m.supportsWrite ? [`${m.key}:read`, `${m.key}:write`] : [`${m.key}:read`],
  );
}

export function isValidScope(scope: string): boolean {
  return allScopes().includes(scope);
}

/** `write` implica `read` no mesmo módulo. */
export function scopesFromLevels(levels: Record<string, BuApiAccessLevel>): string[] {
  const scopes: string[] = [];
  for (const mod of BU_API_MODULES) {
    const level = levels[mod.key] ?? 'none';
    if (level === 'none') continue;
    scopes.push(`${mod.key}:read`);
    if (level === 'write' && mod.supportsWrite) scopes.push(`${mod.key}:write`);
  }
  return scopes;
}

export function levelsFromScopes(scopes: string[]): Record<string, BuApiAccessLevel> {
  const levels: Record<string, BuApiAccessLevel> = {};
  for (const mod of BU_API_MODULES) {
    if (scopes.includes(`${mod.key}:write`)) levels[mod.key] = 'write';
    else if (scopes.includes(`${mod.key}:read`)) levels[mod.key] = 'read';
    else levels[mod.key] = 'none';
  }
  return levels;
}

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required);
}
