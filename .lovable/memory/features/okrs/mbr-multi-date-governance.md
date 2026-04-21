# Memory: features/okrs/mbr-multi-date-governance
Updated: 2026-04-21

A metodologia de governança prevê a realização de **dois rituais MBR por trimestre** (nos meses 1 e 2 do quarter). A modelagem foi **unificada em duas personas apenas** — `'mbr'` e `'mbr-pre'` — com **janela composta**:

- `opens/closes` são calculados como a união das janelas sobre `review_date_first_month` (MBR₁) e `review_date` (MBR₂).
- `pickCompositeWindow` em `useRitualAvailability.ts` retorna: (1) janela ativa se `today` estiver dentro; (2) próxima janela futura (para exibir data de abertura); (3) janela passada mais recente (para mensagem de expirada).

As reuniões ocorrem sempre na **1ª terça-feira do mês seguinte** ao período revisado, calculada via `firstTuesdayOfMonth()`. Janelas são contabilizadas em **dias úteis (seg–sex)** usando `addBusinessDaysToDate()`. O 3º mês do quarter é reservado exclusivamente para o rito de QBR — MBR/MBR-pre ficam bloqueados quando `today >= planning_date`.

**Calendário operacional**: a edge function `sync-ritual-calendar-from-cycles` materializa `mbr` e `mbr-pre` como `frequency='monthly'` na 1ª terça-feira (`month_week_ordinal=1, day_of_week=2`), começando em `review_date_first_month` do primeiro quarter. Isso gera automaticamente uma ocorrência em M1 e M2 de cada quarter; M3 é bloqueado no frontend.

**Back-compat**: as personas `'mbr-first'` e `'mbr-pre-first'` permanecem no tipo `WizardPersona` apenas para tipagem de registros históricos (padrão `managers-checkin`). Sessões antigas renderizam via `MbrPanoramaStep`/fallback. Labels legados em `useRitualHistory` marcados como "(histórico)".
