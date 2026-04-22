/**
 * Wizards Framework — Public API (canonical)
 *
 * Este barrel é a **fronteira pública** do framework genérico de wizards.
 * Implementação física vive (por enquanto) em
 * `src/modules/okrs/components/wizards/shared/framework/` por razões
 * históricas — a migração física será feita em uma onda futura quando
 * houver demanda multi-módulo concreta.
 *
 * REGRAS:
 * 1. Consumidores fora do módulo `okrs` DEVEM importar daqui:
 *    `import { BalanceStep, STEP_DEFINITIONS } from "@/wizards-framework"`.
 * 2. Consumidores dentro do `okrs` PODEM continuar usando o caminho
 *    interno até a migração física.
 * 3. Nada aqui pode depender de regras de negócio específicas de OKR;
 *    se precisar, vive no módulo consumidor.
 *
 * Documentação de design: `docs/canonical/HOOKS_BARREL_STANDARD.md` +
 * seção 4.8.1 do TCR.
 */

export * from "@/modules/okrs/components/wizards/shared/framework";
