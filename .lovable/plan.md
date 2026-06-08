
## Objetivo

Disponibilizar, na UI, um **modal de check-in para KR organizacional** equivalente ao das KRs de time — com histórico persistido, respeitando a Core Rule "Primary KPIs dictate KR progress automatically" e restrito a **owner da Org KR + BU Admin**.

## Decisões-chave (pré-checklist consultado)

- **OKRs canonical** (`docs/canonical/modules/okrs.md` + `mem://features/okrs/okrs-master-standard`): toda atualização de KR passa pelo cálculo canônico (`calculateProgress`); RAG é o mesmo do team KR.
- **Schema atual**: `okr_checkins.kr_id` tem FK exclusiva para `okr_team_key_results`. Para registrar histórico de Org KR sem quebrar essa FK, criamos uma tabela espelho `okr_org_checkins`.
- **Reuso obrigatório**: os blocos `CheckinContextBlock`, `CheckinProgressBlock`, `CheckinStatusSelector`, `CheckinReflectionBlock` já são puros (recebem `kr` como prop). Vamos **generalizar `CheckinKrData`** e **introduzir um único `CheckinDialog` polimórfico** (por `scope: 'team' | 'org'`), não duplicar.
- **Core Rule respeitada**: campo de valor fica read-only quando há KPI primária OU agregação de KRs de time cascade.
- **Permissão**: gate via permission key `okrs.org_objective.update:bu` **OU** `owner_user_id === realProfileId`.

## Mudanças

### 1. Backend (migração única)

- **Nova tabela `okr_org_checkins`** espelhando `okr_checkins` (kr_id → `okr_org_key_results(id)`, previous_value, current_value, confidence, comments, user_id → profiles, bu_id, team_id NULL, created_at/updated_at).
- **Trigger** `set_bu_id_from_org_kr` para preencher `bu_id`.
- **GRANT** SELECT/INSERT/UPDATE/DELETE para `authenticated`, ALL para `service_role`.
- **RLS**:
  - `select`: membro da BU.
  - `insert`: `has_role(auth.uid(), 'admin')` na BU **OU** `user_id = realProfileId` AND `owner_user_id(kr) = realProfileId`. Função `can_checkin_org_kr(_kr_id, _profile_id)` SECURITY DEFINER.
  - `update/delete`: BU Admin only.
- **Sem CHECK constraints** — usar trigger de validação se preciso.

### 2. Generalização dos componentes de check-in (sem duplicação)

- `src/modules/okrs/components/checkin/checkinTypes.ts`:
  - Adicionar `scope: 'team' | 'org'` em `CheckinKrData`.
  - Tornar `team_id` opcional; adicionar `org_objective?: { title; cycle_id }`.
- `CheckinContextBlock`: ramificar título contextual ("Time X" vs "Organização / Objetivo Y").
- `CheckinProgressBlock`: já recebe `isAutomatic` — basta passar verdadeiro quando houver KPI primária OU KRs de time cascade.
- Demais blocos: sem mudança.

### 3. `CheckinDialog` polimórfico

- Em `CheckinDialog.tsx`, ramificar pelo `kr.scope`:
  - **team**: comportamento atual (`okr_checkins.insert` + `okr_team_key_results.update`).
  - **org**: insert em `okr_org_checkins` + update em `okr_org_key_results(current_value, status)`.
- `usePrimaryKpiForKr(kr.id, kr.scope)` já aceita `'team' | 'org'` — verificar e ajustar se necessário.
- Detecção de "cascade ativa" via novo hook `useOrgKrCascadeSources(orgKrId)` que consulta `okr_team_key_results.parent_org_kr_id` (ou tabela de mapeamento existente). Se houver KR filha contribuindo → `isAutomatic = true`.
- Mensagem explicativa quando bloqueado: "Valor derivado automaticamente da KPI primária / das KRs de time vinculadas."

### 4. Hooks

- `useCreateOrgCheckin` (espelho de `useCreateCheckin`) — fonte única de mutation para Org check-in (reuso futuro em wizards executivos).
- Invalidar `queryKeys.okrs.orgKeyResults`, `queryKeys.okrs.orgObjective(id)`, `queryKeys.okrs.dashboardDataPrefix()`.

### 5. UI — pontos de chamada

- `OrgKrExpandableCard` (`src/modules/okrs/components/org-view/OrgKrExpandableCard.tsx`): adicionar botão **"Atualizar"** ao lado do header da Org KR (visível somente se o usuário tem permissão — usar `useIdentity` + permission key).
- `OrgObjectiveViewPage`: nenhum ajuste estrutural.
- `Visão Executiva` (`ExecutiveDashboardPage`): adicionar a mesma ação no card da Org KR.

### 6. Permissão

- Helper `useCanCheckinOrgKr(orgKr)`:
  - `realProfileId === orgKr.owner_user_id` **ou**
  - `hasPermission('okrs.org_objective.update:bu')`.
- Gate aplicado tanto no botão (esconder/desabilitar) quanto no RLS (defesa em profundidade).

### 7. Testes

- Migração: smoke SQL no PR (insert válido owner / insert inválido não-owner / select cross-BU bloqueado).
- Unit: `CheckinDialog` em modo `org` (mocked supabase), garantindo insert em `okr_org_checkins` e update em `okr_org_key_results`.
- E2E: cenário em `e2e/okrs.spec.ts` — owner abre modal, atualiza valor, vê linha no histórico.

## Detalhes técnicos

```text
checkin/ (já existe)
├── CheckinContextBlock      ← generalizar título (team|org)
├── CheckinProgressBlock     ← reuso direto
├── CheckinStatusSelector    ← reuso direto
├── CheckinReflectionBlock   ← reuso direto
└── checkinTypes.ts          ← + scope, + org_objective

CheckinDialog.tsx            ← ramificar mutation por scope
hooks/
├── useCreateCheckin.ts      ← inalterado (team)
├── useCreateOrgCheckin.ts   ← NOVO (org, espelho)
└── useOrgKrCascadeSources.ts← NOVO (detecta cascade)

components/org-view/
└── OrgKrExpandableCard.tsx  ← + botão "Atualizar" + dialog

supabase/migrations/<ts>_okr_org_checkins.sql
```

### Histórico exibido

- Drawer/seção no `OrgKrExpandableCard` reaproveitando `KrHistoryDialog` parametrizado por `scope`. (Ajuste mínimo: tabela-fonte por scope.)

## Não faremos

- Não duplicar `CheckinDialog` em `OrgCheckinDialog` (proibido por instrução).
- Não tocar em `CheckinReflectionBlock`, `CheckinStatusSelector` (zero mudança).
- Não alterar a FK de `okr_checkins` (mantemos tabela separada para clareza semântica e evitar regressão em queries existentes).
- Não permitir override quando há KPI primária ou cascade (canon).
