# QA: Wizard de Check-in em Grupo (OKRs)

> Versão: 1.0  
> Última atualização: 2025-01-09

## Visão Geral

Wizard que guia uma reunião de check-in do time, com etapas claras e foco em KRs pendentes e em risco.

## Rota / Entrada

- **Botão**: "Iniciar Check-in do Time" na página `/okrs/checkins`
- **Modal**: Sheet full-screen (lado direito)
- **URL State**: Não utiliza (estado interno do wizard)

## Etapas do Wizard

### Passo 0 — Setup
- Seleção de ciclo (apenas trimestrais)
- Seleção de time (via `get_okr_manageable_team_ids`)
- Banner: "Você está fazendo check-in para: {Team} — {Cycle}"

### Passo 1 — Seleção de KRs
- Tabs: Pendentes (>7 dias), Em Risco (yellow/red), Todos
- Lista com checkbox para seleção múltipla
- Botão "Selecionar pendentes" para ação rápida

### Passo 2 — Check-in Sequencial
- Card de contexto (objetivo, KR, progresso, último check-in)
- Inputs: valor atual, confiança (obrigatórios), comentário, bloqueadores
- Botões: "Salvar e próximo", "Pular", "Salvar e concluir"
- Atalho: Ctrl+Enter para salvar

### Passo 3 — Resumo
- Cards: Concluídos, Pulados, Bloqueadores
- Lista de resultados agrupados
- CTAs: "Ver check-ins do ciclo", "Copiar resumo", "Encerrar"

## Checklist de QA

### Setup (Passo 0)
- [ ] Apenas ciclos trimestrais aparecem no dropdown
- [ ] Apenas times gerenciáveis aparecem (via RBAC)
- [ ] Usuário sem times gerenciáveis vê mensagem de erro
- [ ] Banner mostra time + ciclo selecionados
- [ ] Botão "Começar" só habilita com seleções válidas

### Seleção de KRs (Passo 1)
- [ ] Tab "Pendentes" mostra apenas KRs sem check-in há >7 dias
- [ ] Tab "Em Risco" mostra apenas KRs yellow/red
- [ ] Tab "Todos" mostra todos os KRs do ciclo/time
- [ ] Contadores nas tabs estão corretos
- [ ] "Selecionar pendentes" funciona
- [ ] "Selecionar visíveis" funciona
- [ ] "Limpar" remove todas as seleções
- [ ] Botão "Fazer check-in" desabilitado sem seleção

### Check-in Sequencial (Passo 2)
- [ ] Contexto do KR é exibido corretamente
- [ ] Progresso atual é exibido
- [ ] Valor anterior é preenchido por padrão
- [ ] Preview de variação aparece ao mudar valor
- [ ] Confiança é selecionável (3 opções visuais)
- [ ] MentionInput funciona com @
- [ ] "Ver histórico" abre KrHistoryDialog
- [ ] "Pular" não salva e avança
- [ ] "Salvar e próximo" cria check-in e avança
- [ ] Último KR mostra "Salvar e concluir"
- [ ] Ctrl+Enter funciona como atalho

### Backend (Check-in)
- [ ] okr_checkins é criado com dados corretos
- [ ] user_id é profile_id (não auth.uid())
- [ ] okr_team_key_results.current_value é atualizado
- [ ] okr_team_key_results.status é atualizado
- [ ] Menções disparam emit_notification_event

### Resumo (Passo 3)
- [ ] Contadores refletem resultados reais
- [ ] Lista de concluídos mostra variação de valor
- [ ] Lista de pulados está correta
- [ ] Bloqueadores são listados separadamente
- [ ] "Ver check-ins do ciclo" navega com filtros corretos
- [ ] "Copiar resumo" copia markdown para clipboard
- [ ] "Encerrar" fecha o wizard

### Permissões (RBAC)
- [ ] Líder vê times próprios + descendentes
- [ ] Sub-líder NÃO vê time pai
- [ ] Admin vê todos os times da BU
- [ ] Usuário comum sem times gerenciáveis não pode iniciar

### UX/UI
- [ ] Wizard abre como Sheet full-screen
- [ ] Progress bar mostra etapa atual
- [ ] Step indicators mostram passos completos
- [ ] Navegação "Voltar" funciona em todas as etapas
- [ ] Wizard pode ser fechado a qualquer momento
- [ ] Loading states aparecem durante operações

### Performance
- [ ] Busca de KRs é rápida (<2s)
- [ ] Salvar check-in é rápido (<1s)
- [ ] Sem queries N+1 ao buscar owners

## Componentes Utilizados

- `CheckinWizard` - Componente principal
- `WizardSetup` - Passo 0
- `WizardKrSelection` - Passo 1
- `WizardCheckinStep` - Passo 2
- `WizardSummary` - Passo 3
- `KrHistoryDialog` - Drill-down (reutilizado)
- `MentionInput` - Menções (canônico)

## Hooks

- `useTeamPendingKrs` - KRs para seleção
- `useCreateCheckin` - Criação de check-in
- `useManageableTeamsFlat` - Times para filtro
- `useCycles` / `useActiveCycles` - Ciclos

## Backend

- RPC: `get_okr_manageable_team_ids(p_bu_id)`
- RPC: `emit_notification_event` (menções)
- Tabelas: `okr_checkins`, `okr_team_key_results`
- Trigger: `trigger_update_kr_on_checkin`

## Erros Comuns

1. **Sem times gerenciáveis**: Mostrar mensagem clara
2. **Ciclo não selecionado**: Usar ciclo ativo como default
3. **Valor inválido**: Validar antes de salvar
4. **Menção falha**: Log error, não bloquear check-in
