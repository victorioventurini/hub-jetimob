# Plano — Bloquear "Criação de OKRs do Time" fora da janela

## Objetivo
Liberar o rito **Criação de OKRs do Time** apenas quando há janela de criação aberta. Fora dessa janela, esconder o card no hub `/rituals` e bloquear a rota `/okrs/create` com a tela canônica `RitualUnavailableScreen`. Admins (BU admin / platform admin) ignoram a restrição.

## Critério de janela (regra de negócio)
**Janela aberta** ⇔ existe pelo menos um **ciclo trimestral em status `planning`** na BU ativa.

- Esse status é setado quando o Pós-QBR abre o próximo quarter para planejamento.
- É a mesma fonte que o wizard já usa hoje em `useActiveCycle().planningCycles` para popular `planningQuarterlyCycles`.
- Se só existe quarter `active` rodando (e nenhum `planning`), a janela está fechada.
- Override: usuários com `isWildcard` (BU admin / platform admin) sempre passam.

## Mudanças

### 1. Novo hook `useTeamOkrCreationWindow`
`src/modules/okrs/hooks/useTeamOkrCreationWindow.ts`

- Consome `useActiveCycle()` (já existente, BU-scoped).
- Retorna `{ isOpen: boolean, nextOpensHint: string | null, isLoading: boolean }`.
- `isOpen = planningQuarterlyCycles.length > 0` (filtra `type === 'quarter'`).
- Exporta também o nome do(s) quarter(es) em planning para mensagem amigável.
- Exportar via `src/modules/okrs/hooks/index.ts`.

### 2. Guard de rota `TeamOkrCreationRoute`
`src/components/auth/TeamOkrCreationRoute.tsx`

- Combina `useIdentity` (`isWildcard`) + `useTeamOkrCreationWindow`.
- Se `isLoading` → render `LoadingState`.
- Se `isWildcard` → libera.
- Se `isOpen` → libera.
- Senão → renderiza `RitualUnavailableScreen` com:
  - `wizardType="team-okr-creation"` (label já existe no SSOT `ritualLabels.ts`).
  - `reason="not_yet"` e mensagem: *"A criação de OKRs do time abre quando um novo quarter entra em planejamento (ao final do Pós-QBR)."*
- Aplicar em `src/routes/okrs.routes.tsx` envolvendo `<OkrCreationPage />`:
  ```
  <OkrRoute><TeamOkrCreationRoute><OkrCreationPage /></TeamOkrCreationRoute></OkrRoute>
  ```

### 3. Esconder card no hub `/rituals`
`src/pages/Wizards.tsx`

- Importar `useTeamOkrCreationWindow` e `useIdentity`.
- Computar `canSeeTeamOkrCreation = isWildcard || isOpen`.
- Adicionar campo opcional `isVisible?: boolean` ao `WizardDefinition` (ou usar `gate` callback) e filtrar wizards com `isVisible === false` antes do render.
- Setar `isVisible: canSeeTeamOkrCreation` no card `team-okr-creation`.
- Não tocar nos demais cards.

### 4. Atualizar `RitualUnavailableScreen` (se necessário)
- Verificar que o componente aceita `wizardType` desconhecido sem janela computada (já é o caso — recebe `opensAt`/`message` como props). Passar `opensAt={null}` e mensagem custom; nenhum ajuste deve ser necessário.

## Validação
- **Sem ciclo planning, usuário líder de time**: card oculto no hub; acesso direto a `/okrs/create` mostra `RitualUnavailableScreen`.
- **Sem ciclo planning, BU admin**: card visível e rota acessível.
- **Com ciclo planning**: comportamento atual preservado para todos os perfis com `okrs.team_objective.create:team`.
- Garantir que `useTeamOkrCreationWindow` respeita BU isolation (via `useActiveCycle`, que já filtra por `currentBuId`).
- Smoke: navegar pelo hub e por `/okrs/create` em ambos cenários.

## Não-objetivos
- Não altera lógica do wizard, draft, criação de OKR ou RLS de `okr_team_objectives`.
- Não cria janela em dias úteis no `useRitualAvailability` (este rito não é cycle-date-driven; depende do status do ciclo, não de data).
- Não mexe em outros cards do hub.

## Arquivos
- **Criar**: `src/modules/okrs/hooks/useTeamOkrCreationWindow.ts`, `src/components/auth/TeamOkrCreationRoute.tsx`
- **Editar**: `src/modules/okrs/hooks/index.ts`, `src/routes/okrs.routes.tsx`, `src/pages/Wizards.tsx`
