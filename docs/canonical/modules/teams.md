# Módulo Teams — Canonical

**Slug:** `teams` · **Status:** ✅ Ativo

## Tabelas

`teams`, `squads`, `user_team_memberships`, `areas`. Schema: `types.ts`.

## Hierarquia

```
BU → Área (estratégica, sem OKRs) → Time → Subtime → Squad → Pessoas
```

Áreas: apenas líder/co-líder, sem OKRs/backlog. Times: operacionais, com OKRs.

## Regras de gestão

Líder direto OU admin pode gerenciar o time. Ver `core/TCR_CORE.md` §5.5.

Funções: `is_team_leader`, `team_is_ancestor`, `team_is_descendant`, `user_can_manage_team`, `get_manageable_teams`.

## Organogram

- Página: `/teams` (visão hierárquica) + `/teams/:id` (detalhe).
- **Organogram Text Export:** `src/modules/teams/utils/organogramToText.ts` → ASCII tree com header (BU + timestamp), respeita filtros (`showMembers`, `showSquads`), footer com contagem. Botão de cópia em `OrganogramControls` (normal + fullscreen).

## Componentes canônicos

`TeamSelect` — opcional → `includeNone noneLabel="..."`. `AreaSelect` — mesma regra, suporta `includeNone={!isRequired}` para obrigatoriedade reativa.

## Permissões

`teams.team.*`, `teams.area.*`, `teams.squad.*`, `teams.membership.*`. Templates em `RBAC_TEMPLATES_V3.md`.

## Páginas

`/teams`, `/teams/:id`, `/settings/areas`, `/users`, `/users/:id`.
