# Plano: Aba Contribuição Robusta — `/teams/:id?tab=contribution`

## Decisões aprovadas pelo usuário
1. **Substituir** o CTA atual pela aba completa (não criar rota nova)
2. Toggle "Incluir sub-times" — **desligado** por padrão
3. Visibilidade — **qualquer membro da BU** (sem gating por liderança)
4. **Sparkline simples** de evolução incluído na v1

## Pré-checklist canônico ✅
- TCR (BU isolation, soft-delete, query keys, RBAC, URL state) — respeitado
- `useBuScopedSupabase` para queries operacionais
- `useUrlState` para subtab/filtros (links compartilháveis — Regra #7)
- Reuso de hooks existentes: `useTeamContributionView`, `useTeamObjectives`, `useTeamObjectiveContributions`, `useTeamRituals`, `useProjects`, `useKpis`
- Memoization mandatória (React.memo) para listas
- Soft-delete: `.is('deleted_at', null)` em todas as agregações

## Arquitetura

### 1. `TeamDetailPage.tsx` — substituir TabsContent "contribution"
Substituir o card CTA (linhas 262-277) por `<TeamContributionTab teamId={team.id} teamName={team.name} />`.

### 2. Novo componente: `src/modules/teams/components/contribution/TeamContributionTab.tsx`
Container principal com sub-navegação via URL state (`subtab` + `include_subteams`):

```tsx
const [subtab, setSubtab] = useUrlState({ key: 'subtab', defaultValue: 'overview' });
const [includeSubteams, setIncludeSubteams] = useUrlState({ key: 'include_subteams', defaultValue: 'false' });
```

Sub-tabs:
- **overview** — Visão Geral (KPI cards + sparkline + insights)
- **team-okrs** — OKRs do Time (próprios)
- **shared-okrs** — OKRs Compartilhados (recebidos + contribuídos)
- **org-contribution** — Contribuição Organizacional (lista de Org Objectives impactados — reuso da view existente)
- **projects-kpis** — Projetos & KPIs vinculados

Header da aba: toggle `Switch` "Incluir sub-times" (off por padrão) + filtro de ciclo (reuso `CycleSelect`).

### 3. `TeamContributionOverview.tsx` (sub-tab principal)
Grid de KPI cards + sparkline:
- **Card 1** — Total OKRs próprios (count + breakdown por status efetivo)
- **Card 2** — OKRs compartilhados (recebidos como contribuidor)
- **Card 3** — Org Objectives impactados (count distinct via `useTeamContributionView`)
- **Card 4** — Projetos ativos vinculados a KRs do time
- **Sparkline** — Evolução do healthscore médio dos últimos 8 check-ins (linha simples via Recharts `Line` + `ResponsiveContainer`, altura 60px, sem eixos)
- **Insights** — Reuso de `TeamContributionInsights` (já existente)

### 4. `TeamSharedOkrsBlock.tsx` (sub-tab shared-okrs)
Duas seções:
- **Recebidos** — OKRs onde o time é dono e tem contribuidores externos (via `okr_team_objective_contributors` com `objective.team_id = teamId`)
- **Contribuídos** — OKRs de outros times onde este time aparece em `okr_team_objective_contributors`
Reuso de `ContributingOkrCard` para listagem.

### 5. `useTeamContributionAnalytics.ts` (novo hook agregador)
```ts
export function useTeamContributionAnalytics(teamId: string, opts: { includeSubteams: boolean; cycleId?: string })
```
- Resolve lista de teamIds (próprio ± descendentes via `parent_team_id` recursivo — reuso do padrão `team-filter-includes-subteams`)
- Retorna: `{ ownOkrsCount, sharedReceivedCount, sharedContributedCount, orgObjectivesImpactedCount, activeProjectsCount, healthscoreSeries }`
- `healthscoreSeries`: agrega `okr_checkins.healthscore` dos últimos 8 check-ins (média ponderada por KR)
- Query key: `teamsKeys.contributionAnalytics(teamId, includeSubteams, cycleId)` em `src/lib/queryKeys/teams.ts`

### 6. Migração da rota standalone
Manter `/okrs/team-contribution/:teamId` funcionando (deep-links externos), mas a página `TeamContributionPage` passa a ser uma **redireção** para `/teams/:id?tab=contribution&subtab=org-contribution` para manter SSOT.

> Alternativa considerada: deixar ambas independentes. **Rejeitada** — duplicação de lógica viola DRY e cria divergência de UX.

## Arquivos a criar
- `src/modules/teams/components/contribution/TeamContributionTab.tsx`
- `src/modules/teams/components/contribution/TeamContributionOverview.tsx`
- `src/modules/teams/components/contribution/TeamSharedOkrsBlock.tsx`
- `src/modules/teams/components/contribution/TeamHealthSparkline.tsx`
- `src/modules/teams/hooks/useTeamContributionAnalytics.ts`

## Arquivos a editar
- `src/modules/teams/pages/TeamDetailPage.tsx` — substituir TabsContent "contribution"
- `src/lib/queryKeys/teams.ts` — adicionar `contributionAnalytics` key
- `src/modules/okrs/pages/TeamContributionPage.tsx` — converter em redirect
- `.lovable/memory/features/okrs/` — criar memória `team-contribution-tab-standard.md`

## Validações
- [ ] Toggle "Incluir sub-times" persiste em URL e expande corretamente via `parent_team_id`
- [ ] Sparkline renderiza com 0 dados (estado vazio) e com 1 ponto (degenerate)
- [ ] Sub-tab inicial é `overview` (default URL state)
- [ ] Membros sem permissão de liderança veem a aba (qualquer membro da BU)
- [ ] Soft-delete respeitado em todas as agregações
- [ ] Query keys via prefix helpers (Regra #5)
- [ ] Sem `select('*')` (Regra #4)
- [ ] Navegação interna via `<Link>` (Regra #9)

## Fora do escopo (v2)
- Comparativo cross-time (benchmark com outros times da BU)
- Heatmap de contribuição por colaborador
- Exportação PDF/CSV
- Filtros avançados (por área, por tipo de OKR)
