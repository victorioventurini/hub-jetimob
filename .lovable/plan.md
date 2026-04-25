# Padronizar UI de KRs em OKRs compartilhadas (paridade com Team KRs)

## Contexto

A imagem 2 mostra a KR contribuidora `teste` no card compartilhado renderizada de forma minimalista — só **chevron + título + barra de progresso**. Já a imagem 1 mostra como uma KR **do próprio time** aparece no `ObjectiveListItem` canônico: status calculado, valor atual/target, contagem de iniciativas, badges, **botões Histórico/Editar/Atualizar**, avatar do responsável e seções "Iniciativas (N)" + "Projetos vinculados" com menu "..." por iniciativa.

`InitiativesList` e `ProjectsForKrSection` já estão corretas dentro do `ContributingOkrCard` (área expandida) — não mudam. **O gap está na linha-resumo da KR contribuidora**, que não expõe os controles canônicos do `KeyResultRow` de `ObjectiveListItem`.

## Pré-checklist canônico (executado)

- ✅ `mem://features/okrs/contributor-kr-uses-modal` — KR contribuidora é `okr_team_key_results` (Team KR); todo o canon de Team KR vale sem nova RLS/schema
- ✅ `mem://features/okrs/shared-okr-contributor-view-standard` — objetivo é read-only; **as KRs próprias do time contribuidor são editáveis pelo próprio time contribuidor**
- ✅ `mem://standards/users/team-filter-includes-subteams` — `BuUserSelect` com `teamId={currentTeamId}` + `includeSubteams` (já garantido em `TeamKrFormDialog` e `InitiativeDialog`)
- ✅ `mem://auth/okr-ownership-enforcement-rls` — RLS de `okr_team_key_results` aceita edit/checkin/delete pelo time dono da KR (= `currentTeamId` no caso contribuidor)
- ✅ `mem://standards/frontend-memoization-standard` — extração mantém `React.memo`
- ✅ `mem://standards/query-optimization-standard` — toda query nova segue `select` explícito
- ✅ `ObjectiveListItem.tsx` (linhas 535–751) é a SSOT visual da linha de Team KR
- ✅ Hooks/dialogs canônicos reusáveis sem alteração: `TeamKrFormDialog` (edit), `CheckinDialog`, `KrHistoryDialog`, `useKrInitiativesCount`, `useKrPrimaryKpiBatch`, `STATUS_CONFIG`/`mapRagToCalculated`

## Princípio

**Reuso 100% — zero código descentralizado.** Em vez de duplicar a linha de KR no `ContributingOkrCard`, **extrair `KeyResultRow` de `ObjectiveListItem.tsx` para um componente canônico próprio** e consumi-lo nos dois lugares.

## Mudanças

### 1. Extrair `KeyResultRow` para componente canônico
- Mover `KeyResultRow` (linhas 505–752) + tipos (`KeyResult`, `KeyResultRowProps`) para **`src/modules/okrs/components/dashboard/KeyResultRow.tsx`**
- Aplicar `React.memo`
- Reexportar via `dashboard/index.ts`
- `ObjectiveListItem.tsx` passa a importar do novo arquivo (sem mudança comportamental)

### 2. Refatorar `ContributingOkrCard.tsx` para consumir `KeyResultRow`
- Remover o `<button>` minimalista interno (linhas 213–238) e a área expandida manual (linhas 240–261) — `KeyResultRow` já entrega tudo (chevron, expand, `InitiativesList`, `ProjectsForKrSection`)
- Para cada KR contribuidora:

```tsx
<KeyResultRow
  kr={kr}
  type="team"
  objectiveTitle={objective.title}
  objectiveStatus={objective.status}
  teamName={objective.team?.name}
  canEdit={canContribute}
  canCheckin={canContribute}
  hasPrimaryKpi={primaryKpiMap.get(kr.id)?.hasPrimaryKpi}
  primaryKpiInfo={primaryKpiMap.get(kr.id)?.info}
  onEdit={() => setEditingKr(kr)}
  onCheckin={() => setCheckinKr(kr)}
  onShowHistory={() => setHistoryKr(kr)}
/>
```

- Adicionar dialogs canônicos (cópia do padrão de `ObjectiveListItem` linhas 421–500): `TeamKrFormDialog` em modo edit, `CheckinDialog`, `KrHistoryDialog`
- Estado local: `editingKr`, `checkinKr`, `historyKr`

### 3. Hidratar campos faltantes no payload contribuidor
A query `useSharedObjectivesWithKrs` em `TeamSharedOkrsBlock.tsx` (linhas 23–43) precisa trazer também:
- `owner_user_id, updated_at, type` — necessários para `KrHistoryDialog`, `KrPrimaryKpiBadge`, badge owner
- Embutir `owner:profiles!owner_user_id (id, display_name, photo_url)` na mesma query
- Mantém `select` explícito por coluna
- Verificar a mesma necessidade em `useTeamContributedObjectives` (consumido pelo `TeamOkrSections`); garantir os campos extras na query subjacente

### 4. KPI primária (badge + valor efetivo)
- Adicionar chamada a `useKrPrimaryKpiBatch(contributedKrs.map(k => k.id))` dentro do `ContributingOkrCard`
- Passar `hasPrimaryKpi`/`primaryKpiInfo` para cada `KeyResultRow` — exatamente como `ObjectiveListItem` faz

### 5. Atualizar tipo `KeyResult` no card
- Substituir o tipo inline em `ContributingOkrCardProps` (linhas 32–42) pelo tipo canônico `KeyResult` exportado de `KeyResultRow.tsx`

### 6. Documentação canônica
Atualizar `mem://features/okrs/contributor-kr-uses-modal.md` adicionando seção **"Linha da KR usa `KeyResultRow` canônico"**: registra que KR contribuidora reusa o mesmo `KeyResultRow` que Team KR (Histórico/Editar/Check-in/avatar/KPI primária/contagem de iniciativas), com `canEdit={canContribute}`/`canCheckin={canContribute}` — proibido reimplementar linha de KR localmente em qualquer card de OKR compartilhado.

## O que **não muda** (já está canônico)

- `TeamKrFormDialog` para criação ("Adicionar KR") com `BuUserSelect` escopado por `teamId={currentTeamId}` + `includeSubteams`
- `InitiativesList` + `ProjectsForKrSection` com `krTeamId={currentTeamId}` e `krKind="team"`
- `InitiativeDialog` com selects canônicos escopados por `krTeamId`
- RLS de `okr_team_key_results`, `okr_initiatives`, `project_krs`, `okr_checkins` — todas aceitam o time dono da KR (= time contribuidor)

## Invalidações de cache

Reusar as mesmas chaves que `ObjectiveListItem` já invalida (via mutações dentro de `TeamKrFormDialog`/`CheckinDialog`). Adicionalmente, invalidar a query local `['shared-objectives-with-krs', ...]` em `TeamSharedOkrsBlock` para refletir mudança de `current_value`/`status` na KR contribuidora.

## Resultado

Paridade visual e funcional total entre KRs do próprio time e KRs contribuidoras em OKRs compartilhadas, **sem duplicar código** — `KeyResultRow` vira o componente canônico único consumido por `ObjectiveListItem` e `ContributingOkrCard`.