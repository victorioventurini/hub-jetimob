## Pré-checklist (executado)

- ✅ `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` — **achado decisivo**: `okr_checkins.comments` no Check-in Individual (wizard colaborador) deve ser **texto puro**. Menções (@) são processadas **apenas** no `CheckinDialog` do drawer `/okrs`. → Não trazer `InternalMentionInput` para o wizard.
- ✅ `docs/canonical/IDENTITY_CONVENTION.md` — `okr_checkins.user_id` é `profile_id`. `useCreateCheckin` já usa `profileId` corretamente.
- ✅ `docs/canonical/DATA_MODEL_REGISTRY.md` — schema de `okr_checkins` confirmado; sem mudanças de DB.
- ✅ `mem://standards/progress-visualization-unification` — `OkrProgressBar` é canônico (já dentro do `CheckinProgressBlock`).
- ✅ `mem://features/rituals/collaborator-step1-order-mirrors-steps` — `STEP_ORDER` é SSOT; este plano não altera ordem nem lista de steps.

## Objetivo

Alinhar visualmente e estruturalmente o step `checkin` do Wizard Colaborador (`CollaboratorCheckinStep.tsx`) ao **modal de atualização de KR** (`CheckinDialog`), reutilizando os blocos centralizados em `src/modules/okrs/components/checkin/` — **sem duplicar componentes e respeitando o TCR (sem menções no wizard)**.

## Diagnóstico

| Bloco visual | `CheckinDialog` (modal) | `CollaboratorCheckinStep` (wizard, hoje) |
|---|---|---|
| Contexto do KR (Objetivo/KR/status) | `CheckinContextBlock` | `KrContextCard` (layout próprio) |
| Progresso: barra + Anterior → Meta + Valor atual | `CheckinProgressBlock` (com `OkrProgressBar`) | Input puro + delta textual (sem barra, sem grid Anterior/Meta) |
| Status atual (On/At/Off Track) | `CheckinStatusSelector` (3 cards) | `RadioGroup` "Confiança" (Alta/Média/Baixa) |
| KR com KPI primária bloqueada | bloco Lock + link KPI | bloco Lock + link KPI ✅ já igual |
| Reflexão | `CheckinReflectionBlock` (com mentions + próximo passo) | `Textarea` "Comentário" simples |
| Próximo passo concreto | Sim, dentro de `CheckinReflectionBlock` | Não existe |

## Mudanças propostas — somente frontend, 1 arquivo

Editar **apenas** `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx`:

1. **Reaproveitar 3 blocos centralizados do modal** (sem duplicação):
   - `CheckinContextBlock` no topo, substituindo o uso local de `KrContextCard` neste step (o `KrContextCard` continua usado em outros steps do wizard).
   - `CheckinProgressBlock` para entrada de valor + barra + grid Anterior/Meta + preview (já trata internamente o caso `isAutomatic` com `primaryKpi`).
   - `CheckinStatusSelector` no lugar do `RadioGroup` "Confiança". Mapear status RAG → confidence usando o helper `statusToConfidence` já existente em `useCreateCheckin.ts` (`green→high`, `yellow→medium`, `red→low`).

2. **Reflexão sem mentions (decisão TCR)**: 
   - Não usar `CheckinReflectionBlock` direto (ele acopla `InternalMentionInput`). 
   - **Opção A (preferida)**: criar variante leve `CheckinReflectionBlockPlain` em `src/modules/okrs/components/checkin/` que reaproveita os mesmos labels/microcopies mas usa `Textarea` puro — e usar essa variante tanto no wizard quanto, no futuro, em qualquer fluxo "sem menções". Mantém SSOT visual sem violar TCR.
   - **Opção B**: estender `CheckinReflectionBlock` com prop `enableMentions?: boolean` (default `true`) e passar `false` no wizard. Menos arquivos, mesmo SSOT.
   - Ambas trazem o campo "Próximo passo concreto (recomendado)" para o wizard, alinhando com o modal.

3. **Adaptador de dados**: construir um objeto `CheckinKrData` a partir do `WizardKr` (mapear `objective_title → team_objective.title`, `owner_name/photo → owner.display_name/photo_url`, manter `team_id`, `unit`, `direction`, etc.) — função pura local ao componente.

4. **Persistência alinhada ao modal** (sem alterar schema):
   - `comments` = `reflection.trim()` + (se houver) `"\n\n📌 Próximo passo: " + nextStep.trim()` — mesmo formato que o `CheckinDialog` grava hoje em `okr_checkins.comments`.
   - Continuar via `useCreateCheckin` (não duplicar mutation).
   - Validação: reflexão obrigatória ≥ 10 caracteres (igual ao modal). Hoje o wizard não exige reflexão — alinhar.

5. **Footer do wizard preservado**: `Voltar / Pular / Salvar e próximo / Salvar e concluir` + atalho Ctrl+Enter. Apenas o miolo (blocos) é trocado.

6. **Manter no topo**: `AlertBanner` (overdue/no_update) e `AskToVicStepHelper`. Remover `MicrocopyQuestion` redundante (a label da reflexão já carrega o prompt).

## Arquivos tocados

- **Editar**: `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx`
- **Criar (Opção A) ou Editar (Opção B)**: `src/modules/okrs/components/checkin/CheckinReflectionBlock.tsx` (ou variante `*Plain`).
- **Não criar**: nenhum bloco visual novo além do ponto acima. Zero duplicação de `CheckinContextBlock`, `CheckinProgressBlock`, `CheckinStatusSelector`.

## Não-objetivos

- Não alterar schema `okr_checkins`.
- Não trazer @menções para o wizard (proibido pelo TCR).
- Não alterar `STEP_ORDER` nem snapshot do Step 1.
- Não mexer no modal `CheckinDialog`.

## Decisão pendente (única)

**Opção A (novo `CheckinReflectionBlockPlain`)** ou **Opção B (prop `enableMentions` no bloco existente)**?
Recomendação: **Opção B** — menos arquivos, mesmo componente como SSOT visual da reflexão, controlado por uma flag clara.
