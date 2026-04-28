## Objetivo

Permitir que o colaborador **atualize de fato** projetos, milestones e iniciativas durante o `/rituals/collaborator-checkin`, fechando o gap em relação a KRs e KPIs (que já permitem update completo). Toda mutação respeita as governanças canônicas do Hub (TCR §3.3.1 Projetos v1.4–v1.9, memórias `milestone-permissions-row-aware`, `holistic-module-architecture-v2`, `kpis-master-standard`, `wizard-draft-isolation`).

Escopo restrito a **itens onde o colaborador é responsável** (UI gating + RLS já existente).

---

## Estado atual × o que muda

| Step | Hoje | Depois |
|------|------|--------|
| KRs (`checkin`) | ✅ valor + status + nota (check-in completo) | sem mudança |
| KPIs (`kpis`) | ✅ valor + nota + confiança (governança v3.0.0) | sem mudança |
| **Projetos / Milestones** (`projects`) | ⚠️ apenas o `status` do milestone via select inline | + edição completa do milestone via `MilestoneDialog` (canônico) quando o usuário é owner do milestone OU do projeto; + edição de status/datas/descrição do projeto via `useUpdateProject` (RPC `update_project_v2`) quando é owner do projeto |
| **Iniciativas** (`initiatives`) | ❌ read-only (toggle "em risco" só local, não persiste) | ✅ edição completa via `InitiativeQuickUpdateDialog` (canônico) — status, progresso, prioridade, nota, motivo de bloqueio — apenas quando `owner_user_id = colaborador` |
| Métricas (KR / KPI) | coberto pelos steps acima | sem mudança |

Persistência: **inline fire-and-forget** via hooks/RPCs canônicas. Nada vai para o draft (alinhado a `wizard-draft-isolation`). O draft segue contendo só snapshot de KRs/KPIs/reflexão.

---

## Implementação

### 1. `CollaboratorProjectsStep` — ampliar edição via componentes canônicos
- Mantém o select inline de `status` do milestone (já funciona).
- **Novo:** ícone de lápis ao lado do nome do milestone (somente quando `canEditMilestone` for true) abre o **`MilestoneDialog`** já existente em modo edit. Esse dialog cobre nome, datas, status, owner e `notes` com salvar manual (governança Projects v1.7), eliminando a necessidade de inputs custom dentro do step.
- **Novo:** quando `project.owner_id === effectiveUserId`, o header do card ganha botão "Editar projeto" que abre o **`ProjectDialog`** existente em modo edit. Persistência via `useUpdateProject` (RPC `update_project_v2`, whitelist canônica).
- **Gating UI:** usa `useProjectPermissionsV2` + `canEditMilestoneRecord` para decidir se mostra os botões. Itens fora do gate ficam read-only sem botão (sem desabilitar para não confundir).
- **Sem auto-save de notas** (proibido pela governança v1.7) — o `MilestoneDialog` já trata isso corretamente.
- Invalidação de cache fica inteiramente nos hooks canônicos (já fazem isso).

### 2. `CollaboratorInitiativesStep` — virar editável
- Substituir o estado local `markedAtRisk` por edição real, abrindo o **`InitiativeQuickUpdateDialog`** já existente (mesmo padrão usado em outras telas — não criamos UI nova).
- Cada linha da `InitiativesSummary` ganha botão "Atualizar" **apenas quando `initiative.owner_user_id === effectiveUserId`**. Fora disso, item segue read-only sem botão.
- O `krContext` do dialog é populado a partir do KR pai já carregado no step.
- O parâmetro `initiativesMarkedAtRisk` no draft passa a ser sempre `[]` neste step (não removemos do tipo para não quebrar drafts antigos / summary). O Summary continua exibindo a seção apenas se vier não-vazia (retrocompat).

### 3. `InitiativesSummary` — abrir slot de edição
- Adicionar prop opcional `onEdit?: (initiative) => void`. Quando presente e o item for do owner, renderiza botão "Atualizar".
- Sem mudança de comportamento para os outros consumidores (prop opcional).

### 4. Sumário (`CollaboratorSummary`)
Iteração 1 (escopo): **não mexer**. As mutações são fire-and-forget e fora do draft; o cache invalidado já reflete os novos valores onde forem exibidos. Adicionar contadores de "atualizações desta sessão" exigiria ref tracking entre steps — fica para uma 2ª iteração se houver demanda.

### 5. Padrões obrigatórios aplicados
- **BU isolation:** todos os queries continuam via `useBuScopedSupabase` filtrados por `bu_id` (já está assim).
- **Identity:** mutations via hooks canônicos que já consomem `useIdentity().realProfileId` quando necessário.
- **Soft-delete filter:** `deleted_at IS NULL` em todas as queries (já está).
- **Sem `select('*')`:** mantemos colunas explícitas.
- **`React.memo`** nos cards e linhas de lista (memoization standard).
- **Toasts:** `useUpdateMilestone`/`useUpdateProject`/`useUpdateInitiative` já emitem toasts canônicos — não duplicar.
- **Edição de projeto** vai pela RPC `update_project_v2` (já encapsulada em `useUpdateProject`) — nunca UPDATE direto.

---

## Arquivos afetados

**Editados**
- `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`
  - Adiciona botões "Editar milestone" / "Editar projeto" e abre dialogs canônicos.
  - Importa `MilestoneDialog`, `ProjectDialog`, `useProjectPermissionsV2`, `canEditMilestoneRecord`, `useIsLeaderOfProjectOwner`.
- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`
  - Substitui toggle local por integração com `InitiativeQuickUpdateDialog`.
  - Sempre passa `[]` para `onContinue` (retrocompat).
- `src/modules/okrs/components/wizards/shared/InitiativesSummary.tsx`
  - Adiciona prop opcional `onEdit?: (initiative) => void` e renderiza botão quando aplicável.

**Sem alterações**
- Hooks (`useUpdateMilestone`, `useUpdateProject`, `useUpdateInitiative`) — já existem e são canônicos.
- Schema, RLS, RPCs, edge functions, draft state, query keys.
- `CollaboratorSummary`, `CollaboratorCheckinPage` (mudança mínima — `markedAtRisk` continua sendo passado como `[]`).

---

## Fora do escopo
- Edição de **nome** de milestone/projeto/iniciativa fora dos dialogs canônicos (já cobertos por eles para quem tem permissão).
- Criar novos milestones/iniciativas/projetos durante o rito.
- Soft-delete (governança exige RPCs e fluxo de confirmação fora deste rito).
- Step novo de "Métricas" — KR e KPI já cobrem, conforme `kpis-master-standard`.
- Bloco "Atualizações desta sessão" no summary (fica para iteração 2).
- Mudanças em RLS, migrations ou edge functions.

---

## Validação (manual após implementar)
1. Logado como colaborador comum, abrir `/rituals/collaborator-checkin`.
2. Step Projetos:
   - Abrir "Editar milestone" em marco meu → `MilestoneDialog` abre com dados atuais → salvar nova `due_date` + nota → toast de sucesso → reabrir confirma persistência.
   - Em marco de outro owner: botão de edição **não aparece**.
   - Em projeto onde sou owner: "Editar projeto" → `ProjectDialog` abre → alterar status → toast → persiste.
3. Step Iniciativas:
   - Em iniciativa minha: clicar "Atualizar" → `InitiativeQuickUpdateDialog` abre → mudar status para `blocked` + `blocker_reason` + nota → salvar → toast → lista reflete.
   - Em iniciativa de outro owner: sem botão.
4. Concluir o rito normalmente — KRs/KPIs/reflexão seguem inalterados; nenhuma regressão.

---

## Conformidade com pré-checklist
- ✅ TCR §3.3.1 (Projetos v1.4–v1.9) — uso dos componentes/hooks listados como canônicos.
- ✅ `mem://features/projects/milestone-permissions-row-aware` — gating via `canEditMilestoneRecord`; sem soft-delete neste rito.
- ✅ `mem://features/projects/holistic-module-architecture-v2` — uso de `MilestoneDialog`/`ProjectDialog` + RPC `update_project_v2`; notas com salvar manual.
- ✅ `mem://features/kpis/kpis-master-standard` — KPI step inalterado, governança v3.0.0 mantida.
- ✅ `mem://standards/wizard-draft-isolation` — mutações ficam fora do draft.
- ✅ BU isolation, soft-delete, identity, query optimization e memoization (Core rules) — preservadas.
