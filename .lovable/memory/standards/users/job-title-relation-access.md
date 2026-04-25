---
name: Job title relation access (Wave 2.6 Multi-BU)
description: Toda leitura de cargo de um profile DEVE usar a relação `job_title_rel:job_titles!job_title_id(name)`, nunca `job_title` direto
type: preference
---

## Regra

A coluna `profiles.job_title` **não existe** desde a Wave 2.6 (Multi-BU
Job Titles). O vínculo é via FK `profiles.job_title_id → job_titles.id`,
e a tabela `job_titles` tem `bu_ids[]` (multi-BU).

## Padrão correto

```ts
.select(`
  id, display_name, photo_url, work_email,
  job_title_rel:job_titles!job_title_id(name)
`)
```

Achatar no consumo:

```ts
const job_title = (row.job_title_rel as { name: string } | null)?.name ?? null;
```

## Por quê

Selecionar `job_title` direto retorna PostgREST 400 (coluna inexistente)
e quebra a query inteira — sintoma comum: páginas que dependem do
profile/leader não renderizam.

## Exemplos canônicos

- `src/modules/teams/hooks/useTeams.ts` — `useTeam()` usa o padrão para
  leader e members.
- `src/hooks/useSharedData.ts` — `useUserProfile()` aplica o mesmo padrão
  e ainda prioriza `bu_user_memberships.job_title_id` quando existir.
- `src/pages/Profile.tsx` — usa `job_title_rel` via FK direta.

## Override por BU (opcional, para Multi-BU strict)

Quando o cargo "efetivo" deve refletir o override por BU, consultar
`bu_user_memberships.job_title_id` com prioridade sobre o profile —
ver `useSharedData.ts` como referência canônica.

## Documentação relacionada

- `docs/archive/fixes/FIX_JOB_TITLES_MULTI_BU_ISSUES.md`
- `docs/archive/reports/JOB_TITLES_MODULE.md` (Wave 2.6)
- `docs/qa/QA_JOB_TITLES_MULTI_BU.md`
