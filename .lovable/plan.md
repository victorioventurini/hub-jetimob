## Contexto

Hoje o domínio de ritos OKR usa string literals duplicadas em vários tipos:

- `TeamCheckinDecision.category`: `'decision' | 'focus_adjustment' | 'next_step' | 'strategic_proposal'` (em `shared.ts`)
- `QbrCLevelSnapshot.directives[].category`: `'strategic_question' | 'hypothesis' | 'non_priority' | 'challenge'` (em `qbr.ts`)
- `WeeklyThemeBlock`: `'performance' | 'projetos' | 'pessoas'` (em `weekly.ts`)
- `PreWeeklyTopicCategory`: `'performance' | 'projetos'` (em `weekly.ts`)
- `PreWeeklyPeopleSignal.type`: `'celebracao' | 'risco' | 'mudanca' | 'feedback'` (em `weekly.ts`)
- `WeeklyThemeType`: `'risco' | 'oportunidade' | 'decisao' | 'celebracao' | 'alerta'` (em `weekly.ts`)

Cada string aparece em ~25 arquivos (steps, renderers, testes, utils, hooks). Não há SSOT — qualquer renomeio quebra parcialmente. O objetivo da Fase 4 é centralizar este vocabulário em **um único módulo** (`src/modules/okrs/types/wizard/vocabulary.ts`) sem mudar comportamento.

## Princípios desta onda

- **Zero mudança funcional**: nenhum literal renomeado, nenhuma label de UI alterada, nenhuma migração de dados. As strings ficam idênticas.
- **Adição não-quebrante**: novos types/consts apontam para os mesmos literais já existentes; tipos antigos viram `re-exports` ou aliases deprecados com `@deprecated` JSDoc.
- **Não tocar** snapshots em `okr_wizard_sessions.reflection_data` — strings persistidas continuam válidas porque os literais não mudam.

## O que será criado

### Novo arquivo `src/modules/okrs/types/wizard/vocabulary.ts`

Centraliza 5 vocabulários e 1 mapeamento:

1. **`DecisionCategory`** = `'decision' | 'focus_adjustment' | 'next_step' | 'strategic_proposal'`
   + const array `DECISION_CATEGORIES` para iteração em UI.
2. **`DirectiveCategory`** = `'strategic_question' | 'hypothesis' | 'non_priority' | 'challenge'`
   + const array `DIRECTIVE_CATEGORIES`.
3. **`RitualBlock`** = `'performance' | 'projetos' | 'pessoas'`
   (substitui `WeeklyThemeBlock`; também cobre `PreWeeklyTopicCategory` como subset via `PreWeeklyBlock = Exclude<RitualBlock, 'pessoas'>`).
4. **`RitualPeopleSignalType`** = `'celebracao' | 'risco' | 'mudanca' | 'feedback'`
   (substitui o type inline em `PreWeeklyPeopleSignal`).
5. **`RitualThemeActionType`** = `'risco' | 'oportunidade' | 'decisao' | 'celebracao' | 'alerta'`
   (substitui `WeeklyThemeType`).
6. **`DIRECTIVE_TO_DECISION_MAP: Record<DirectiveCategory, DecisionCategory>`** — mapeamento canônico para quando uma diretiva C-Level vira decisão no QBR Meeting:
   - `strategic_question` → `next_step`
   - `hypothesis` → `strategic_proposal`
   - `non_priority` → `focus_adjustment`
   - `challenge` → `decision`

   *(Mapeamento derivado da semântica atual — pode ser ajustado no review do PR.)*

### Re-exports nos arquivos atuais (retrocompat)

- `shared.ts` importa `DecisionCategory` e usa em `TeamCheckinDecision.category`.
- `qbr.ts` importa `DirectiveCategory` e usa em `QbrCLevelSnapshot.directives[].category`.
- `weekly.ts` re-exporta `RitualBlock as WeeklyThemeBlock` (deprecado), `RitualPeopleSignalType` substitui o type inline, `RitualThemeActionType as WeeklyThemeType` (deprecado).

## O que NÃO será feito nesta onda

- Não renomear `WeeklyThemeBlock` → `RitualBlock` no código consumidor (apenas alias). Isso é cosmético e seria onda futura.
- Não consolidar `PreWeeklyTopicCategory` em `RitualBlock` no nível dos consumidores (apenas mostrar a relação por subset type).
- Não criar UI/labels para o `DIRECTIVE_TO_DECISION_MAP` — apenas exportar a constante. Quem quiser usar, importa.
- Não tocar em `MbrChecklist`/`QbrPostGovernanceChecklist` (escopo da Fase 5, que foi descartada).

## Arquivos tocados

- **Criar**: `src/modules/okrs/types/wizard/vocabulary.ts`
- **Editar (imports + alias)**: `shared.ts`, `qbr.ts`, `weekly.ts`, `index.ts` (re-export do novo módulo)
- Total: 1 novo + 4 editados. Nenhum consumidor (steps/renderers/testes) precisa ser tocado.

## Validação

- `bunx vitest run src/modules/okrs/components/wizards/**/__tests__` — esperado verde sem mudanças.
- Build TypeScript verde (sem erros de tipo nos consumidores existentes — os literais permanecem compatíveis).
- Smoke test: abrir QBR Meeting Decisions, confirmar dropdown de categorias funcionando.

## Próximas ondas (não nesta)

- **Onda 3 candidata** — Fase 3 (unificação de tipos canônicos: `KrFinalStateSnapshot`, `KpiRitualSnapshot`, `QbrKrAdjustment`, `QbrCrossCommitment`, achatamento `WeeklyPriorityItem`).
- **Onda 4 candidata** — Fase 1 (denormalização de nomes/títulos — ~18 campos).
- Aplicar `DIRECTIVE_TO_DECISION_MAP` na promoção `directive → decision` no QBR Meeting (requer decisão de UX).


---

## Status final — Onda 2 (Fase 4 — vocabulário canônico) executada

### Concluído

1. **Criado** `src/modules/okrs/types/wizard/vocabulary.ts` com:
   - `DecisionCategory` + `DECISION_CATEGORIES`
   - `DirectiveCategory` + `DIRECTIVE_CATEGORIES`
   - `RitualBlock` + `RITUAL_BLOCKS` + `PreWeeklyBlock`
   - `RitualPeopleSignalType` + `RITUAL_PEOPLE_SIGNAL_TYPES`
   - `RitualThemeActionType` + `RITUAL_THEME_ACTION_TYPES`
   - `DIRECTIVE_TO_DECISION_MAP`
2. **`shared.ts`**: `TeamCheckinDecision.category` agora usa `DecisionCategory`.
3. **`qbr.ts`**: `QbrCLevelSnapshot.directives[].category` agora usa `DirectiveCategory`.
4. **`weekly.ts`**: 
   - `WeeklyThemeBlock` e `WeeklyThemeType` viraram aliases `@deprecated` para `RitualBlock`/`RitualThemeActionType`.
   - `PreWeeklyTopicCategory` agora é alias de `PreWeeklyBlock`.
   - `PreWeeklyPeopleSignal.type` usa `RitualPeopleSignalType`.
5. **`index.ts`**: barrel re-exporta `./vocabulary`.

### Validação
- `bunx vitest run src/modules/okrs`: **1766/1766 passando**.
- Build TypeScript verde (zero erros após edits).
- Zero consumidor (steps/renderers/hooks/testes) precisou ser tocado — literais permanecem idênticos.

### Memory registrada
- `mem://standards/wizard-vocabulary-canonical` — SSOT do vocabulário.
