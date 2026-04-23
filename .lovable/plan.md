

## Corrigir Gantt geral em `/projects?view=gantt` para usar `start_date` real do milestone

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Módulo Projetos v1.4) e `mem://features/projects/holistic-module-architecture-v2`
- ✅ `mem://standards/query-optimization-standard` (sem `select('*')`, colunas explícitas)
- ✅ `mem://standards/soft-delete-policy-v1` (filtro `deleted_at` mantido)
- ✅ Comparado `MilestoneGanttChart` (detalhe do projeto) vs `useGanttData` (Gantt geral): o de detalhe **já usa** `m.start_date` corretamente; o geral **não**.

### Causa raiz (dois pontos no mesmo fluxo)

**1. `src/modules/projects/hooks/useProjects.ts` (linha 13)** — o SELECT da lista de projetos não traz `start_date` nem `created_at` dos milestones:
```ts
project_milestones(id, name, status, due_date, deleted_at)
```
Resultado: ao chegar em `useGanttData`, todo `ms.start_date` é `undefined`.

**2. `src/modules/projects/hooks/useGanttData.ts` (linha 51)** — ignora `ms.start_date` e usa `ms.created_at` como fallback "padrão":
```ts
const msStart = isValidDateStr(ms.created_at) ? ms.created_at : project.start_date;
```
Isso contradiz o `MilestoneGanttChart` (detalhe do projeto), que prioriza `m.start_date` real e só usa `created_at`/`projectStartDate` como fallback legacy.

Consequência visual: na visão geral, todas as barras de milestone começam na data de criação do registro (ou na data de início do projeto), não na `start_date` definida pelo usuário.

### Correção (mínima, alinhada ao padrão já existente em `MilestoneGanttChart`)

**Arquivo 1 — `src/modules/projects/hooks/useProjects.ts` (1 linha):**
```ts
- project_milestones(id, name, status, due_date, deleted_at)
+ project_milestones(id, name, status, start_date, due_date, created_at, deleted_at)
```
Adiciona apenas as 2 colunas necessárias (sem `select('*')`, mantendo o padrão de colunas explícitas).

**Arquivo 2 — `src/modules/projects/hooks/useGanttData.ts` (lógica do `msStart`):**
Replicar exatamente a hierarquia do `MilestoneGanttChart`:
```ts
const msStart =
  isValidDateStr(ms.start_date) ? ms.start_date
  : isValidDateStr(ms.created_at) ? ms.created_at
  : project.start_date;
```
Prioridade: `start_date` real → `created_at` (legacy) → `project.start_date` (fallback final).

**Arquivo 3 — Tipo `ProjectWithRelations.milestones[]`:**
Verificar se o tipo dos milestones na lista exige ajuste; se hoje aceita `ProjectMilestone` completo, basta garantir que o mapeamento em `useProjects.ts` não derrube `start_date`/`created_at` ao montar `milestones`. (Vou conferir o map em `useProjects.ts` linhas 42-45 e ajustar se necessário sem alterar contrato público.)

### Por que essa abordagem
- **Reaproveitamento de padrão existente**: a lógica correta já está em `MilestoneGanttChart`. Apenas espelhamos no Gantt geral, mantendo SSOT semântico de "como inferir start de milestone".
- **Sem novo componente, sem novo hook, sem nova RPC**.
- **Sem mudança de schema/RLS/migration**.
- **Conformidade com Core**: BU isolation preservada (sem alterar filtros), `select` explícito, soft-delete intacto.

### Validação pós-correção
1. `/projects?view=gantt` → milestones de projetos com `start_date` definido renderizam barras iniciando na data correta (ex.: projeto `98074a55-...` cujos milestones têm `start_date != created_at` após o backfill recente).
2. Tooltip do milestone mostra `start_date → due_date` real.
3. Sanity-check em `/projects/:id?view=timeline` (`MilestoneGanttChart`) — deve continuar idêntico (já estava correto).
4. Milestones legacy sem `start_date` continuam usando fallback `created_at`/`project.start_date` (sem regressão).

### Arquivos afetados
- `src/modules/projects/hooks/useProjects.ts` (1 linha no SELECT + ajuste no map se necessário)
- `src/modules/projects/hooks/useGanttData.ts` (3 linhas na hierarquia de `msStart`)
- `src/modules/projects/hooks/__tests__/useGanttData.test.ts` (atualizar/adicionar caso para `ms.start_date` ter prioridade)

### Documentação canônica
- Nota curta no changelog do TCR §3.3.1: "hotfix Gantt geral — `useGanttData` agora prioriza `milestone.start_date` (alinhado a `MilestoneGanttChart`)."

### Princípios respeitados
- BU Isolation (sem mudança em filtros)
- Sem `select('*')` (colunas explícitas adicionadas)
- Sem CHECK constraints / sem mudança em RLS
- Soft-delete preservado
- Reuso do padrão de fallback já validado no detalhe do projeto
- Componentes centralizados (mesma SSOT lógica nos dois cenários)

