

## Plano: Visualização Gantt no Módulo de Projetos

### Pré-checklist ✅

| Documento | Verificado | Achados |
|-----------|-----------|---------|
| TCR — Módulo Projects | ✅ | `GanttItem` tipado; query key `gantt()` já registrada |
| BU_SCOPED_RULES | ✅ | `useOptionalBuClient` + `.eq('bu_id')` |
| QUERY_KEYS_STANDARD | ✅ | `projectsKeys.gantt(buId, filters)` já existe |
| Dependências | ✅ | `recharts` já instalado; `date-fns` disponível |
| Padrão de view toggle | ✅ | `ViewOptionsBar` + viewMode via URL state (padrão do OKRs/KPIs) |

### O que será feito

#### 1. Hook `useGanttData.ts`

- Reutiliza o resultado de `useProjects(filters)` — sem query adicional ao DB
- Transforma `ProjectWithRelations[]` em `GanttItem[]` (1 item por projeto + 1 por milestone com `parent_id`)
- Filtra itens sem `start_date` e `due_date` (exibe aviso para projetos sem datas)
- Query key: `projectsKeys.gantt(buId, filters)` (já existente)

#### 2. Componente `ProjectGanttChart.tsx`

Gráfico de timeline horizontal usando Recharts (`BarChart` com barras horizontais):

```text
┌──────────────────────────────────────────────────────┐
│  Projeto A     ████████████████████                  │
│    ▸ Marco 1        ██████                           │
│    ▸ Marco 2              ████████                   │
│  Projeto B              ██████████████████           │
│    ▸ Marco 1                 ████                    │
│                                                      │
│  Jan  Fev  Mar  Abr  Mai  Jun  Jul  Ago  Set  Out   │
└──────────────────────────────────────────────────────┘
```

- Barras coloridas por status/health (reutiliza cores do `ProjectHealthBadge`)
- Projetos em negrito, milestones indentados com tamanho menor
- Tooltip com nome, datas, status, health
- Responsivo com scroll horizontal em mobile
- Click na barra navega para `/projects/:id`

#### 3. Toggle Lista/Gantt na `ProjectsPage.tsx`

- Novo `ProjectViewToggle` (padrão `CycleCheckinsViewToggle`)
- viewMode via URL state: `useUrlState({ key: 'view', defaultValue: 'list' })`
- Integrado no `ViewOptionsBar` com contador de resultados
- Quando `view=gantt`, renderiza `ProjectGanttChart` em vez do grid de cards

#### 4. Componente `ProjectViewToggle.tsx`

- 2 modos: `list` (ícone LayoutGrid) e `gantt` (ícone GanttChart)
- Segue exatamente o padrão visual do `CycleCheckinsViewToggle`

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/modules/projects/hooks/useGanttData.ts` | Novo |
| `src/modules/projects/components/ProjectGanttChart.tsx` | Novo |
| `src/modules/projects/components/ProjectViewToggle.tsx` | Novo |
| `src/modules/projects/pages/ProjectsPage.tsx` | Editar (toggle + conditional render) |
| `src/modules/projects/hooks/index.ts` | Editar (export) |

### Conformidade

| Regra | Status |
|-------|--------|
| BU-scoped (dados via `useProjects`) | ✅ |
| Query keys centralizadas | ✅ |
| URL state para viewMode | ✅ |
| Sem nova dependência | ✅ recharts já instalado |
| ViewOptionsBar canônico | ✅ |
| Sem `select('*')` | ✅ |

