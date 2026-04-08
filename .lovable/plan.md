

## Plano: Tornar o Check-in do Colaborador sempre acessível

### Problema

O check-in do colaborador (`/rituals/collaborator-checkin`) depende de um ciclo trimestral ativo (`useActiveCycle`). Se não houver ciclo ativo (ex: OKRs em construção, entre quarters), o rito é bloqueado com "Nenhum ciclo ativo". Porém, o colaborador precisa atualizar **projetos e KPIs** independentemente de OKRs.

### Solução

Remover a barreira de ciclo ativo para o collaborator check-in, tornando ciclo e KRs opcionais.

---

### Etapa 1 — Remover guard de disponibilidade do collaborator

**Arquivo:** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

- Remover o uso de `useRitualAvailability` e o guard `RitualUnavailableScreen` — o rito fica sempre acessível
- Tornar `quarterlyCycle` opcional: se `null`, o wizard funciona sem KRs (steps de KR são pulados)
- Ajustar `useGenericWizardDraft` para aceitar `cycleId: null` com uma chave de fallback (ex: `'no-cycle'`) para que o draft persista mesmo sem ciclo

### Etapa 2 — Pular steps de KR quando não há ciclo/KRs

**Arquivo:** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

- No step `checkin`: se `userKrs` estiver vazio (sem ciclo ou sem KRs), pular automaticamente para o próximo step (KPIs)
- O step `context` mostra mensagem adaptada: "Nenhum OKR ativo neste momento — atualize seus KPIs e projetos"
- Steps de **KPIs**, **Projetos**, **Iniciativas** e **Reflexão** continuam funcionando normalmente (não dependem de ciclo)

### Etapa 3 — Ajustar steps no sidebar

**Arquivo:** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

- Filtrar `WIZARD_STEPS` dinamicamente: se não há KRs, omitir o step "Check-in" da lista visível
- O step "Contexto" se adapta para mostrar o cenário sem OKRs

---

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `CollaboratorCheckinPage.tsx` | Remover guard, tornar ciclo opcional, filtrar steps |
| `useRitualAvailability.ts` | Nenhuma mudança (o hook simplesmente não será chamado) |

### O que NÃO muda

- Outros ritos continuam com suas janelas de disponibilidade
- O `CollaboratorWizardCard` na home continua usando `usePendingCheckins` para decidir exibição (pode precisar de ajuste separado se quisermos mostrar o card mesmo sem KRs pendentes)

