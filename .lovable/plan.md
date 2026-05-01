## Objetivo

Fechar a aderência do card "Sua semana até aqui" aos docs canônicos, sem alterar comportamento. **Apenas atualizações de memória/documentação** — zero mudança de código de produção.

## Contexto

Pré-checklist (TCR + IDENTITY_CONVENTION + PERMISSIONS_AND_RBAC_MODEL + DATA_MODEL_REGISTRY + DEVELOPMENT_STANDARDS + BU_SCOPED_SUPABASE_RULES + QUERY_KEYS_STANDARD + HOOKS_BARREL_STANDARD + WIZARDS_FRAMEWORK_BOUNDARY + memórias de Step 1) executado e o código entregue está em conformidade. Restam 2 ajustes de documentação para a memória do projeto refletir o estado atual.

## Mudanças

### 1) Atualizar `mem://features/rituals/collaborator-step1-order-mirrors-steps`

A memória atual descreve `<CollaboratorSnapshot>` como item do Step 1. Foi **substituído** por `<CollaboratorWeekActivity>` (com hook SSOT compartilhado com a trilha). Atualizar:

- Trocar referências de `CollaboratorSnapshot` por `CollaboratorWeekActivity`.
- Manter a regra inalterada: ordem espelha `STEP_ORDER` em `wizardSteps.ts` (kpis → projects → initiatives → krs → reflection).
- Acrescentar nota: "Card e trilha consomem o mesmo hook (`useCollaboratorWeekActivity`) → consistência numérica garantida por construção."

### 2) Criar `mem://features/rituals/collaborator-week-activity-card`

Nova memória `feature` com as decisões fechadas:

- **Tipo:** `feature`
- **Nome:** "Collaborator Week Activity Card"
- **Descrição:** "Card 'Sua semana até aqui' do Step 1 do Check-in Individual: read-only, 5 categorias na Seção 1, fonte SSOT compartilhada com a trilha"
- **Conteúdo:**
  - Read-only: sem CTA, sem links, sem handlers de click.
  - **Categorias entregues (5)**: KPIs atualizados, milestones concluídos, iniciativas atualizadas, KRs com check-in (+ confiança média), bloqueios registrados.
  - **Categorias omitidas (2)** com justificativa de schema:
    - `blockers_resolved` — não há coluna `resolved_at`/`resolved_by` em `okr_checkins`.
    - `help_requested` — `helpNeeded` é estado local em `CollaboratorReflectionStep`, não persiste.
    - **Como liberar**: migration que adicione `okr_checkins.help_needed text` + `okr_checkins.resolved_blockers_at timestamptz` (ou tabela `okr_checkin_resolutions`) e que o form de Reflexão passe a gravar.
  - **Janela temporal**: segunda-feira 00:00 da semana corrente até agora, na timezone local (não há `useBuTimezone` no projeto).
  - **Ordem fixa** das categorias = ordem de preenchimento do rito (`STEP_ORDER`).
  - **SSOT da Seção 2** ("ainda falta"): mesmas fontes que a trilha hoje usa (`kpisToUpdate.needs_update`, `useCollaboratorOpeningSignals`, `useCollaboratorInitiativesSignal`, `stats.krsAttention`).
  - **Query keys**: `okrsKeys.weekActivityKpis|Checkins|Milestones|Initiatives` em `src/lib/queryKeys/okrs.ts`.
  - **BU isolation**: `useBuScopedSupabase` + `enabled` síncrono em `buId`.
  - **Identidade**: `effectiveUserId` (suporta admin revisando outro); sem mutations → sem `realProfileId`.
  - **Soft-delete**: `is('deleted_at', null)` (+ `cancelled_at` em KR/team_objective) em todos os joins.
  - **Memoization**: `React.memo` no componente; `useMemo` no hook.

### 3) Atualizar `mem://index.md`

Adicionar nova entrada na seção "Memories — Rituais específicos":
```
- [Collaborator Week Activity Card](mem://features/rituals/collaborator-week-activity-card) — Card SSOT da Seção 1 do Check-in Individual; 5 categorias entregues, 2 omitidas por schema
```

E **revisar** a entrada existente para `collaborator-step1-order-mirrors-steps`, que continua válida (a regra de ordem não mudou) — não precisa renomear.

## Arquivos editados

- `.lovable/memory/features/rituals/collaborator-step1-order-mirrors-steps.md`
- `mem://index.md` (adicionar 1 linha na seção "Rituais específicos")

## Arquivos novos

- `.lovable/memory/features/rituals/collaborator-week-activity-card.md`

## Não-objetivos

- **Zero alteração de código de produção** (componente, hook, query keys, integração no Step 1 já estão conformes).
- Não criar migrations agora (campos `help_needed` / `resolved_blockers_at` ficam documentados como "como liberar no futuro").
- Não tocar em `CollaboratorSnapshot.tsx` (arquivo permanece, fora de uso).

## Validação

- Releitura das duas memórias deve descrever o estado atual do código sem contradição.
- Índice de memória deve permitir descobrir o card em buscas futuras por "collaborator", "week", "card", "step 1".
