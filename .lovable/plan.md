# Corrigir Pré-Weekly Step 1 — não reconhece ritos da semana

## Problema (causa raiz confirmada por dados)

`PreWeeklySourcesStep.tsx` mostra "Nenhum rito registrado por você nesta semana ainda" mesmo quando há `team-checkin` e `leader-prep` concluídos.

O hook `useUserWeeklySources` filtra:
```ts
.eq('started_by', user!.id)   // user.id = auth.users.id
```
Mas `okr_wizard_sessions.started_by` armazena **`profiles.id`**, não `auth.users.id`. O filtro JS nunca bate, mesmo quando RLS permitiria e os registros existem.

Validado em produção: Vitor (`profiles.id = 110f72b1-…022e`, `auth.users.id = 0519fa0e-…b27`) tem hoje (27/04/2026) `team-checkin` (Marketing, 14:52 UTC) e `leader-prep` (Marketing, 14:36 UTC) com `bu_id` correto e `status='completed'`. Query SQL direta retorna os 2 registros — falha apenas no filtro JS.

## Conformidade canônica

- `docs/canonical/IDENTITY_CONVENTION.md` (l.135, 142, 191-227): leituras profile-scoped devem usar `useIdentity().profileId`; mutations usam `realProfileId`.
- Core memory: *"Use `realProfileId` from `useIdentity` for mutations to avoid RLS 42501 errors during impersonation"*.
- Padrão já vigente em `useWizardSession`, `useWizardDraft`, `useGenericWizardDraft`, `useCarryOverDecisions` (todos filtram `started_by` por `profile.id`). `PreWeeklySourcesStep` é o único desviante.

**Decisão**: usar `useIdentity().profileId` (não `realProfileId`). Em impersonation, "Suas fontes" devem refletir o perfil em uso na sessão do wizard — coerente com leitura e com o restante do Pré-Weekly.

## Mudança (1 arquivo, ~5 linhas)

**`src/modules/okrs/components/wizards/pre-weekly/PreWeeklySourcesStep.tsx`**

1. Remover `import { useAuth } from '@/hooks/useAuth';`
2. Adicionar `import { useIdentity } from '@/hooks/useIdentity';`
3. Em `useUserWeeklySources(referenceWeek)`:
   - `const { profileId } = useIdentity();` (no lugar de `const { user } = useAuth();`)
   - `enabled: !!currentBuId && !!profileId`
   - `queryKey: preWeeklyKeys.userSources(currentBuId, profileId, referenceWeek)`
   - `.eq('started_by', profileId!)`

Mantém: filtro por `wizard_type IN ('collaborator','leader-prep','team-checkin')`, janela `weekStart..weekEnd` (Mon-Sun), `status='completed'`, `useBuScopedSupabase` (BU isolation), `select` enxuto (sem `*`).

## Validação pós-fix

1. Como Vitor em `/rituals/pre-weekly?team=…Marketing…`, o Step 1 deve listar:
   - Check-in do time — 1 sessão
   - Preparação do líder — 1 sessão
2. Mensagem "Nenhum rito registrado…" desaparece.
3. `tsc` clean; sem novos warnings de query keys (helper já tipado a `string | undefined`).

## Fora de escopo (anotar como follow-up, não bloqueante)

- Query não filtra por `team_id`. Como o título é "**Suas** fontes desta semana" (visão pessoal multi-time), comportamento atual é defensável; decisão de produto se deve restringir ao `team` da URL — não é bug.
- Memória `mem://features/rituals/pre-weekly-v2-standard` está referenciada no índice mas o arquivo não existe. Gap documental separado, não bloqueia esta correção.

## Impacto

- 1 arquivo editado, mudança mínima.
- Sem migração de banco, sem alteração de RLS, tipos ou docs canônicos.
- **Alinha** ao padrão canônico de identidade já praticado no resto do módulo OKRs.
