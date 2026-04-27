# Correção: Pré-Weekly Step 1 não lista ritos da semana atual (bug de timezone)

## Pré-checklist canônico — feito

- TCR consultado: sem regra específica para parse de date-only.
- SSOTs Pré-Weekly v2, Weekly v2 e Cycles & Rituals: nenhum padrão conflita com a correção.
- Identity (`mem://auth/identity-rbac-master`): mantido `useIdentity().profileId` (correção anterior preservada).
- Descoberta adicional: o mesmo bug existe em `useWeeklyPreWeeklyAggregation.ts` — incluído no plano.

## Diagnóstico (validado em produção)

**Sintoma:** em `/rituals/pre-weekly?team=...`, o card "Ritos concluídos por você nesta semana" mostra "Nenhum rito registrado…", mesmo com `team-checkin` e `leader-prep` concluídos hoje.

**Dados reais (consultados via DB):**
- `vitor.severo@jetimob.com` → `profile_id = 110f72b1-...`
- Sessões `status=completed` na semana:
  - `team-checkin` em `2026-04-27 14:52:09Z`
  - `leader-prep` em `2026-04-27 14:36:52Z`
  - `collaborator` em `2026-04-20 19:48:50Z`

A query filtra `started_by` e `wizard_type` corretamente. O problema é a **janela de datas**.

**Causa raiz — parse de date-only como UTC:**

1. `PreWeeklyPage.currentReferenceWeek()` produz `"2026-04-27"` (segunda local BRT).
2. `useUserWeeklySources` re-parseia com `new Date(referenceWeek)`. Strings `"YYYY-MM-DD"` no padrão ISO são interpretadas como **UTC midnight**, então `new Date("2026-04-27")` em BRT vira **sábado 26/04 21:00 local**.
3. `startOfWeek(sábado, weekStartsOn:1)` → segunda anterior = `2026-04-20`.
4. `endOfWeek(...).toISOString()` → `2026-04-27T02:59:59Z`.
5. Os ritos de hoje (`14:52Z`, `14:36Z`) ficam **fora** dessa janela e somem.

O bug afeta praticamente toda a semana em fuso BRT (e fuso similar) — em particular a segunda inteira.

O **mesmo padrão errado** está em `useWeeklyPreWeeklyAggregation.ts:80`, alimentando a agregação que vai para a Weekly. Sem corrigir lá, a Weekly perde os mesmos ritos.

## Correção (2 arquivos, ~2 linhas cada)

### 1. `src/modules/okrs/components/wizards/pre-weekly/PreWeeklySourcesStep.tsx`

```ts
// antes
const ref = referenceWeek ? new Date(referenceWeek) : new Date();

// depois — interpreta como data local
const ref = referenceWeek
  ? new Date(`${referenceWeek}T00:00:00`)
  : new Date();
```

### 2. `src/modules/okrs/hooks/useWeeklyPreWeeklyAggregation.ts`

Mesma substituição na linha 80.

## Validação esperada

Após a correção, em `/rituals/pre-weekly?team=c8e5d7a7-...`:
- "Ritos concluídos por você nesta semana" deve listar:
  - **Check-in do Time** — 1 sessão
  - **Preparação do Líder** — 1 sessão
- A Weekly (agregação Pré-Weekly) também passa a contar ritos do mesmo dia.

## Conformidade

- Sem mudança de schema, RLS, query keys ou permissões.
- Mantém `profileId` (Identity).
- Mantém `useBuScopedSupabase` (BU-scoped).
- Sem `select('*')`.
- Edição mínima e localizada.

## Pós (opcional)

Se aprovado, posso registrar uma memória curta sob `mem://standards/datetime/parse-date-only-as-local` para evitar o reaparecimento do padrão errado em outros wizards/agregações que recebem `"YYYY-MM-DD"` por prop.
