/**
 * Wizard Types — Compat barrel (legado)
 *
 * Mantido para preservar imports existentes (`@/modules/okrs/types/wizard`).
 * A definição real está modularizada em `./wizard/*` por persona.
 *
 * Histórico: o arquivo monolítico (1163 linhas) foi quebrado em 13 módulos
 * focados em P3.1 do plano de débito técnico. Nenhum consumidor precisou
 * mudar imports — este re-export garante backward compatibility.
 */

export * from './wizard/index';
