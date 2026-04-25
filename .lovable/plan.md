
## Diagnóstico (Pré-checklist concluído)

**Sintoma:** `/teams/d3247da9-...` quebra ao carregar.

**Root cause:** Em `src/modules/teams/hooks/useTeams.ts` (linha 121), o select do leader referencia `job_title` como coluna direta de `profiles`:

```ts
leader:profiles!teams_leader_user_id_fkey(id, display_name, photo_url, job_title, work_email)
```

Mas `profiles.job_title` NÃO existe — desde a Wave 2.6 (Multi-BU Job Titles), o vínculo é via FK `profiles.job_title_id → job_titles.id`. PostgREST retorna 400 e a página do time não renderiza.

**Evidências canônicas:**
- `docs/archive/fixes/FIX_JOB_TITLES_MULTI_BU_ISSUES.md` — documenta o padrão `job_title_rel`.
- `useTeams.ts` linha 150 (membros) **já aplica** o padrão correto: `job_title_rel:job_titles!job_title_id(name)`.
- `docs/qa/QA_JOB_TITLES_MULTI_BU.md` — Wave 2.6 confirma a remoção do acesso direto a `job_title`.

## Plano de correção (cirúrgica, 1 arquivo)

### 1. `src/modules/teams/hooks/useTeams.ts` — função `useTeam()`

**Linha 121** — corrigir o select do leader para usar a relação canônica (mesmo padrão dos `members` na linha 150):

```ts
leader:profiles!teams_leader_user_id_fkey(
  id, display_name, photo_url, work_email,
  job_title_rel:job_titles!job_title_id(name)
)
```

**Linhas 175-181** — achatar `job_title_rel.name → job_title` no retorno, mantendo o contrato `TeamWithRelations` esperado por `TeamDetailPage` / `TeamMemberRow`:

```ts
const leader = data.leader
  ? {
      id: data.leader.id,
      display_name: data.leader.display_name,
      photo_url: data.leader.photo_url,
      work_email: data.leader.work_email,
      job_title: (data.leader.job_title_rel as { name: string } | null)?.name || null,
    }
  : null;

return {
  ...data,
  leader,
  child_teams: childTeams || [],
  member_count: memberCount || 0,
  members: members || [],
  parent_team: parentTeam,
} as unknown as TeamWithRelations & { members: any[] };
```

### 2. Validação

- `tsc --noEmit` para garantir tipos.
- Abrir `/teams/d3247da9-3e07-4fa8-9d0a-2527fdf6548f` e verificar:
  - Página carrega sem erro 400.
  - Card do líder exibe nome, foto, e-mail e cargo.
  - BU isolation preservada (linha 130 intacta).

### 3. Memória (governança)

Criar `mem://standards/users/job-title-relation-access` reforçando que **toda leitura de cargo de um profile deve usar `job_title_rel:job_titles!job_title_id(name)`**, nunca `job_title` direto. Atualizar `mem://index.md` adicionando a referência em "Standards & Patterns".

## Conformidade com regras inquebráveis

| Regra | Status |
|-------|--------|
| BU-scoped query | ✅ mantida (linha 130 + `useBuScopedSupabase`) |
| Sem `select('*')` | ✅ colunas explícitas |
| Query keys via SSOT | ✅ `queryKeys.teams.detail` |
| Identity convention | ✅ `profiles.id` para leader |
| Padrão canônico (Wave 2.6) | ✅ `job_title_rel` (idêntico ao já aplicado em `members`) |

## Escopo do que NÃO será alterado

- `useTeams()` (lista) na linha 35 já usa apenas `id, display_name, photo_url` no leader — ok.
- Nenhuma mudança em RLS, schema, types.ts ou outros componentes.
- Sem código descentralizado: aplicação direta do padrão canônico já presente no mesmo arquivo.
