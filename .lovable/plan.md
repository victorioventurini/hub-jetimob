

## Redesign dos Gráficos Gantt — Global e por Projeto

### Design Alvo (referência)

```text
┌────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ PROJETO / MILESTONE    │   Mar    │   Abr    │   Mai    │   Jun    │   Jul    │
├────────────────────────┼──────────┴──────────┴──────────┴──────────┴──────────┤
│ ● Onboarding redesign  │    ██ Onboarding ██████████                          │
│   ● Pesquisa com...    │    █✓ Pesq██                                         │
│   ● Protótipo hi-fi    │       ██ Protótipo ██                                │
│   ● Implementação      │              ██ Implementação ██                     │
│ ● Módulo de relatórios │    ████ Relatórios ██████████████                     │
│   ...                  │                                                      │
├────────────────────────┴──────────────────────────────────────────────────────┤
│  │Hoje (26 mar)  ● No prazo  ● Em risco  ● Atrasado  ● Planejado            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Diferenças em relação à implementação atual:
- Layout **HTML table/div** em vez de Recharts BarChart (controle total sobre label, dot, checkmark)
- **Health dot** colorido à esquerda de cada nome
- **Label dentro da barra** (nome truncado + ✓ se done)
- **Milestones indentados** visualmente (padding-left)
- **Linha "Hoje"** como borda vertical absoluta com label na legenda
- **Legenda** no rodapé: No prazo (verde), Em risco (laranja), Atrasado (vermelho), Planejado (cinza)
- **Cores por health** (projetos) e por status (milestones), não status genérico
- Barras com cantos arredondados e opacidade controlada

### Plano de Implementação

#### 1. Estender `GanttItem` com `completion_pct`

Em `types.ts`, adicionar campo opcional ao tipo:
```typescript
export interface GanttItem {
  // ... existentes ...
  completion_pct?: number; // Para mostrar ✓ ou % na barra
}
```

Em `useGanttData.ts`, mapear `completion_pct` do projeto:
```typescript
items.push({ ...project bar..., completion_pct: project.completion_pct });
```

#### 2. Criar componente compartilhado `GanttTimeline`

Arquivo: `src/modules/projects/components/GanttTimeline.tsx`

Componente puro que renderiza a timeline via HTML/CSS (sem Recharts):
- **Props**: `items: GanttItem[]`, `excludedCount: number`, `showLegend?: boolean`, `onItemClick?: (item) => void`
- **Layout**: CSS Grid com coluna fixa (nomes) + coluna fluida (barras)
- **Header row**: "PROJETO / MILESTONE" | meses calculados do range
- **Name column**: health dot + nome (milestones indentados com `pl-4`)
- **Bar area**: posicionamento via `left%` / `width%` relativo ao range total
- **Bar label**: nome truncado dentro da barra, ✓ se `status === 'done'`
- **Today line**: `position: absolute`, linha vertical com label
- **Legend**: footer com dots coloridos + labels

Cores:
| Contexto | Cor |
|----------|-----|
| on_track / done | `bg-emerald-400` |
| at_risk | `bg-amber-400` |
| late | `bg-red-300` |
| planned / todo | `bg-stone-300` |
| in_progress (milestone) | `bg-emerald-400` (segue health do parent) |

#### 3. Refatorar `ProjectGanttChart.tsx`

Simplificar para wrapper do `GanttTimeline`:
- Manter props `items` e `excludedCount`
- Passar `showLegend={true}`, `onItemClick` com navegação
- Remover toda lógica Recharts

#### 4. Refatorar `MilestoneGanttChart.tsx`

Converter milestones para `GanttItem[]` internamente e usar `GanttTimeline`:
- Manter props atuais (`milestones`, `projectStartDate`, `projectDueDate`)
- Converter milestones em GanttItems com `type: 'milestone'`
- Passar `showLegend={false}` (dentro de card do projeto, legenda desnecessária)

#### 5. Testes

Atualizar seletores nos testes existentes. O comportamento visível (nomes, tooltips, cores) permanece testável via text content.

### Componentes reutilizados (sem duplicação)

| Componente | Uso |
|---|---|
| `ProjectHealthBadge` (dotOnly) | Dot no nome do item |
| `GanttTimeline` (novo, compartilhado) | Usado por ambos os charts |

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/modules/projects/types.ts` | Editar (+`completion_pct` em GanttItem) |
| `src/modules/projects/hooks/useGanttData.ts` | Editar (mapear completion_pct) |
| `src/modules/projects/components/GanttTimeline.tsx` | **Novo** — componente compartilhado |
| `src/modules/projects/components/ProjectGanttChart.tsx` | Reescrever (wrapper) |
| `src/modules/projects/components/MilestoneGanttChart.tsx` | Reescrever (wrapper) |

### Decisão técnica: HTML/CSS vs Recharts

A referência exige labels dentro das barras, dots no eixo Y, checkmarks e today line com label. Recharts não suporta esses elementos nativamente sem hacks extensos. A implementação via **CSS Grid + absolute positioning** é mais simples, performática e fiel à referência.

