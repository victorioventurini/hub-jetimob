# Hooks Barrel Standard

**Última atualização:** 2026-04-22  
**Categoria:** NORMATIVO  
**Versão:** v1.0.0

---

## 1. Princípio

Cada módulo de domínio (`src/modules/<modulo>/`) expõe seus hooks **exclusivamente via barrel central** em `src/modules/<modulo>/hooks/index.ts`. Imports diretos de arquivos internos (`@/modules/<modulo>/hooks/useXxx`) **são proibidos** em consumidores externos ao módulo.

## 2. Regras

### 2.1 Consumidores externos (outros módulos, `src/components/`, `src/pages/`)

✅ **Correto:**
```ts
import { useActiveCycle, useCycleProgress } from '@/modules/okrs/hooks';
```

❌ **Errado:**
```ts
import { useActiveCycle } from '@/modules/okrs/hooks/useActiveCycle';
import { useCycleProgress } from '@/modules/okrs/hooks/useCycleData';
```

### 2.2 Consumidores internos (mesmo módulo)

Dentro de `src/modules/okrs/`, prefira **paths relativos**:

✅ **Correto:**
```ts
// src/modules/okrs/components/.../Foo.tsx
import { useActiveCycle } from '../../hooks';
import type { OrgObjectiveWithKrs } from '../../hooks/queries';
```

❌ **Errado (auto-referência via alias gera ciclos):**
```ts
// src/modules/okrs/hooks/useFoo.ts
import { useBar } from '@/modules/okrs/hooks'; // CICLO!
```

### 2.3 Sub-barrels (ex: `hooks/queries/`)

Quando um módulo possui sub-pastas (ex: `okrs/hooks/queries/`), cada sub-pasta tem seu próprio `index.ts`:
- Internos da sub-pasta usam `./useXxx`
- Externos importam de `@/modules/<modulo>/hooks/queries` (sub-barrel) ou `@/modules/<modulo>/hooks` (barrel principal, que re-exporta)

## 3. Estado Atual (2026-04-22)

| Módulo | Barrel principal | Sub-barrels | Status |
|--------|------------------|-------------|--------|
| `okrs` | `hooks/index.ts` | `hooks/queries/index.ts` | ✅ consolidado |
| `kpis` | `hooks/index.ts` | — | ✅ |
| `teams` | `hooks/index.ts` | — | ✅ |
| `assets` | `hooks/index.ts` | — | ✅ |
| `permissions` | `hooks/index.ts` | — | ✅ |
| `users-global` | `hooks/index.ts` | — | ✅ |
| `areas` | `hooks/index.ts` | — | ✅ |
| `bu` | `hooks/index.ts` | — | ✅ |
| `external` | `hooks/index.ts` | — | ✅ |
| `home` | `hooks/index.ts` | — | ✅ |
| `integrations` | `hooks/index.ts` | — | ✅ |
| `partners` | `hooks/index.ts` | — | ✅ |
| `projects` | `hooks/index.ts` | — | ✅ |
| `settings` | `hooks/index.ts` | — | ✅ |
| `tickets` | `hooks/index.ts` | — | ✅ |
| `vic` | `hooks/index.ts` | — | ✅ |
| `automations` | `hooks/index.ts` | — | ✅ |
| `analysis` | _sem barrel_ | — | ⚠️ pendente |
| `events` | _sem barrel_ | — | ⚠️ pendente |

## 4. Arquitetura `okrs/hooks/queries/`

Esta é a **única sub-pasta `queries/` do projeto**. Contém:

- **`okrFieldDefinitions.ts`** — `OKR_FIELDS`, `OKR_JOINED_FIELDS`, `OKR_STALE_TIME`
- **`aggregateTypes.ts`** — tipos agregados (`OrgObjectiveWithKrs`, `TeamKrLinked`, etc.)
- **`aggregateUtils.ts`** — `AGGREGATE_FIELDS`
- **`useCheckinQueries.ts`** / **`useContributorQueries.ts`** / **`useDraftObjectivesForCycle.ts`** / **`useOkrDashboardData.ts`** / **`useOrgKeyResultQueries.ts`** / **`useOrgObjectiveQueries.ts`** / **`useOrgObjectiveViewQueries.ts`** / **`useTeamContributedQueries.ts`** / **`useTeamKeyResultQueries.ts`** / **`useTeamObjectiveQueries.ts`**

Todos são re-exportados pelo `hooks/queries/index.ts` e também pelo `hooks/index.ts` (barrel principal).

> **Nota sobre colisões:** `OrgObjectiveWithKrs` existe em dois arquivos — o de `aggregateTypes.ts` é o canônico; o de `useOkrDashboardData.ts` é re-exportado como `DashboardOrgObjectiveWithKrs` para evitar conflito.

## 5. Enforcement (futuro)

Recomendação para `eslint`:
```json
{
  "no-restricted-imports": ["error", {
    "patterns": [{
      "group": ["@/modules/*/hooks/use*", "@/modules/*/hooks/queries/use*"],
      "message": "Use o barrel: '@/modules/<modulo>/hooks' ou '@/modules/<modulo>/hooks/queries'."
    }]
  }]
}
```

---

*Mantido pela equipe de arquitetura.*
