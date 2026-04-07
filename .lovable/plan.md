
# Plano: Melhorias no Ritual QBR Post

**Base:** TCR v3.22.0 | DEVELOPMENT_STANDARDS v1.28.0 | Wizard Development Guide v1.0 | Memories canônicas consultadas

---

## ⚠️ CONFLITOS IDENTIFICADOS COM AS SUGESTÕES DO CLAUDE

### Conflito 1 — Step 2, Adição 2 (Tipo de decisão strategic/tactical)
**Memory `decision-item-standard-v2-updated` (8h atrás):** *"A classificação por tipo (estratégico/tático) e o vínculo com diretrizes do C-Level foram removidos para reduzir a complexidade operacional durante as reuniões."*

**Ação:** ❌ **NÃO implementar** tipo de decisão nem vínculo com diretiva C-Level no Step 2. Isso foi deliberadamente removido. As Adições 2 e 3 do Step 2 são descartadas.

### Conflito 2 — Step 4, Seção B (Próximos 30 dias por liderança)
**`QbrMeetingDraftData` já possui `nextThirtyDays?: { ceo?: string; coo?: string; cpto?: string }`** (wizard.ts linha 549). Esse campo é preenchido no QBR Meeting (Step 5 — Encerramento).

**Ação:** ❌ **NÃO duplicar** no Post. Exibir read-only o que foi preenchido no Meeting, se existir.

### Conflito 3 — Step 4, Seção C (Notificação automática para líderes)
O sistema atual não possui infraestrutura de notificação push para líderes sobre OKRs ativos. A edge function `qbr-post-summary` gera relatório, mas não envia notificação por líder.

**Ação:** ⚠️ Implementar apenas o checkbox de confirmação como intenção. A notificação real é escopo futuro (requer edge function nova).

---

## PLANO DE IMPLEMENTAÇÃO (12 tarefas)

### Fase 1 — Tipos e Estado (wizard.ts + QbrPostDraftData)

**Tarefa 1:** Expandir `QbrPostSnapshot` e `QbrPostDraftData`

```typescript
// QbrPostSnapshot — adicionar:
destinationCycleId?: string;
ceoContextMessage?: string;

// QbrPostSnapshot.crossCommitments — adicionar ao tipo existente:
responsibleUserId?: string;
responsibleUserName?: string;
linkedOkrId?: string;

// QbrPostSnapshot.followUpCadence — expandir:
followUpCadence: {
  nextMbrDate?: string;          // substitui mbrReviewScheduled
  firstCheckinDate?: string;     // novo
  followUpMeetingDate?: string;  // existente
  leadersNotified?: boolean;     // checkbox confirmação
};

// QbrPostDraftData — adicionar:
destinationCycleId?: string;
ceoContextMessage?: string;
krAdjustments?: Record<string, Array<{
  krIndex: number;
  hasAdjustment: boolean;
  newTitle?: string;
  newTarget?: string;
  newOwnerId?: string;
  newOwnerName?: string;
}>>;
```

**Backward compatibility:** Manter `mbrReviewScheduled` como alias computado para `!!nextMbrDate`.

---

### Fase 2 — Step 1 (Promoção de OKRs) — 3 adições

**Tarefa 2:** Adicionar `TeamDeliveryScorecard` (compact mode) no topo de cada card de time.
- Reutilizar componente existente do qbr-meeting
- Prop `compact={true}`, read-only
- Microcopy: "Entrega do quarter que encerrou. Use como contexto ao ajustar e promover."
- **Dados:** Buscar da sessão qbr-pre do líder (já carregada em `leaderSessions`)

**Tarefa 3:** Banner de ciclo de destino no topo do step.
- Hook `useCycles` para buscar ciclo com `status = 'planning'` e `type = 'quarter'`
- Se 1 ciclo: banner informativo com nome e datas
- Se >1: `CycleSelect` para escolha (componente canônico em `src/components/selects/CycleSelect`)
- Se 0: aviso âmbar com orientação
- Persistir `destinationCycleId` no draft

**Tarefa 4:** Campo de ajuste estruturado por KR (substituir textarea).
- Para OKRs `approved_with_changes`: formulário por KR com checkbox "Esta KR tem ajuste"
- Campos condicionais: novo título, nova meta, novo responsável (`BuUserSelect`)
- Microcopy: "Registre exatamente o que muda antes de promover."
- Persistir em `krAdjustments[sessionId]`

---

### Fase 3 — Step 2 (Decisões) — 1 adição (2 descartadas)

**Tarefa 5:** Separação visual entre decisões da reunião e complementares.
- Decisões da reunião: header "Decisões da Reunião QBR — imutáveis", fundo `bg-muted/30`, cards read-only
- Decisões complementares: header "Decisões complementares — adicionadas após a reunião", `InlineDecisionInput` + cards editáveis
- **NÃO adicionar** tipo strategic/tactical nem vínculo com diretiva (removido por padrão canônico)

---

### Fase 4 — Step 3 (Compromissos) — 2 adições

**Tarefa 6:** Adicionar `BuUserSelect` para responsável nominal.
- Campo após "Para (time)" no formulário
- Exibir avatar no card após criação
- Persistir `responsibleUserId` e `responsibleUserName`

**Tarefa 7:** Select de OKR vinculado (opcional).
- Listar apenas OKRs marcados para promoção no Step 1 (`promotedOkrIds`)
- Passar `approvedOkrs` + `promotedSessionIds` como props
- Badge do OKR no card

---

### Fase 5 — Step 4 (Follow-up) — Reformulação

**Tarefa 8:** Reformular step completo.
- **Seção A — Datas:** 3 campos de data (Próximo MBR obrigatório, Primeiro check-in opcional, Follow-up meeting opcional). Pré-preencher MBR de `ritual_occurrences` se disponível.
- **Seção B — Próximos 30 dias (read-only):** Exibir dados do QBR Meeting (`nextThirtyDays`), NÃO duplicar campos editáveis.
- **Seção C — Confirmação:** Checkbox "Os líderes serão notificados sobre os OKRs ativos após o encerramento"

---

### Fase 6 — Step 5 (Ata Executiva) — 3 adições

**Tarefa 9:** Checklist dinâmico — item 4 ("OKRs do próximo ciclo estão ativos?").
- Desabilitado se `promotedOkrIds.length === 0`
- Tooltip quando desabilitado
- Props: receber `hasPromotedOkrs` do page

**Tarefa 10:** Campo "Carta de contexto do CEO" (textarea opcional).
- Após resumo automático, antes da ata narrativa
- Microcopy: "Esta mensagem será enviada para todos os times junto com a notificação de OKRs ativos."
- Persistir em `ceoContextMessage`

**Tarefa 11:** Atualizar microcopy do step.
- Título: "Ata executiva e encerramento"
- Subtítulo: "Formalize o que foi decidido. Ao concluir, os OKRs são ativados e os times são notificados."
- Labels do checklist conforme especificação

---

### Fase 7 — Orquestrador (QbrPostPage.tsx)

**Tarefa 12:** Passar novas props para todos os steps.
- Step 1: ciclos em planejamento, sessions para scorecard
- Step 3: `approvedOkrs` + `promotedSessionIds` para select de OKR vinculado
- Step 4: `meetingNextThirtyDays` do snapshot do meeting
- Step 5: `hasPromotedOkrs`, `ceoContextMessage`

---

## O QUE NÃO MUDA

- Lógica de promoção de OKRs (criação em `okr_team_objectives`)
- Transição `qbr_status → 'done'` ao concluir
- Decisões da reunião — imutáveis
- Edge function `qbr-post-summary` — sem alteração
- Gates de navegação existentes
- `TeamCheckinDecision` type — sem adição de `decisionType`
- Sem migrations de banco (tudo persiste em `reflection_data` JSONB)

## CONFORMIDADE

- ✅ Query keys via `src/lib/queryKeys` (verificar se existem; criar se necessário)
- ✅ `useBuScopedSupabase()` para queries POST-BU
- ✅ Componentes canônicos: `BuUserSelect`, `CycleSelect`, `TeamDeliveryScorecard`
- ✅ Sem `select('*')` — campos explícitos
- ✅ URL state não necessário (wizard com draft persistido)
- ✅ Sem hardcode de roles — acesso via `requiresBuAdmin` (já implementado)

## ARQUIVOS IMPACTADOS

| Arquivo | Mudança |
|---------|---------|
| `src/modules/okrs/types/wizard.ts` | Expandir tipos |
| `src/modules/okrs/pages/QbrPostPage.tsx` | Novas queries e props |
| `QbrPostOkrPromotionStep.tsx` | Scorecard + ciclo + ajuste estruturado |
| `QbrPostDecisionsStep.tsx` | Separação visual |
| `QbrPostCommitmentsStep.tsx` | Responsável + OKR vinculado |
| `QbrPostFollowUpStep.tsx` | Reformulação completa |
| `QbrPostMinutesStep.tsx` | Checklist dinâmico + carta CEO + microcopy |
