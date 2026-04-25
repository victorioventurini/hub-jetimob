---
name: Wizard draft localStorage isolation
description: Chave de draft de wizards DEVE incluir todo o escopo (objectiveId + teamId etc) para evitar cross-contaminação owner/contribuidor
type: preference
---

Regra: localStorage keys de drafts de wizards (criação/edição) devem incluir
**todos os IDs que afetam ownership ou visibilidade**, não apenas a entidade-pai.

**Aplicação obrigatória:**
- `useKrWizardDraft`: key = `okr-draft.team-kr-creation.{objectiveId}.{teamId}`
  (mesmo objetivo pode ter draft do owner E de cada time contribuidor em paralelo)
- `useGenericWizardDraft`: ver `getDraftKey(wizardType, teamId)` — manter teamId
- Novos wizards multi-escopo: incluir cycleId quando KRs/objetivos forem
  cycle-specific.

**No load do draft:** validar `parsed.teamId === teamId` (além de version e
objectiveId). Mismatch → descartar silenciosamente, não mostrar UI de "retomar".

**Por quê:** sem isolamento, draft do time owner sobrescreve draft do
contribuidor (e vice-versa) na URL `/okrs/objectives/{id}/krs/create?contributor_team_id={X}`,
travando a criação de KRs de contribuição com estado inconsistente.
