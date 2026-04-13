

## Respostas às suas perguntas

### 1. A estrutura de decisão é centralizada?

**Sim, parcialmente.** O tipo `TeamCheckinDecision` em `src/modules/okrs/types/wizard.ts` é a interface única usada por **todos** os rituais (Team Check-in, MBR, QBR Pre, QBR Meeting, QBR Post, etc.). Os componentes de criação/edição (`DecisionCard`, `InlineDecisionInput`) também são compartilhados via `src/modules/okrs/components/wizards/shared/`.

**Porém**, o componente de follow-up (`DecisionFollowUpRow`) que renderiza o checkbox no histórico existe **apenas inline** dentro de `RitualHistoryPage.tsx` — não é um componente compartilhado. A mutação `useUpdateDecisionFollowUp` está centralizada em `useRitualHistory.ts`.

O que precisamos alterar para o check de resolução impacta:
- O tipo `TeamCheckinDecision` (centralizado, impacta todos os rituais)
- O `DecisionFollowUpRow` (inline na página de histórico)
- O `useUpdateDecisionFollowUp` (centralizado)

### 2. Hierarquia de liderança — o que considerar?

A hierarquia do Hub é:

```text
Admin da BU (isWildcard)
  └── Líder de Área (areas.leader_user_id)
       └── Líder de Time (teams.leader_user_id)
            └── Líder de Sub-time (teams.leader_user_id + parent_team_id)
                 └── Colaborador (membro do time)
```

**Para o check de resolução, a regra deve ser:**
- O **próprio responsável** (decision.owner.id === profileId) pode resolver
- O **líder direto** do time onde o responsável é membro pode resolver
- O **líder de área** do time do responsável pode resolver
- O **admin da BU** (isWildcard) pode resolver

Isso respeita a cadeia completa que você descreveu: colaborador → líder de subtime/time → líder de área → admin.

---

## Plano revisado: Check de resolução com campo obrigatório e cadeia de liderança

### Etapa 1 — Estender `TeamCheckinDecision`

**Arquivo:** `src/modules/okrs/types/wizard.ts`

Adicionar campos opcionais:
```typescript
resolvedAt?: string;
resolvedBy?: { id: string; name: string };
resolutionNote?: string;
```

Impacto: todos os rituais herdam automaticamente (tipo centralizado).

### Etapa 2 — Hook `useCanResolveDecision`

**Arquivo:** `src/modules/okrs/hooks/useCanResolveDecision.ts`

Recebe `ownerProfileId` e verifica toda a cadeia:

1. `profileId === ownerProfileId` → pode resolver (é o próprio)
2. `isWildcard` → pode resolver (admin da BU)
3. Consulta `user_team_memberships` do owner para descobrir seus times
4. Verifica se o usuário logado é `teams.leader_user_id` de algum desses times ou de um time pai (recursivo via `parent_team_id`)
5. Verifica se é `areas.leader_user_id` da área desses times

Retorna `{ canResolve: boolean; isLoading: boolean }`.

### Etapa 3 — Modal de resolução no `DecisionFollowUpRow`

**Arquivo:** `src/modules/okrs/pages/RitualHistoryPage.tsx`

- Ao clicar no checkbox para marcar "done":
  - Se **não tem permissão**: checkbox disabled + tooltip "Apenas o responsável ou seu líder pode resolver"
  - Se **tem permissão**: abre `Dialog` com textarea obrigatório "O que foi resolvido?"
  - Ao confirmar: grava `resolvedAt`, `resolvedBy`, `resolutionNote` e `followUpStatus: 'done'`
- Para desfazer (uncheck): permitir para quem tem permissão, limpa campos de resolução
- Quando `isDone`: exibir nota de resolução, autor e data abaixo do texto

### Etapa 4 — Atualizar mutação

**Arquivo:** `src/modules/okrs/hooks/useRitualHistory.ts`

O `useUpdateDecisionFollowUp` já aceita `Partial<TeamCheckinDecision>` nos updates — os novos campos (`resolvedAt`, `resolvedBy`, `resolutionNote`) serão gravados automaticamente no JSONB.

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/modules/okrs/types/wizard.ts` | Adicionar campos de resolução ao tipo |
| `src/modules/okrs/hooks/useCanResolveDecision.ts` | Novo hook com cadeia completa |
| `src/modules/okrs/hooks/index.ts` | Export do novo hook |
| `src/modules/okrs/pages/RitualHistoryPage.tsx` | Modal, permissão, exibição |

