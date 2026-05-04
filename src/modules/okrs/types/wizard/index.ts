/**
 * Wizard Types — Barrel
 *
 * Re-exporta todos os tipos por persona/área. Consumidores devem importar
 * preferencialmente deste barrel (ou via `@/modules/okrs/types/wizard`,
 * que é redirecionado pelo arquivo legado de mesmo nome).
 *
 * Ordem dos exports importa quando há colisão de nomes — aqui não há,
 * cada submódulo encapsula tipos disjuntos. `shared` precisa vir antes
 * de quem o consome (mbr/qbr/team-checkin/weekly/session).
 */

// Núcleo + transversais
export * from './core';
export * from './vocabulary';
export * from './shared';

// Personas
export * from './collaborator';
export * from './leader-prep';
export * from './team-checkin';
export * from './managers-clevel';
export * from './team-okr-creation';
export * from './mbr';
export * from './mbr-v2';
export * from './qbr';
export * from './weekly';

// Persistência + integração com Vic
export * from './session';
export * from './vic-context';
export * from './wizard-configs';
