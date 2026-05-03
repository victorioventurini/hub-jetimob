## Pré-checklist (executado)

- TCR §3933, §3979-3983: `useKpisForWizardV2` é o hook canônico do KPI Gate; `kpisTeamContext` definido como "KPIs do time (read-only)", `kpisStrategic` = "KPIs organizacionais". Nenhuma regra explícita sobre `responsible_team_id` nos buckets.
- `kpis-permissions-matrix.md`: matriz de RBAC (CRUD) — não governa visibilidade em ritos.
- `responsavel-vs-atualizado-por.md`: distingue **Responsável** (pessoa) vs **Atualizado por** (data_entry) — ortogonal a `responsible_team_id` ("Time Responsável", responsabilidade operacional do time).
- Precedente recente no próprio codebase: o fix anterior em `useKpiData.ts` e `useKpiEvolutionList.ts` (`/kpis`) já estabeleceu o padrão "filtro por time considera `team_id OU responsible_team_id`". Estender ao Pré-MBR é consistente.

## Problema

No Pré-MBR do Comercial, KPIs como **Ticket Médio** (scope=area, responsible_team_id=Comercial) e **MRR commit** (scope=org, responsible_team_id=Comercial) **não aparecem** na etapa "Análise de KPIs" (`?step=kpi-analysis`), embora apareçam corretamente em `/kpis?team_id=Comercial`.

## Causa raiz

Em `src/modules/kpis/hooks/useKpisForWizardV2.ts`, a query SQL **traz** esses KPIs (linha 112: `responsible_team_id = teamId`). O bug está na **classificação em buckets** (linhas 264-283):

| Bucket | Critério atual | Por que exclui |
|---|---|---|
| `kpisToUpdate` | `userRole=owner|contributor` E `needs_update` | Líder do time normalmente não é owner pessoal de KPI de área/org |
| `kpisTeamContext` | **`k.team_id === teamId`** E `!isStrategic` | Ticket Médio tem `team_id=NULL` → excluído |
| `kpisStrategic` | `k.scope === 'org'` | Ticket Médio é `scope=area` → excluído (MRR Commit entra aqui ✓) |
| `kpisInAlert` | `alertReason ≠ 'outdated'` | Sem valor lançado → `no_data`, sem alerta |
| `guardrailsViolated` | guardrail de KR violado | Não se aplica |

Resultado: KPIs de área cujo time responde caem em zero buckets → invisíveis no step.

Confirmado via DB:
- **Ticket medio**: `scope=area`, `team_id=NULL`, `responsible_team_id=Comercial`, `lifecycle=proposed`
- **MRR commit**: `scope=org`, `team_id=NULL`, `responsible_team_id=Comercial`, `lifecycle=proposed`

## Solução

Ajustar `useKpisForWizardV2.ts` para que `kpisTeamContext` reconheça responsabilidade operacional via `responsible_team_id`, sem alterar `kpisStrategic` (KPI org continua estratégico).

### Mudança

**Arquivo:** `src/modules/kpis/hooks/useKpisForWizardV2.ts`

1. **Tipo `KpiForWizardV2`** — expor `responsible_team_id` (já vem na query SQL, falta no enrich).
   - Linha ~239 (no `.map`): adicionar `responsible_team_id: kpi.responsible_team_id`.
   - No tipo (em `src/modules/kpis/types.ts` ou onde está declarado): adicionar campo `responsible_team_id: string | null`.

2. **Bucket `kpisTeamContext`** (linhas 271-275):
   ```ts
   const kpisTeamContext = allEnriched.filter(k =>
     (k.team_id === teamId || k.responsible_team_id === teamId) &&
     !kpisToUpdate.some(u => u.id === k.id) &&
     !k.isStrategic                          // mantém: scope=org continua só em strategic
   );
   ```

### Efeitos esperados

| KPI | Antes | Depois |
|---|---|---|
| Ticket Médio (scope=area, resp=Comercial) | invisível | aparece em `kpisTeamContext` |
| MRR commit (scope=org, resp=Comercial) | aparece em `kpisStrategic` ✓ | sem mudança (cláusula `!isStrategic` impede duplicação) |
| KPI scope=team com `team_id=Comercial` | aparece em `kpisTeamContext` ✓ | sem mudança |
| KPI de outro time (responsible_team_id=outro) | invisível ✓ | invisível ✓ (filtro continua exato) |

### Fora do escopo

- Não vamos forçar Ticket Médio em `kpisStrategic` — é area, não org.
- Não vamos alterar regras de `kpisToUpdate` (quem atualiza), `kpisInAlert`, ou `guardrailsViolated`.
- Sem mudanças em RLS, query SQL, `classifyKpiGateBuckets` ou outros wizards (Weekly, Collaborator, Leader Prep continuam idênticos — eles consomem o mesmo hook e se beneficiam automaticamente quando o `teamId` é o time responsável).

### Validação

Após o fix, em `/rituals/mbr-pre?team=d3247da9-…&step=kpi-analysis`:
1. Card "KPIs do time" deve listar **Ticket Médio**.
2. Card "KPIs Estratégicos" deve continuar listando **MRR commit**.
3. KPIs cujo `responsible_team_id` é outro time **não** devem vazar.
4. Snapshots existentes (`kpiSnapshots` no draft) continuam reconciliados — `MbrPreKpiGateStep` já trata novos itens via `gateItemToSnapshot`.
