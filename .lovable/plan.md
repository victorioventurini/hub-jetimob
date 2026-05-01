## Objetivo

Adicionar ao Step 1 do Check-in Individual o card **"Sua semana até aqui"** — bloco read-only que mostra o que o colaborador **já fez** desde segunda-feira da semana corrente e o que **ainda falta**. Substitui o `CollaboratorSnapshot` (bolinhas) atualmente entre `RitualGreeting` e `CollaboratorCheckinTrail`.

Decisões herdadas das respostas:
- Entregar **5 categorias** na Seção 1 (Indicadores, Projetos, Iniciativas, KRs, Bloqueios registrados). "Bloqueios resolvidos" e "Pedidos de ajuda" ficam fora — não há campo persistido para isso (ver mais abaixo).
- Card 100% read-only, sem CTA, sem links.
- Card e Trilha consomem o **mesmo hook**, garantindo consistência numérica e de ordem.

## Ordem final do Step 1

1. `RitualGreeting` (já existe)
2. **`CollaboratorWeekActivity` (novo card)**
3. `CollaboratorCheckinTrail` (já existe)
4. Footer "Começar →" (já está no `WizardFirstStepFooter`)

`CollaboratorSnapshot` é removido do render do Step 1 (arquivo permanece no repo, fora de uso — sem deletar para não quebrar imports residuais; pode ser limpo num passe futuro).

## Restrições do schema (importantes)

| Sinal pedido | O que existe no DB | Decisão |
|---|---|---|
| KPIs atualizados na semana | `kpi_values.created_by`, `kpi_values.created_at`, join em `kpis.name` | ✅ Implementar |
| KRs com check-in na semana | `okr_checkins.user_id`, `okr_checkins.created_at`, `okr_checkins.confidence`, join em `okr_team_key_results.title` | ✅ Implementar (inclui confiança média) |
| Milestones marcados como `done` na semana | `project_milestones.status='done' AND updated_at >= weekStart`, join em `name` (proxy aceitável) | ✅ Implementar com nota: usa `updated_at` como proxy (sem histórico de status) |
| Iniciativas atualizadas na semana | `okr_initiatives.updated_at >= weekStart` filtrando owner/contributor (proxy) | ✅ Implementar com proxy |
| Bloqueios registrados na semana | `okr_checkins.blockers IS NOT NULL/'' AND created_at >= weekStart` | ✅ Implementar; nomes = títulos dos KRs |
| Bloqueios resolvidos | Sem coluna `resolved_at`/`resolved_by` em `okr_checkins` | ❌ **Omitir** |
| Pedidos de ajuda | `helpNeeded` é só estado local em `CollaboratorReflectionStep` (não persiste) | ❌ **Omitir** |

Pendentes (Seção 2) reaproveitam exatamente as mesmas fontes que a Trilha hoje calcula:
- `kpisToUpdate.filter(k => k.needs_update)` → "X indicadores para atualizar"
- `useCollaboratorOpeningSignals → projectsTotal − projectsHealthy` → "X projeto(s) com milestone pendente"
- `useCollaboratorInitiativesSignal → initiativesTotal − initiativesOnTrack` → "X iniciativa(s) sem atualização"
- `krs` em atenção (mesma regra do `stats.krsAttention` de hoje) → "X KR(s) sem check-in esta semana"

## Arquivos novos

```
src/modules/okrs/components/wizards/collaborator/
  ├── CollaboratorWeekActivity.tsx              (novo — card)
  └── hooks/
      └── useCollaboratorWeekActivity.ts        (novo — hook compartilhado)
```

> Pasta `hooks/` é nova dentro de `collaborator/`. Mantém o hook próximo dos consumidores (Trail + WeekActivity), seguindo o padrão dos demais hooks específicos do step.

## Hook `useCollaboratorWeekActivity`

### Assinatura

```ts
interface UseCollaboratorWeekActivityArgs {
  effectiveUserId: string | null;
  cycleId: string | null;
  /** KRs já carregados pelo wizard (evita refetch) */
  krs: WizardKr[];
  /** KPIs já carregados pelo wizard (evita refetch) */
  kpisToUpdate: (KpiForWizard | KpiForWizardV2)[];
}

interface CollaboratorWeekActivity {
  activities: WeekActivityRow[];   // Seção 1
  pending: WeekPendingRow[];       // Seção 2
  hasAnyActivity: boolean;
  isAllCaughtUp: boolean;
  isLoading: boolean;
}

interface WeekActivityRow {
  type: 'kpis' | 'projects' | 'initiatives' | 'krs' | 'blockers_registered';
  count: number;                   // total real
  itemNames: string[];             // já truncado a 3
  remainingCount: number;          // 0 quando count <= 3
  extraInfo?: string;              // ex: "Confiança média: Média" (apenas para 'krs')
}

interface WeekPendingRow {
  type: 'kpis' | 'projects' | 'initiatives' | 'krs';
  count: number;
  label: string;                   // ex: "indicadores para atualizar"
}
```

### Composição

- **Reaproveita** `useCollaboratorOpeningSignals` e `useCollaboratorInitiativesSignal` para pendentes de projetos/iniciativas (não duplicar queries).
- **Novas queries enxutas** (BU-scoped, com prefixo de query key próprio em `src/lib/queryKeys/okrs.ts`):
  1. `kpi_values` da semana → `select('id, kpi_id, kpis!inner(id, name)').eq('created_by', effectiveUserId).gte('created_at', weekStartUtc)` deduplicado por `kpi_id`.
  2. `okr_checkins` da semana → `select('id, kr_id, confidence, blockers, okr_team_key_results!inner(id, title)').eq('user_id', effectiveUserId).gte('created_at', weekStartUtc)` (+ `is('deleted_at', null)` no KR). Deduplicar por `kr_id` para nomes; agregar `confidence` para média.
  3. `project_milestones` `status='done'` da semana → `select('id, name, project:projects!inner(id, owner_id)').eq('status', 'done').eq('project.owner_id', effectiveUserId).gte('updated_at', weekStartUtc).is('deleted_at', null)`.
  4. `okr_initiatives` atualizadas na semana → reusa filtro de `useCollaboratorInitiativesSignal` (owner OR contributor + cycle), porém com `select('id, name, updated_at').gte('updated_at', weekStartUtc)`.

### Janela temporal

- Helper local `getWeekStart(now)` → segunda-feira 00:00 **na timezone do navegador do usuário** (não há `useBuTimezone` no projeto; manter consistente com a UI dos demais steps que também usam horário local). Convertido para ISO antes de enviar à query.

### Confiança média (KRs)

- `confidence` é enum `okr_confidence` (`low|medium|high`). Mapear para 1/2/3, calcular média numérica, mapear de volta:
  - `< 1.5` → "Baixa"
  - `< 2.5` → "Média"
  - `>= 2.5` → "Alta"
- Quando 0 check-ins na semana, **não** inclui `extraInfo`.

### Truncagem de nomes

- Helper puro `pickTopNames(names: string[], max = 3)` → `{ itemNames, remainingCount }`. Reutilizado pelas 5 categorias.

### Regras de visibilidade

- Cada `WeekActivityRow` só entra em `activities` se `count > 0`.
- Ordem fixa: `kpis → projects → initiatives → krs → blockers_registered`.
- `pending` segue ordem `kpis → projects → initiatives → krs`; só entra se `count > 0`.
- `hasAnyActivity = activities.length > 0`.
- `isAllCaughtUp = pending.length === 0`.

### Consistência com a trilha

- A trilha continua sendo construída em `CollaboratorContextStep` (memo `trailSteps`). Os números de pendentes que ela usa são **exatamente** os mesmos consumidos por `pending` no novo hook (mesmas fontes: KPIs `needs_update`, signals de projetos/iniciativas, `stats.krsAttention`). Não há reescrita da trilha — apenas garantia de que ambos derivem dos mesmos inputs.

## Componente `CollaboratorWeekActivity.tsx`

- Estrutura visual baseada nos cards já usados nos steps (`rounded-lg border bg-card p-5`), tokens semânticos do design system. Nada de cores hardcoded.
- Título fixo: **"Sua semana até aqui"**.
- **Seção 1**:
  - Para cada `activity`, render:
    ```
    [icon] [Ação resumida]
           [nomes truncados]  · ['e mais X' se remainingCount>0]  · [extraInfo se houver]
    ```
  - Ícones (lucide, já em uso no projeto):
    - `kpis` → `BarChart3`
    - `projects` → `FolderKanban`
    - `initiatives` → `Rocket`
    - `krs` → `Target`
    - `blockers_registered` → `AlertTriangle` (token `text-status-orange`)
  - Empty state da Seção 1 (`!hasAnyActivity`): "Ainda não há atividade registrada esta semana." (tom neutro, sem cor de erro).
- **Separador**: `border-t border-border/60 my-4`.
- **Seção 2**:
  - Título dinâmico: "Ainda falta:" se `hasAnyActivity` else "Para revisar:".
  - Lista `pending` como bullets (`<ul className="list-disc pl-5">`).
  - Se `isAllCaughtUp`: substituir a seção por
    ```
    [CheckCircle2 text-status-green] Tudo em dia esta semana
    Revise e confirme no check-in.
    ```
- `React.memo` no componente (lista derivada).
- 100% read-only: sem `<button>`, `<a>`, nem handlers de click.

### Loading & responsividade

- Enquanto `isLoading`, render `<Skeleton>` com a altura aproximada do card (~180 px) — mantém o "salto" visual mínimo.
- Mobile (<640 px): nomes em `flex-wrap` separados por `·`; sem truncar texto (regra do prompt).

## Integração no Step 1

`src/modules/okrs/components/wizards/collaborator/CollaboratorContextStep.tsx`:
1. Remover `<CollaboratorSnapshot ... />` do render.
2. Inserir `<CollaboratorWeekActivity ... />` no mesmo lugar.
3. Passar `effectiveUserId`, `cycleId`, `krs`, `kpisToUpdate` para o componente; o componente cria o hook internamente.
4. Não tocar em `trailSteps` — continua usando `stats`/`signals`/`initiativesSignal` exatamente como hoje (mesmas fontes do `pending` do novo hook).

## Conformidade com o pré-checklist (TCR + canônicos)

- **BU isolation**: todas as queries via `useBuScopedSupabase` (BU implícito) + `enabled` gating sincrônico em `buId`.
- **Identidade**: o card lê `effectiveUserId` (suporta admin revisando outro). Sem mutations → sem necessidade de `realProfileId`.
- **Soft deletes**: todos os joins filtram `deleted_at IS NULL` (e `cancelled_at IS NULL` em `okr_team_key_results`).
- **Query optimization**: nada de `select('*')`; colunas explícitas em todas as queries; `staleTime: 60s`.
- **Query keys**: novos prefixos em `src/lib/queryKeys/okrs.ts` (`weekActivityKpis`, `weekActivityCheckins`, `weekActivityMilestones`, `weekActivityInitiatives`) — nunca arrays soltos.
- **Reuso**: hooks existentes (`useCollaboratorOpeningSignals`, `useCollaboratorInitiativesSignal`) consumidos pelo novo hook; sem reimplementar suas queries.
- **Memoization**: `React.memo` no componente; `useMemo` no card para `activities`/`pending`.
- **Standards de wizard**: card vive dentro do `children` do `WizardStepScaffold` já existente (Step 1 já foi padronizado); não cria novo scaffold/footer.
- **Sem CHECK constraints**, sem migrations, sem alteração de RLS.

## Arquivos editados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorContextStep.tsx` (swap snapshot → week activity).
- `src/lib/queryKeys/okrs.ts` (4 novos prefixos).
- `src/modules/okrs/components/wizards/collaborator/index.ts` (export do novo componente, se padrão local exigir).

## Arquivos novos

- `src/modules/okrs/components/wizards/collaborator/CollaboratorWeekActivity.tsx`
- `src/modules/okrs/components/wizards/collaborator/hooks/useCollaboratorWeekActivity.ts`

## Não-objetivos (preservação)

- Não alterar Steps 2–7, lógica de rascunho, RLS, sidebar de navegação ou footer global.
- Não persistir novos campos (`help_needed`, `blockers_resolved`) — fora de escopo desta entrega.
- Não tocar em `CollaboratorSnapshot.tsx` além de remover seu uso (mantém arquivo até limpeza futura).

## Validação visual

- Em `/rituals/collaborator-checkin?user=…`:
  - Sem nenhum trabalho na semana: Seção 1 com mensagem neutra; Seção 2 com pendentes ou "Tudo em dia ✓".
  - Após criar 1 `kpi_value` na semana: linha "Atualizou 1 indicadores" com nome do KPI; pendentes diminuem 1.
  - Os números do card e os números da trilha ("① Indicadores — X para atualizar" etc.) **batem exatamente** para todas as categorias.
