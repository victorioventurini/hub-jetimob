
## Plano: Melhorias QBR v1.2 — Itens Pendentes

### Análise: O que já existe vs. O que falta

**✅ Já implementado (v1.1 anterior):**
- Item 1 (qbr-pre-clevel Step 2 Balanço do Quarter) → `QbrCLevelQuarterBalanceStep.tsx` existe e funciona
- Scorecard no Opening → `ScorecardGrid` existe
- Pauta C-Level no Opening → Directives + fallback existem
- Agenda no Opening → `MeetingAgenda` existe
- Flags de calibração no OKR Review → Já renderiza `calibrationFlags`
- Adendos do líder no OKR Review → Já usa `AddendumBadge`
- Resumo de governança no Closing → `GovernanceSummary` existe
- Checklist dinâmico no Closing → 4 itens com condições
- Flags C-Level + campo ajuste + dependências no Post Promotion → Tudo implementado
- Resumo automático na Ata → `AutoSummary` existe

**🔧 O que falta implementar (delta desta solicitação):**

---

### 1. QbrMeetingOpeningStep — Bloco 2: OKRs da empresa neste quarter (NOVO)

**Arquivo:** `QbrMeetingOpeningStep.tsx`

Inserir entre o Scorecard (Bloco 1) e a Pauta C-Level (Bloco 2 atual) um novo bloco com cards colapsáveis (colapsados por padrão) para cada OKR organizacional do ciclo:
- Header: título + badge RAG agregado + progresso
- Dentro: cada KR org com barra de progresso + contribuições por time

**Nova prop:**
```typescript
orgObjectives?: OrgObjectiveWithKrs[];
```

**Arquivo:** `QbrMeetingPage.tsx`
- Importar e chamar `useAllOrgObjectivesView(year, cycleId)` 
- Passar `orgObjectives` ao Opening step
- Usar os dados para computar `scorecardMetrics` reais (healthy/atRisk/offTrack) em vez dos placeholders atuais

---

### 2. QbrMeetingOpeningStep — Scorecard com dados reais (FIX)

**Arquivo:** `QbrMeetingPage.tsx`

Atualmente o scorecard usa valores placeholder:
```typescript
scorecardMetrics: {
  healthy: teamsForReview.filter(t => t.hasSubmission).length,  // ← errado
  atRisk: 0,  // ← placeholder
  offTrack: 0,  // ← placeholder
  ...
}
```

Corrigir para computar a partir dos OKRs org reais via `orgObjectives` + `calculateKrState`:
- healthy = KRs org com state healthy/achieved/exceeded
- atRisk = KRs org com state at_risk/stagnant
- offTrack = KRs org com state off_track/not_achieved
- noSubmission = times sem submissão qbr-pre (mantém)

---

### 3. QbrMeetingOkrReviewStep — Cobertura de KRs organizacionais (NOVO)

**Arquivo:** `QbrMeetingOkrReviewStep.tsx`

Adicionar duas seções após os addendums e antes das ações de aprovação:

**Seção 1 — KRs org que o time propõe cobrir:**
Para cada proposta com KR tipo contribution (se `linkedOrgKrId` existe), mostrar:
- Objetivo proposto → KR → "Contribui para → KR Org: [título]"
- Se nenhuma KR vinculada: aviso "Nenhuma KR desta proposta contribui para os OKRs organizacionais"

**Seção 2 — Cobertura reversa (tempo real):**
KRs org sem cobertura por nenhum time aprovado. Atualizada conforme `approvals` mudam.

**Novas props:**
```typescript
orgObjectives?: OrgObjectiveWithKrs[];  // Para resolver nomes de KRs org
```

**Arquivo:** `QbrMeetingPage.tsx` — Passar `orgObjectives` ao OKR Review step.

---

### 4. QbrMeetingClosingStep — Mapa de cobertura org (NOVO)

**Arquivo:** `QbrMeetingClosingStep.tsx`

Antes do resumo de governança, inserir card "Cobertura de OKRs Organizacionais":
- Para cada KR org: ✅ coberta (por quais times) / ⚠️ intencional (checkbox) / ❌ sem cobertura
- Permite marcar KRs não cobertas como "intencional"

**Novo campo no draft:**
```typescript
// QbrMeetingGovernanceChecklist
orgCoverageClear: boolean;

// QbrMeetingDraftData
intentionalGaps?: string[];  // IDs de KRs org marcadas como intencionais
```

**Novo item no checklist:**
- "OKRs organizacionais cobertos" → enabled quando todas as KRs org têm cobertura OU estão marcadas como intencionais

**Novas props:**
```typescript
orgObjectives?: OrgObjectiveWithKrs[];
intentionalGaps: string[];
onIntentionalGapsChange: (gaps: string[]) => void;
```

**Arquivo:** `QbrMeetingPage.tsx` — Passar dados + handler. Adicionar `intentionalGaps: []` ao DEFAULT_DATA.

---

### 5. Tipos (wizard.ts)

- `QbrMeetingGovernanceChecklist`: adicionar `orgCoverageClear: boolean`
- `QbrMeetingDraftData`: adicionar `intentionalGaps?: string[]`

---

### Resumo de arquivos impactados

| Arquivo | Mudança |
|---------|---------|
| `types/wizard.ts` | +`orgCoverageClear` no checklist, +`intentionalGaps` no draft |
| `QbrMeetingOpeningStep.tsx` | +Bloco OKRs org (colapsáveis) |
| `QbrMeetingOkrReviewStep.tsx` | +Cobertura org + cobertura reversa |
| `QbrMeetingClosingStep.tsx` | +Mapa de cobertura org + novo checklist item |
| `QbrMeetingPage.tsx` | +useAllOrgObjectivesView + scorecard real + novas props |

5 arquivos. Sem mudança de schema, edge functions ou RLS.

### O que NÃO muda

- `qbr-pre` — intocado
- `QbrCLevelQuarterBalanceStep` — já implementado, sem alteração
- `QbrPostOkrPromotionStep` — já tem flags + ajuste + dependências
- `QbrPostMinutesStep` — já tem resumo automático
- Lógica de gates de navegação
- Snapshots `reflection_data`
- `QbrPreCLevelPage` — já tem 6 steps com quarter-balance

### Padrões respeitados

- `useBuScopedSupabase()` para queries (POST-BU) ✅
- Sem `select('*')` — campos explícitos ✅
- Hooks existentes reutilizados (`useAllOrgObjectivesView`, `calculateKrState`) ✅
- Props aditivas (backward-compatible) ✅
- Tokens semânticos do design system ✅
- Dados derivados de queries e snapshots existentes ✅
