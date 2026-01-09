# OKR Check-in Wizard — Relatório de Implementação

## Visão Geral

O **Wizard de Check-in em Grupo** é um fluxo guiado para rituais de check-in de time, reduzindo fricção e garantindo consistência de dados durante reuniões.

## Acesso

- **Entrada**: Botão "Iniciar Check-in do Time" na página `/okrs/checkins`
- **Componente**: Sheet full-screen (lado direito)

## Estrutura do Wizard

### Passo 0 — Setup

Configuração inicial com seleção de:
- **Ciclo**: Apenas ciclos trimestrais (conforme regra de negócio)
- **Time**: Limitado aos times gerenciáveis pelo usuário (RBAC)

O sistema inclui automaticamente sub-times na seleção.

### Passo 1 — Seleção de KRs

Triagem inteligente com três filtros:
- **Pendentes**: KRs sem check-in há mais de 7 dias
- **Em Risco**: KRs com status yellow ou red
- **Todos**: Todos os KRs do time no ciclo

Ações rápidas:
- "Selecionar pendentes" para focar no que importa
- "Selecionar visíveis" para seleção em lote

### Passo 2 — Check-in Sequencial

Para cada KR selecionado:

**Contexto (read-only):**
- Objetivo pai
- Título do KR
- Progresso atual (baseline → current → target)
- Último check-in

**Inputs:**
- Valor atual (obrigatório)
- Confiança: Alta/Média/Baixa (obrigatório)
- Comentário com suporte a @menções
- Bloqueadores

**Atalhos:**
- `Ctrl+Enter`: Salvar e próximo

### Passo 3 — Resumo

Visão consolidada do encontro:
- Quantidade de check-ins realizados
- KRs pulados
- Bloqueadores registrados
- Lista detalhada de resultados

Ações:
- Navegar para `/okrs/checkins` com filtros
- Copiar resumo em Markdown
- Encerrar wizard

## Arquitetura

### Componentes Criados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `CheckinWizard` | `components/CheckinWizard.tsx` | Orquestrador principal |
| `WizardSetup` | `components/wizard/WizardSetup.tsx` | Passo 0 |
| `WizardKrSelection` | `components/wizard/WizardKrSelection.tsx` | Passo 1 |
| `WizardCheckinStep` | `components/wizard/WizardCheckinStep.tsx` | Passo 2 |
| `WizardSummary` | `components/wizard/WizardSummary.tsx` | Passo 3 |

### Hooks Criados

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useTeamPendingKrs` | `hooks/useTeamPendingKrs.ts` | Busca KRs para wizard |
| `useCreateCheckin` | `hooks/useCreateCheckin.ts` | Mutation de check-in |

### Componentes Reutilizados

- `KrHistoryDialog` — Drill-down de histórico
- `MentionInput` — Input com @menções (canônico)
- `useManageableTeamsFlat` — RBAC de times
- `useCycles` / `useActiveCycles` — Dados de ciclos
- `emit_notification_event` — Notificações de menção

## Decisões de UX

1. **Sheet vs Página**: Optamos por Sheet full-screen para manter contexto da página de check-ins

2. **Filtro "Pendentes" como default**: Foco no que precisa de atenção imediata

3. **Confiança visual**: Cards clicáveis com cores ao invés de dropdown

4. **Atalho de teclado**: Ctrl+Enter para velocidade em reuniões

5. **Resumo copiável**: Markdown para compartilhar em Slack/Teams

## Conformidade com TCR

| Regra | Status | Evidência |
|-------|--------|-----------|
| IDENTITY: profile_id | ✅ | `useCreateCheckin` usa `profileId` |
| RBAC: teams scope | ✅ | `get_okr_manageable_team_ids` |
| Notifications: emit_notification_event | ✅ | Menções disparam RPC |
| QueryKeys: centralizado | ✅ | Usa `queryKeys.okrs.*` |
| URL State: quando aplicável | ✅ | Wizard interno, navegação final usa URL |

## Integração

Botão adicionado em:
- `/okrs/checkins` (CycleCheckinsPage)

## QA

Ver [QA_OKR_CHECKIN_WIZARD.md](./qa/QA_OKR_CHECKIN_WIZARD.md) para checklist completo.

### Testes Realizados

- [x] Líder vê apenas times próprios + descendentes
- [x] Seleção de KRs pendentes funciona
- [x] Check-in cria registro em okr_checkins
- [x] Menções disparam notificação
- [x] Resumo final condiz com dados

## Próximos Passos (Sugestões)

1. Adicionar botão no dashboard de OKRs (`/okrs`)
2. Suporte a edição de check-in já salvo (undo)
3. Integração com calendário para rituais recorrentes
