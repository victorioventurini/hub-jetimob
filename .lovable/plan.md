# Onda 5 — Limpeza @deprecated (CONCLUÍDA 2026-04-30)

## Resultado
- **63 → 56** ocorrências `@deprecated` no codebase (-7).
- 8 arquivos editados; 0 quebras; build limpo.

## Removidos
1. `useTicketSubcategories` (GET hook órfão).
2. `preWeeklyKeys.userSources` queryKey órfão.
3. `initGA4()` + barrel re-export órfão.
4. `UserLink.userId` prop (migrados 2 consumers Initiative* → `profileId`).
5. `TeamMember` type + prop + query órfã (`useBuUsersDirectory` em `OkrCreationPage`).
6. `WeeklyThemeBlock`/`WeeklyThemeType` aliases (migrado `useWeeklyOpeningCuration`).

## Bloqueados / próximos
- **Onda 4 snapshots** (16 campos): observação até 2026-07-30.
- **KPIs v3 `frequency`**: requer migration DB (NOT NULL → nullable + drop).
- **KPIs v2.82.0 `category`**: onda dedicada com regressão visual.
- **Permissions V1** (4 tabelas): drop em Wave 8/9.
- **Analysis legacy shapes**: auditoria de dados JSONB necessária.
- **DeleteConfirmDialog → ConfirmDialog**: refactor de 17 arquivos (PR dedicada).

Detalhes em `mem://standards/deprecated-cleanup-log`.
