## Objetivo
Substituir o badge genérico "Time" por **nome do time real** (ex: "Marketing", "RevOps") em **dois locais**:
1. Popover de busca de KRs (ProjectKrLinkSection + MilestoneKrLinkSection)
2. Chips de KRs já vinculados (mesmas seções)

Org KRs continuam exibindo "Org" (sem mudança).

## Conformidade verificada
- ✅ TCR Projects v1.4 + `mem://features/projects/kr-linking-standard`
- ✅ `DATA_MODEL_REGISTRY`: `okr_team_objectives.team_id → teams.id` (FK existente)
- ✅ Soft-Delete v1.1: queries mantêm `.is('deleted_at', null)`
- ✅ BU Isolation: `.eq('bu_id', currentBuId)` preservado
- ✅ Query Optimization: colunas explícitas (sem `select('*')`)
- ✅ Query Keys via `projectsKeys.*` (sem mudança de chave necessária — payload da mesma key)

## Arquivos a modificar

### 1. `src/modules/projects/hooks/useKrsForLinking.ts`
- Adicionar `team:teams!okr_team_objectives_team_id_fkey(id, name)` no select do nested objective (Team KRs apenas).
- Mapear `team_name: kr.objective?.team?.name ?? null` no retorno.

### 2. `src/modules/projects/hooks/useProject.ts`
- Em `PROJECT_DETAIL_FIELDS` (ou equivalente), adicionar relação aninhada para trazer `team.name` via `key_result.objective.team` quando `kind = 'team'`.
- Mapear `team_name` no array `krs` de `ProjectWithRelations`.

### 3. `src/modules/projects/hooks/useMilestoneKrs.ts`
- Mesma adição da relação `team` no nested objective.
- Mapear `team_name` no payload.

### 4. `src/modules/projects/types.ts`
- `KrForLinking` (no hook): adicionar `team_name: string | null`.
- `ProjectWithRelations.krs[]`: adicionar `team_name: string | null`.
- Tipo de milestone KR link: adicionar `team_name: string | null`.

### 5. `src/modules/projects/components/ProjectKrLinkSection.tsx`
- **Popover**: badge dos resultados agrupados por objetivo → `kind === 'team' ? (teamName ?? 'Time') : 'Org'`.
- **Chips vinculados**: mesma lógica.
- **Busca**: incluir `team_name` no filtro client-side (junto com título de KR e objetivo).

### 6. `src/modules/projects/components/MilestoneKrLinkSection.tsx`
- Mesmas mudanças do item 5.

### 7. `.lovable/memory/features/projects/kr-linking-standard.md`
- Atualizar seção "UI (popovers de vínculo)" e adicionar nota sobre chips:
  - "Badge para Team KR exibe **nome do time**; fallback para 'Time' se ausente."
  - "Org KRs mantêm badge 'Org'."
  - "Busca cobre título da KR, título do objetivo **e nome do time**."

## Fora de escopo
- Nenhuma migration de banco (apenas join adicional em queries existentes).
- Nenhuma mudança em RLS/permissions.
- Nenhuma mudança em navegação ou rotas.

## Validação pós-implementação
1. Abrir projeto `98074a55-...` → seção KRs → verificar chips exibindo nome do time.
2. Clicar em "Adicionar KR" → popover → resultados agrupados mostram nome do time.
3. Buscar pelo nome do time no popover → KRs do time aparecem.
4. Verificar Org KRs continuam com badge "Org".
