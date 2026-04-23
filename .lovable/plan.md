

## Alinhar 100% os dois Gantts (geral e detalhe do projeto)

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Módulo Projetos v1.4) e `mem://features/projects/holistic-module-architecture-v2`
- ✅ Comparado `MilestoneGanttChart.tsx` (detalhe) vs `useGanttData.ts` (geral) — única divergência é o fallback final `m.due_date`
- ✅ `GanttTimeline` continua sendo SSOT visual (sem mudança)

### Causa da divergência
`MilestoneGanttChart.tsx` (linhas 28-35) usa `m.due_date` como fallback final quando não há `start_date`/`created_at`/`projectStartDate`. Isso gera barras de largura zero (clamped para 20px no `GanttTimeline`) — visualmente quebradas e sem significado temporal. O Gantt geral (`useGanttData`) não tem esse fallback: para no `project.start_date`.

### Correção (1 arquivo, mínima)

**`src/modules/projects/components/MilestoneGanttChart.tsx`** — alinhar a hierarquia de fallback ao `useGanttData`:

```ts
// Antes (linhas 28-35):
const startDate =
  m.start_date && isValid(parseISO(m.start_date))
    ? m.start_date
    : m.created_at && isValid(parseISO(m.created_at))
      ? m.created_at
      : projectStartDate && isValid(parseISO(projectStartDate))
        ? projectStartDate
        : m.due_date;   // ❌ remover

// Depois:
const startDate =
  m.start_date && isValid(parseISO(m.start_date))
    ? m.start_date
    : m.created_at && isValid(parseISO(m.created_at))
      ? m.created_at
      : projectStartDate && isValid(parseISO(projectStartDate))
        ? projectStartDate
        : null;

if (!startDate) {
  excludedCount++;
  continue;
}
```

### Comportamento resultante (idêntico nos dois Gantts)
- Prioridade: `milestone.start_date` → `milestone.created_at` → `project.start_date`
- Sem fallback para `due_date` (evita barras de largura zero)
- Milestones sem qualquer data válida de início entram em `excludedCount` (reportados honestamente ao usuário)
- `deleted_at` continua filtrado
- Milestones sem `due_date` válido continuam excluídos (já estava correto)

### Validação pós-correção
1. `/projects/:id` (timeline) — milestones com `start_date` válido renderizam idênticos ao `/projects?view=gantt`
2. Milestones legacy (sem `start_date`) usam `created_at` → idêntico ao geral
3. Milestones órfãos (sem nenhuma data de início) aparecem em "X marco(s) omitido(s)" em vez de virar barras quebradas
4. Sanity-check no Gantt geral — sem regressão (não foi tocado)

### Arquivos afetados
- `src/modules/projects/components/MilestoneGanttChart.tsx` (ajuste no fallback + early-continue)

### Documentação canônica
- Nota no changelog do TCR §3.3.1: "Gantt detalhe alinhado ao geral — fallback `due_date` removido; milestones sem start válido vão para `excludedCount`."

### Princípios respeitados
- BU isolation (sem mudança em queries)
- Sem `select('*')`, sem mudança de schema/RLS
- SSOT semântico: hierarquia de fallback idêntica nos dois cenários
- `GanttTimeline` continua SSOT visual — zero duplicação

