

## Problema

A query que busca as sessões de pré-QBR dos líderes retorna **todas** as sessões `completed` por ciclo, sem deduplicar por `team_id`. Se um líder finaliza o wizard mais de uma vez (ex: refez após adendo), há múltiplos registros `completed` para o mesmo time, gerando duplicidades na lista.

Times duplicados observados: BizOps (2x), Gente & Cultura (2x).

## Solução

Deduplicar as sessões por `team_id` no `useMemo` que constrói `leaderSubmissions`, mantendo apenas a sessão **mais recente** (maior `completed_at`) de cada time.

## Mudança técnica

**Arquivo:** `src/modules/okrs/pages/QbrPreCLevelPage.tsx` (linhas ~203-214)

No `useMemo` de `leaderSubmissions`, após o `.filter(s => s.team_id && s.reflection_data)`:

1. Ordenar por `completed_at` descendente
2. Usar um `Map<teamId, session>` para manter apenas a primeira ocorrência (mais recente) de cada `team_id`
3. Converter o Map em array antes de mapear para `LeaderPreSubmission[]`

Isso garante que cada time apareça apenas uma vez, com o snapshot mais atualizado, sem alterar a query no banco nem a interface do componente.

