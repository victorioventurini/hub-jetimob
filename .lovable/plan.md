> ✅ **STATUS: EXECUTADO em 2026-04-21**
> Flip Onda 3 (`mbr`/`qbr-meeting`/`qbr-post` → `v4`) concluído.
> Testes: **186 verdes** em 9 suítes. Documentação canônica atualizada (TCR v3.26.0 §4.8.1, SCHEMA_QUICK_REFERENCE, README canônico).
> Restam apenas as ações operacionais (smoke manual, publicação, monitoramento D+7).

## Flip Onda 3 — Plano de Ativação (MBR / QBR / Pós-QBR v4)

### Objetivo
Ativar a estrutura v4 para os ritos MBR, QBR-Meeting e QBR-Post, migrando novas sessões da estrutura legada (v1) para o framework unificado (v4). Sessões antigas permanecem acessíveis via `SnapshotReportView`.

---

### Step 1 — Flip do Mapa de Versões (1 arquivo)

**Arquivo:** `src/modules/okrs/components/wizards/shared/framework/config/structureVersions.ts`

**Mudança:** Alterar 3 valores no mapa `STRUCTURE_VERSION_BY_WIZARD_TYPE`:

````text
Linha 41: 'mbr': 'v1',          → 'mbr': 'v4',
Linha 42: 'qbr-meeting': 'v1',  → 'qbr-meeting': 'v4',
Linha 43: 'qbr-post': 'v1',     → 'qbr-post': 'v4',
````

**Atualização do comentário:** Substituir o bloco "Onda 3 — PRÉ-ATIVAÇÃO" por:

````typescript
// Onda 3 — ATIVA (Q-end YYYY-QX)
// Estrutura v4 ativada. Novas sessões usam framework genérico;
// sessões antigas (v1) renderizam via SnapshotReportView.
````

---

### Step 2 — Validações Automatizadas

Executar sequência de validação:

1. **Testes do framework:** `npm test src/modules/okrs/components/wizards/shared/framework`
   - Esperado: 169+ testes verdes (incluindo `structureVersions.test.ts` que cobre o cenário v4)

2. **Testes de labels:** `npm test src/modules/okrs/constants/__tests__/ritualLabels.test.ts`
   - Esperado: 14 testes verdes (cobertura de todos os stepIds v4)

3. **Suite completa:** `npm test`
   - Esperado: 184+ testes verdes

4. **Build:** `npm run build`
   - Esperado: zero warnings de TypeScript

5. **Lint:** `npm run lint`
   - Esperado: zero erros

---

### Step 3 — Smoke Manual no Preview

Validações pós-build no ambiente de preview:

| Rota | Validação |
|------|-----------|
| `/rituals/mbr` | Confirmar 8 steps: opening-executive → kpi-gate → teams-overview → team-analysis → org-okrs → strategic-projects → decisions → closing |
| `/rituals/qbr-meeting` | Confirmar 4 steps: opening-executive → okr-approval → decisions → closing |
| `/rituals/qbr-post` | Confirmar 4 steps: okr-promotion → decisions-adjustments → commitments-followup → closing |
| Decisões inline | Registrar decisão em step intermediário; validar que aparece no `DecisionsStep` agrupada por `sourceStep` |
| `/rituals/history` | Abrir MBR/QBR antigo (structure_version='v1'); confirmar renderização via layout legado |

---

### Step 4 — Rollout e Monitoramento

1. **Publicação:** Deploy via Lovable Cloud
2. **Comunicação:** Notificar líderes/C-Level que estrutura v4 entra em vigor para o próximo ciclo
3. **Monitoramento (24h):** Observar `app_error_logs` por erros relacionados aos wizard_types ativados

---

### Plano de Rollback (se necessário)

**Antes da publicação:** Reverter 3 valores para 'v1' e reexecutar testes.

**Após publicação:** 
1. Reverter para 'v1' + republicar
2. Sessões v4 criadas antes do rollback permanecem acessíveis via dispatcher
3. Não requer migration — `structure_version` é coluna livre

---

### Pós-Ativação (D+7)

- Coletar feedback sobre novos steps (`teams-overview`, `team-analysis`, `okr-approval`)
- Validar contagem de inline decisions por `sourceStep` em produção
- Atualizar memória canônica com data efetiva da virada
- Marcar checklist como executado em `.lovable/plan.md`
