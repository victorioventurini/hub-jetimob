

# Exibir data do ultimo check-in no primeiro step de cada wizard

## Contexto

Atualmente, nenhum dos 5 wizards de check-in exibe a data do ultimo ritual realizado em seu primeiro step. A informacao existe na tabela `okr_wizard_sessions` (campo `completed_at` com `status = 'completed'`), mas nao e consumida pelos componentes de abertura.

## Abordagem

Criar um hook reutilizavel que consulta a ultima sessao completada por `wizard_type` (e opcionalmente `team_id`), e injetar a data resultante no primeiro step de cada wizard.

## Alteracoes

### 1. Nova query key em `src/lib/queryKeys/okrs.ts`

Adicionar:
```typescript
lastCompletedSession: (wizardType: string, teamId?: string | null) =>
  ['okr-wizard-last-completed', wizardType, teamId] as const,
```

### 2. Novo hook `src/modules/okrs/hooks/useLastCompletedSession.ts`

Hook que consulta `okr_wizard_sessions` filtrando por:
- `wizard_type = <tipo>`
- `status = 'completed'`
- `team_id = <teamId>` (quando aplicavel: team-checkin, leader-prep)
- Ordenado por `completed_at DESC`, `limit(1)`

Retorna `{ lastCompletedAt: string | null, isLoading: boolean }`.

### 3. Componente compartilhado `LastCheckinBadge`

Pequeno componente inline (icone Calendar + texto formatado) para exibir "Ultimo check-in: DD/MM/AAAA" ou "Nenhum check-in realizado". Sera adicionado ao `WizardStepHeader` via prop `rightContent` ou diretamente no header de cada step.

### 4. Integracao nos 5 wizards (primeiro step de cada)

| Wizard | Pagina | Step 1 | wizard_type | Escopo team_id |
|--------|--------|--------|-------------|----------------|
| Collaborator | `CollaboratorCheckinPage` | `CollaboratorContextStep` | `collaborator-checkin` | Nao |
| Leader Prep | `LeaderPrepPage` | `LeaderOverviewStep` | `leader-prep` | Sim |
| Team Check-in | `TeamCheckinPage` | `TeamOpeningStep` | `team-checkin` | Sim |
| Managers | `ManagersCheckinPage` | `ManagersPanoramaStep` | `managers-checkin` | Nao |
| C-Level | `CLevelCheckinPage` | `CLevelCompanyOkrsStep` | `clevel-checkin` | Nao |

Para cada wizard:
- Chamar `useLastCompletedSession(wizardType, teamId?)` na **Page**
- Passar `lastCompletedAt` como prop para o step 1
- Renderizar `LastCheckinBadge` no header do step

### 5. Exportar hook no barrel `src/modules/okrs/hooks/index.ts`

## Detalhes Tecnicos

- Query usa `useBuScopedSupabase` (dados POST-BU conforme regra #1)
- Query key via `queryKeys.okrs.lastCompletedSession(...)` (regra #5)
- Select explicito: `select('completed_at')` (regra #4 - sem `select('*')`)
- `staleTime: 5 * 60 * 1000` (5 min, dado que nao muda com frequencia)
- Formatacao de data com `date-fns` (`format(date, "dd/MM/yyyy 'as' HH:mm")`) em pt-BR

