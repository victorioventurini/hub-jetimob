

## Aba "Atuação na BU" no perfil do usuário — Projetos, KRs/Iniciativas e KPIs

Adicionar à página `src/pages/UserProfile/index.tsx` uma seção em abas que mostre o envolvimento real do usuário na BU atual, **reutilizando 100% dos componentes e hooks já existentes** (sem duplicar nenhum visual ou lógica).

### Pré-checklist canônico executado
- `TECHNICAL_CONTEXT_REGISTRY.md` — perfil público, BU isolation, módulo Projetos v1.4
- `IDENTITY_CONVENTION.md` — `profile_id` é a identidade; `owner_user_id` em KPIs/KRs/Iniciativas referencia `profiles.id`
- `PERMISSIONS_AND_RBAC_MODEL.md` — perfil público respeita `v_bu_active_profiles` + `get_profile_with_privacy`
- `DATA_MODEL_REGISTRY.md` — `projects.owner_id`, `kpi_metrics.owner_user_id`, `okr_team_objectives.owner_user_id`, `okr_team_key_results.owner_user_id`+`co_responsibles[]`, `okr_initiatives.owner_user_id`
- `mem://features/projects/holistic-module-architecture-v2` — uso canônico de `useProjects({ owner_id })` + `ProjectCard`/`ProjectStatusSummary`
- `mem://standards/query-key-prefix-standard` — keys novas adicionadas em `queryKeys.publicProfile.*`
- `mem://standards/query-optimization-standard` — sem `select('*')`, somente colunas necessárias
- `mem://standards/soft-delete-policy-v1` — todas queries filtram `deleted_at IS NULL`

### Fonte da informação (reaproveitando o que já existe)

| Domínio | Hook reutilizado | Componente reutilizado |
|---|---|---|
| Projetos onde é owner | `useProjects({ owner_id: profile.id })` (já filtra por BU) | `ProjectCard`, `ProjectStatusSummary` |
| KRs (owner ou co-responsável) | `useUserOkrs(profile.id)` (**já existe** em `usePublicProfile.ts`, hoje não é consumido) | `OkrProgressBar` + linha compacta |
| Objetivos onde é owner | mesmo `useUserOkrs` | linha compacta com link para `/okrs?objective=…` |
| Iniciativas onde é owner | **novo hook** `useUserInitiatives(profile.id)` — query única em `okr_initiatives` filtrando `owner_user_id` + `bu_id` + `deleted_at IS NULL` + join enxuto com `kr` | `InitiativeCard` (`showKrInfo`) já existente |
| KPIs onde é owner | `useUserKpis(profile.id)` (já existe) | mantém o item compacto atual (KpiCard exige shape rico que `useUserKpis` não traz; **não vamos enriquecer agora** pra evitar duplicar `useKpiData`) |
| KPIs onde é contribuidor | **novo hook** `useUserContributedKpis(profile.id)` — query única em `kpi_contributors` com join enxuto em `kpi_metrics` (id, name, unit, team) | mesmo item compacto dos KPIs próprios + badge "Contribuidor" |

Nada de novos cards visuais. Onde KpiCard rico não cabe, usamos a linha compacta que já está no `UserProfile` hoje.

### Layout proposto

Substituir o card "KPIs" inline atual por um bloco **`<Tabs>`** (componente shadcn já existente) logo abaixo de "Informações Profissionais", dentro da coluna `lg:col-span-2`:

```
[Tabs]
 ├─ Visão geral   (4 contadores: Projetos · OKRs · KRs · KPIs)
 ├─ Projetos      (ProjectStatusSummary + grid de ProjectCard)
 ├─ OKRs & KRs    (Objetivos + KRs com OkrProgressBar)
 ├─ Iniciativas   (InitiativeCard list, showKrInfo)
 └─ KPIs          (próprios + contribuídos, com badge)
```

- "Visão geral" usa só números agregados (length de cada lista) — zero query nova além das que já vão rodar.
- Cada aba só faz fetch quando ativada (`enabled` controlado por `activeTab`) — evita N requests no load inicial.
- Empty state padrão por aba: ícone + texto curto ("Nenhum projeto sob responsabilidade nesta BU").
- Loading: `Skeleton` já usado no resto da página.

### Mudanças por arquivo

**1. `src/hooks/usePublicProfile.ts`** (estender, não duplicar)
- Adicionar `useUserInitiatives(profileId)` — segue o padrão dos hooks já no arquivo, com query key `queryKeys.publicProfile.initiatives(profileId, buId)`.
- Adicionar `useUserContributedKpis(profileId)` — query em `kpi_contributors` com join enxuto, key `queryKeys.publicProfile.contributedKpis(profileId, buId)`.
- `useUserOkrs` já existe; só passa a ser consumido.

**2. `src/lib/queryKeys/index.ts`** (estender `publicProfile`)
- Adicionar `initiatives(profileId, buId)` e `contributedKpis(profileId, buId)` no helper já existente.

**3. `src/pages/UserProfile/index.tsx`**
- Importar `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (shadcn já no projeto).
- Importar `useProjects` (de `@/modules/projects/hooks`), `ProjectCard`, `ProjectStatusSummary`.
- Importar `InitiativeCard` (de `@/modules/okrs/components/initiatives`).
- Importar `OkrProgressBar` (de `@/modules/okrs/components/OkrProgressBar`).
- Substituir o bloco KPIs inline atual pelo `<Tabs>` com 5 abas conforme layout acima.
- Manter sidebar (Gestor, Squads, Contato, Redes Sociais) inalterada.

### Regras de negócio respeitadas

- Toda query é BU-scoped (`useBuScopedSupabase` ou `useOptionalBuClient`) e filtra por `bu_id = currentBu.id` + `deleted_at IS NULL`.
- Identidade canônica: usa `profile.id` (não `auth.uid`, não `user_id`).
- KRs incluem `owner_user_id = profileId OR co_responsibles cs {profileId}` (idêntico ao padrão já em `usePublicProfile.useUserOkrs`).
- Projeto reutiliza filtro server-side `owner_id` que já existe em `useProjects`.
- Sem novos componentes visuais; navegação via `<Link>` para `/projects/:id`, `/okrs?...`, `/kpis?kpi=…` (padrão atual da página).

### Performance e cache

- Lazy fetch por aba (`enabled: activeTab === 'projects'`, etc.).
- Query keys distintas por `(profileId, buId)` evitam colisão em troca de BU/usuário.
- Reaproveita cache global de Projects/OKRs já populado em outras telas para o mesmo `profileId`.

### Validação manual pós-implementação

1. Acessar `/users/<id>` de um usuário com projetos/KRs/iniciativas/KPIs na BU atual → cada aba mostra dados corretos.
2. Trocar de BU → contagens e listas refletem só a BU ativa (mesmo perfil pode ter membership em outras).
3. Usuário sem dados em alguma aba → empty state amigável, sem skeleton infinito.
4. Usuário externo (`employment_status === 'external'`) → redirect via `useExternalProfileRedirect` continua funcionando antes de qualquer fetch.
5. Clique em ProjectCard → navega para `/projects/:id`. Clique em InitiativeCard → comportamento atual preservado. Clique em KR linha → `/okrs?kr=<id>`.

### Arquivos afetados (resumo)

- `src/hooks/usePublicProfile.ts` (adicionar 2 hooks)
- `src/lib/queryKeys/index.ts` (adicionar 2 entradas em `publicProfile`)
- `src/pages/UserProfile/index.tsx` (refator visual: introduzir Tabs e consumir hooks)

Zero arquivos novos de componente. Zero duplicação. Toda a parte visual é composição dos componentes canônicos já existentes (`Tabs`, `ProjectCard`, `ProjectStatusSummary`, `InitiativeCard`, `OkrProgressBar`).

