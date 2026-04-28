---
name: optional-select-include-none
description: TeamSelect/AreaSelect/BuUserSelect em campos opcionais exigem includeNone (ou allowNone) para permitir limpar a seleção
type: preference
---

Selects centralizados (`TeamSelect`, `AreaSelect`, `BuUserSelect`) são wrappers de Radix `<Select>`, que **não permite limpar a seleção nativamente**. Sem habilitar a opção "Nenhum", o usuário fica preso ao primeiro valor escolhido.

**Regra:** se o campo é `.optional()` no Zod ou aceita `null` no banco → o select **DEVE** declarar:
- `TeamSelect` / `AreaSelect`: `includeNone noneLabel="Nenhum(a) ..."`
- `BuUserSelect`: `allowNone noneLabel="..."`

**Como aplicar:**
- Confira o schema Zod do form. Se o campo for `.optional()`, o select correspondente é obrigado a expor "Nenhum".
- Se a obrigatoriedade depende de outro campo (ex.: `responsible_area_id` é obrigatório só quando `lifecycle_status === 'active'`), passe `includeNone={!isRequired}` reativo ao watch.
- O handler `onValueChange` já recebe `null` quando o usuário escolhe "Nenhum"; mapear para `undefined` antes de `field.onChange` é seguro (`field.onChange(val ?? undefined)`).

**Por quê:** sem isso, qualquer campo opcional vira efetivamente obrigatório no UI, gerando bug funcional (ex.: KPI Global com Time Responsável "preso") sem nenhum erro de schema, RLS ou mutation.

**Caso de regressão:** `EditKpiScopeSection.tsx` `responsible_team_id` em escopos `org` e `area` (abr/2026). Submit (`EditKpiDialog.tsx`, `useKpiMutations.ts`) já convertia `'' / undefined → null` corretamente — bug era apenas de UI.

**Doc canônica:** `docs/canonical/UI_COMPONENTS_REGISTRY.md` (seções 6.1 BuUserSelect, 6.3 TeamSelect, AreaSelect).
