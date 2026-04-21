# Onda 3 — Checklist de Ativação (MBR / QBR / Pós-QBR v4)

> **Governança TCR**: a virada estrutural de MBR/QBR/Pós-QBR só pode ocorrer
> em **Q-end** (encerramento de trimestre). Nunca no meio de um ciclo vigente.
> Este documento existe para tornar a ativação **uma operação determinística
> e reversível**, alinhada aos canônicos.

---

## Pré-requisitos (validar ANTES da janela de Q-end)

### 1. Snapshot do estado atual
- [ ] Confirmar que **todos os MBRs e QBRs do ciclo vigente foram concluídos**
      (`okr_wizard_sessions.status = 'completed'` para `wizard_type` em
      `('mbr', 'qbr-meeting', 'qbr-post')` no quarter ativo).
- [ ] Conferir que não há rascunhos abertos (`status = 'draft'`) para esses
      ritos. Se houver, decidir: notificar líderes para concluir, ou descartar
      via UI.

### 2. Integridade do framework
- [ ] `npm test src/modules/okrs/components/wizards/shared/framework` →
      **169 testes verdes** (ou superior).
- [ ] `grep -r "wizardType ===" src/modules/okrs/components/wizards/shared/framework/components/`
      → **0 matches** (componentes 100% agnósticos).
- [ ] Verificar console do preview por warnings em ritos da Onda 1/2 — se
      houver, **resolver antes de ativar Onda 3**.

### 3. Definições estruturais Onda 3
Confirmar presença em `stepDefinitions.ts`:
- [ ] `mbrV4` (8 steps: opening-executive → kpi-gate → teams-overview →
      team-analysis → org-okrs → strategic-projects → decisions → closing)
- [ ] `qbrMeetingV4` (4 steps: opening-executive → okr-approval → decisions
      → closing)
- [ ] `qbrPostV4` (4 steps: okr-promotion → decisions-adjustments →
      commitments-followup → closing)

### 4. Labels e gates
- [ ] `RITUAL_STEP_LABELS` em `ritualLabels.ts` cobre todos os stepIds das
      definições v4.
- [ ] `COMPLETION_RULES` declara as regras canônicas:
  - `mbr@v4.kpi-gate`: `allAtRiskKpisAddressed`
  - `mbr@v4.team-analysis`: `allActiveTeamsAnalyzed`
  - `qbr-post@v4.requiredSteps`: apenas `decisions-adjustments` + `closing`
    (steps legados `promotion`/`commitments`/`cadence` ficam fora do gate).
- [ ] `VISIBILITY_RULES` para v4 (carry-over, cross-area, projects-module,
      qbr-completed).

### 5. Snapshot reports (compatibilidade histórica)
- [ ] `SnapshotReportView.test.tsx` cobre fallback v1 ↔ v4.
- [ ] Testar manualmente em `/rituals/history` abrir um MBR/QBR antigo
      (`structure_version='v1'`) — deve renderizar com o renderer legado
      original.

---

## Janela de ativação (Q-end)

### Step 1 — Flip do mapa de versões
Editar `src/modules/okrs/components/wizards/shared/framework/config/structureVersions.ts`:

```ts
export const STRUCTURE_VERSION_BY_WIZARD_TYPE: Record<WizardPersona, StructureVersion> = {
  // ... (manter Onda 1/2 inalteradas)
  'mbr': 'v4',          // ⬅️ era 'v1'
  'qbr-meeting': 'v4',  // ⬅️ era 'v1'
  'qbr-post': 'v4',     // ⬅️ era 'v1'
  // ...
};
```

**Atenção:** este é o **único arquivo a ser editado**. Não tocar em hooks,
componentes, migrations ou `STEP_DEFINITIONS` (que já contém as definições v4).

### Step 2 — Validações automatizadas
- [ ] `npm test` (suite completa, não só do framework).
- [ ] `npm run build` deve passar sem warnings de TypeScript.
- [ ] `npm run lint`.

### Step 3 — Smoke manual no preview
- [ ] Abrir `/rituals/mbr` (ou rota equivalente) → confirmar 8 steps na ordem
      v4.
- [ ] Abrir `/rituals/qbr-meeting` → 4 steps na ordem v4.
- [ ] Abrir `/rituals/qbr-post` → 4 steps na ordem v4.
- [ ] Em cada rito ativo: registrar uma decisão inline em um step intermediário
      e validar que ela aparece consolidada no `DecisionsStep` agrupada por
      `sourceStep`.
- [ ] `/rituals/history` ainda lista MBRs/QBRs antigos com layout legado
      (`structure_version='v1'`).

### Step 4 — Rollout
- [ ] Publicar via Lovable.
- [ ] Comunicar líderes / C-Level que a estrutura nova entra em vigor para
      o **próximo MBR/QBR do novo ciclo** (sessões antigas preservadas).
- [ ] Monitorar `app_error_logs` por 24h para erros relacionados a
      `wizard_type` em `('mbr', 'qbr-meeting', 'qbr-post')`.

---

## Plano de rollback (se necessário)

Se algo crítico aparecer **antes da publicação**:
1. Reverter `structureVersions.ts` para `v1` nas 3 entradas.
2. `npm test` deve voltar a passar (já cobrimos esse cenário em
   `structureVersions.test.ts`).

Se algo crítico aparecer **depois da publicação**:
1. Mesmo flip de volta para `v1` + republicar.
2. Sessões `v4` que foram criadas antes do rollback continuam acessíveis no
   `/rituals/history` via dispatcher (mantém compatibilidade transparente).
3. Não há migration a desfazer — `structure_version` é uma coluna livre.

---

## Pós-ativação (D+7)

- [ ] Coletar feedback dos líderes sobre os novos steps (`teams-overview`,
      `team-analysis`, `okr-approval`).
- [ ] Validar contagem de inline decisions por `sourceStep` em produção
      (`select sourceStep, count(*) from ... group by sourceStep`).
- [ ] Atualizar `mem://features/okrs/management-rituals-standard-v2` com a
      data efetiva de virada para v4.
- [ ] Marcar este checklist como executado em `.lovable/plan.md`.

---

## Referências canônicas

- `mem://architecture/wizards/structure-versioning-standard`
- `mem://features/rituals/inline-decision-ubiquity-standard`
- `mem://architecture/wizards/framework-component-editability`
- `mem://features/okrs/ritual-governance-master-standard`
- `.lovable/plan.md` — plano consolidado da padronização.
