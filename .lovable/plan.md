## Problema
No card "Pré-MBR dos times" (página `/rituals/mbr`), todos os times ativos da BU aparecem como pendentes mesmo quando não têm nenhum KPI nem KR para preencher — o que polui a cobertura com falsos pendentes (aqueles times nunca vão entregar Pré-MBR).

## Causa
`useRitualPreparationStatus` (caso `mbr`, linhas 227–300 de `src/modules/okrs/hooks/useRitualPreparationStatus.ts`) lista **todos** os times ativos (`teams.status='active'`) sem checar se o time tem insumos para um Pré-MBR.

## Correção
Filtrar a lista de times do caso `mbr` para incluir somente os que efetivamente são alvo de Pré-MBR — aplicando o mesmo critério usado pelo próprio Pré-MBR para considerar um time elegível.

Critério de elegibilidade (espelho do `MbrPrePage` + `useMbrPreTeamKpisMonthly`):
- **Tem KPI próprio**: existe `kpi_metrics` com `responsible_team_id = team.id`, `lifecycle_status='active'`, `deleted_at IS NULL`, `indicator_type != 'metric'`; **OU**
- **Tem KR no ciclo corrente**: existe `okr_team_objectives` com `team_id = team.id` no `cycleId` ativo (não cancelado / não soft-deleted) com pelo menos um `okr_team_key_results` ativo; **OU**
- **Contribui para KR de outro time no ciclo**: existe `okr_team_objectives.contributor_team_id = team.id` no ciclo, com KR ativo.

Times que falharem em todos os três são excluídos do card (não entram como `pending-late`).

## Mudanças
Arquivo único: `src/modules/okrs/hooks/useRitualPreparationStatus.ts`

1. No bloco `ritualType === 'mbr'`:
   - Receber `cycleId` (já está em args, hoje não usado nesse caso) para resolver KRs do ciclo corrente — fallback: pegar o ciclo quarterly ativo via `okr_cycles` (BU + `is_active=true` + `cycle_type='quarterly'`) caso `cycleId` não venha.
   - Após carregar `teams`, executar 3 consultas paralelas (BU já isolada via `buSupabase`):
     - `kpi_metrics` selecionando `responsible_team_id` distinct.
     - `okr_team_objectives` selecionando `team_id` (com join filtrando KR ativo) no ciclo.
     - `okr_team_objectives` selecionando `contributor_team_id` no ciclo.
   - Construir `Set<teamId>` de elegíveis = união dos três.
   - `teams.filter(t => eligible.has(t.id))` antes de mapear participantes.
   - Se a interseção ficar vazia, retornar `null` (oculta o card — `isEmpty`).

2. Atualizar a `description` do card para refletir o recorte: "Cobertura dos preparatórios mensais entre os times com KPI ou KR neste ciclo."

3. Atualizar `queryKey` para incluir `cycleId` (já incluso no `useMemo`, ok).

## Fora de escopo
- Não alterar `MbrPrePage`, gates do wizard, snapshots, edge functions ou regra de negócio do Pré-MBR.
- Não tocar nos demais casos do hook (`team-checkin`, `qbr-*`, `mbr-pre`, `weekly`).
- Sem migração de banco.

## Validação
- `/rituals/mbr` → card "Pré-MBR dos times" deve listar apenas times com KPI ou KR; times sem nenhum dos dois somem.
- Para uma BU sem times elegíveis, o card é ocultado (mesma semântica de outros casos `null`).
- Console/network sem regressões.