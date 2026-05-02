## Objetivo

Tornar o **botão Concluir do Summary** o único ponto onde dados do Check-in Individual são gravados na base. Hoje vários steps persistem ao avançar (KRs, KPIs, marcos de projetos, follow-ups de decisões). Isso será migrado para um **commit em batch no final**, com o draft funcionando como buffer completo até lá.

## Pré-checklist (executado)

- ✅ TCR — `okr_checkins.user_id` é `profile_id`; `okr_checkins.comments` no wizard segue texto puro
- ✅ `IDENTITY_CONVENTION.md` — `useCreateCheckin` já usa `profileId`
- ✅ `DATA_MODEL_REGISTRY.md` — `okr_checkins`, `kpi_values`, `project_milestones`, `decision_follow_ups` sem mudanças de schema
- ✅ `mem://features/rituals/collaborator-step1-order-mirrors-steps` — STEP_ORDER preservado
- ✅ Componentes centralizados a reaproveitar: `CheckinDialog` blocks, `WizardLastStepFooter`, `useCreateCheckin`

## Diagnóstico — onde se grava hoje

| Step | Persistência atual | Tabela | Local |
|---|---|---|---|
| `kpis` | `addKpiValueSilent.mutateAsync` ao avançar cada KPI | `kpi_values` | `CollaboratorCheckinPage.tsx` (linhas ~430-447) |
| `checkin` (KRs) | `createCheckin.mutateAsync` ao avançar cada KR | `okr_checkins` | `CollaboratorCheckinStep.tsx` (linhas ~122-129) |
| `projects` | `updateMilestone.mutate` em toggle/edit inline | `project_milestones` | `CollaboratorProjectsStep.tsx` (linhas ~218, ~248) |
| `decisions` | `updateFollowUp` / `addThreadMessage` ao interagir | `decision_follow_ups`, `decision_thread_messages` | `CollaboratorDecisionsStep.tsx` |
| `initiatives` | (a confirmar — provavelmente status changes inline) | `okr_initiatives` | `CollaboratorInitiativesStep.tsx` |
| `reflection` | Não persiste — só draft | — | — |
| `summary` (Concluir) | `clearDraft` + email | — | page (linhas 305-325) |

## Mudanças propostas

### 1. Bufferizar TUDO no draft

Estender o estado do draft (`useCollaboratorCheckinDraft`) para acumular **intenções de mutation** sem executá-las:

```ts
draft.data = {
  // ... existentes
  results,            // já existe — KR check-ins planejados
  kpiResults,         // já existe — KPI values planejados
  reflection,         // já existe
  initiativesMarkedAtRisk, // já existe
  // NOVOS:
  milestoneChanges: Array<{ milestoneId, patch }>,  // toggles e edits planejados
  decisionUpdates:  Array<{ followUpId | decisionId, patch | message }>,
  initiativeStatusChanges: Array<{ initiativeId, status, comment? }>,
}
```

Os steps deixam de chamar mutations: apenas atualizam o draft via `updateDraft(...)`. UI continua mostrando os valores "novos" lendo do próprio draft (já é o padrão para results/kpiResults).

### 2. Steps — remover persistência inline

- **`CollaboratorCheckinStep`**: remover `await createCheckin.mutateAsync(...)`. Mantém UX (validação ≥10 chars, atalho Ctrl+Enter, status RAG, blocos centralizados). Ao salvar, só monta o `CollaboratorCheckinResult` e chama `onComplete(result)`.
- **`CollaboratorKpiStep`**: page deixa de chamar `addKpiValueSilent.mutateAsync` no `onComplete`. Apenas guarda em `kpiResults`.
- **`CollaboratorProjectsStep`**: substituir `updateMilestone.mutate` por uma callback `onMilestoneChange(patch)` que escreve no draft. Render lê `milestone overlay = baseMilestone + draft.milestoneChanges[id]`.
- **`CollaboratorDecisionsStep`**: substituir `updateFollowUp`/`addThreadMessage` por callbacks que acumulam no draft. UI mostra entradas pendentes com badge "será gravado ao concluir".
- **`CollaboratorInitiativesStep`**: idem para mudanças de status.

### 3. Summary — Concluir grava em batch

Refator de `handleComplete` em `CollaboratorCheckinPage`:

```ts
const handleComplete = async () => {
  setIsCompleting(true);
  try {
    // 1) okr_checkins (sequencial p/ respeitar RLS por KR)
    for (const r of results) if (!r.skipped) await createCheckin.mutateAsync(...);
    // 2) kpi_values
    await Promise.allSettled(kpiResults.filter(k=>!k.skipped).map(addKpiValueSilent.mutateAsync));
    // 3) milestones
    await Promise.allSettled(milestoneChanges.map(updateMilestone.mutateAsync));
    // 4) initiatives status
    await Promise.allSettled(initiativeStatusChanges.map(...));
    // 5) decisions follow-ups + threads
    await Promise.allSettled(decisionUpdates.map(...));

    // Coleta erros, mostra toast resumido se houver falhas parciais
    // Só limpa draft + dispara email se SEM falhas críticas
    const sessionId = await clearDraft();
    if (sessionId) buSupabase.functions.invoke('collaborator-checkin-summary', { ... });
    toast.success('Check-in concluído!');
    navigate('/wizards');
  } catch (err) {
    toast.error('Falha ao concluir o check-in. Seus dados foram preservados no rascunho.');
  } finally { setIsCompleting(false); }
};
```

Política de erro: se **qualquer** mutation crítica (KR check-in) falhar, **NÃO** limpar o draft — usuário pode reabrir e tentar novamente. Falhas em milestones/decisões geram toast de aviso mas não bloqueiam conclusão.

### 4. Summary visual — preview pré-gravação

Acrescentar microcopy clara no topo do `CollaboratorSummary`:

> Nada foi gravado ainda. Revise abaixo e clique em **Concluir** para registrar.

Cabeçalho atual "Check-in concluído!" só aparece **após** o handleComplete bem-sucedido (já é assim no fluxo de página, pois navega fora). Ajustar título para "Revisão final" enquanto pendente.

### 5. Aviso ao fechar com draft sujo

`FullPageWizardShell.onClose` já tem hook de "draft dirty". Garantir que o `AlertDialog` exibe:

> Você tem alterações no rascunho que **ainda não foram registradas**. Sair agora preserva o rascunho para você continuar depois — mas nada será gravado até você concluir o check-in.

Botões: **Continuar editando** / **Salvar e sair** / **Descartar rascunho**.

## Arquivos tocados

**Editar:**
- `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx` — remover mutation inline
- `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx` — toggle/edit via callback de draft
- `src/modules/okrs/components/wizards/collaborator/CollaboratorDecisionsStep.tsx` — follow-ups/threads via callback de draft
- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx` — status changes via callback de draft
- `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx` — copy "Revisão final" + aviso pré-gravação
- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` — `handleComplete` em batch, remover `addKpiValueSilent` do `onComplete` do KPI step, fluxo de erro parcial, dialog de fechamento
- `src/modules/okrs/components/wizards/collaborator/hooks/useCollaboratorCheckinDraft*.ts` — adicionar campos `milestoneChanges`, `decisionUpdates`, `initiativeStatusChanges`

**Criar:** nenhum (zero duplicação).

## Não-objetivos

- Não alterar schema de DB (`okr_checkins`, `kpi_values`, `project_milestones`, `decision_*` permanecem).
- Não alterar STEP_ORDER nem visíveis do wizard.
- Não trazer @menções para o wizard (TCR).
- Não tocar no `CheckinDialog` do drawer `/okrs` (continua persistindo ao vivo, é fluxo distinto).
- Não alterar lógica de outros wizards (Pré-Weekly, Weekly, QBR).

## Riscos & mitigação

| Risco | Mitigação |
|---|---|
| Draft cresce muito (milestones × decisões × KPIs × KRs) | Já é JSONB; cap razoável por sessão. Validar tamanho antes de saveDraft. |
| Falha parcial no batch deixa estado inconsistente | Política: sucesso parcial preserva draft com `pendingMutations` reduzido aos que falharam; usuário reabre e tenta de novo. |
| KPIs com `kpi_value` duplicado se usuário concluir 2x | `clearDraft` só após sucesso; botão Concluir desabilitado durante `isCompleting`. |
| Conflito com `updateMilestone` realtime de outros usuários | Aceitável — ao concluir, último write vence (comportamento atual de update). |
