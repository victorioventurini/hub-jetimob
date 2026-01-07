# QA Checklist - Leader Dashboard

## TCR v2.4.0 - Leader Dashboard Evolution

### Usuários de Teste

| Usuário | Role | Descrição |
|---------|------|-----------|
| super_admin | super_admin | Admin global - deve ver dashboard executive |
| admin_bu | admin | Admin da BU - deve ver dashboard executive |
| leader_1 | team_leader | Líder de time raiz - deve ver LeaderDashboard |
| leader_sub | team_leader | Líder de sub-time - deve ver LeaderDashboard |
| collaborator_1 | collaborator | Membro do time - deve ver dashboard collaborator |
| external_partner | external | Usuário externo - não deve ver Leader dashboard |

---

### Cenários de Teste

#### 1. Detecção de Perfil Leader

| Cenário | Status | Observação |
|---------|--------|------------|
| Leader com 1 time vê dashboard Leader | ⏳ | |
| Leader com múltiplos times vê dropdown | ⏳ | |
| Executive (admin) NÃO vê dashboard Leader | ⏳ | |
| Collaborator NÃO vê dashboard Leader | ⏳ | |
| External user NÃO vê dashboard Leader | ⏳ | |

#### 2. Team Selector (LeaderScopeSelector)

| Cenário | Status | Observação |
|---------|--------|------------|
| Leader com 1 time vê selector read-only | ⏳ | |
| Leader com múltiplos times pode alternar | ⏳ | |
| Alternar time invalida queries e recarrega | ⏳ | |
| Seleção persiste em localStorage | ⏳ | |
| Trocar BU limpa seleção anterior | ⏳ | |

#### 3. Critical Alerts (TeamCriticalAlertsCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Card aparece apenas se houver alertas | ⏳ | |
| Alertas ordenados por severidade | ⏳ | |
| CTA de cada alerta navega corretamente | ⏳ | |
| Assets overdue aparecem como high severity | ⏳ | |
| Tickets overdue aparecem como high severity | ⏳ | |

#### 4. Focus Card (LeaderTodayFocusCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Exibe máximo 3 itens | ⏳ | |
| Itens têm CTA clicável | ⏳ | |
| Empty state mostra mensagem positiva | ⏳ | |

#### 5. OKRs Card (TeamOkrsCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Mostra contadores green/yellow/red/not_started | ⏳ | |
| Badge de check-ins pendentes aparece | ⏳ | |
| CTA navega para OKRs com filtro de time | ⏳ | |
| Card hidden se usuário não tem permission okrs.read | ⏳ | |

#### 6. Tickets Card (TicketsTeamInboxCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Mostra total abertos | ⏳ | |
| Mostra aguardando / aguardando terceiros / vencendo | ⏳ | |
| CTA navega para Tickets | ⏳ | |
| Card hidden se sem permission tickets.read | ⏳ | |

#### 7. Assets Card (AssetsTeamLoansCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Mostra ativos / atrasados / vencendo | ⏳ | |
| Lista top 3 empréstimos críticos | ⏳ | |
| Badge de atrasado/vencendo aparece | ⏳ | |
| Card hidden se sem permission assets.read | ⏳ | |

#### 8. KPIs Card (TeamKpisCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Mostra até 4 KPIs | ⏳ | |
| Trend icons corretos (up/down/stable) | ⏳ | |
| CTA navega para KPIs | ⏳ | |
| Card hidden se sem permission kpis.read | ⏳ | |

#### 9. Vic Insights Card (VicLeaderInsightsCard)

| Cenário | Status | Observação |
|---------|--------|------------|
| Mostra 3 sugestões clicáveis | ⏳ | |
| Clicar em sugestão abre Vic com contexto | ⏳ | |
| CTA "Conversar com Vic" funciona | ⏳ | |

#### 10. BU Scope & RLS

| Cenário | Status | Observação |
|---------|--------|------------|
| Trocar BU e recarregar mostra dados da nova BU | ⏳ | |
| RPC valida user_can_manage_team | ⏳ | |
| RPC retorna FORBIDDEN_TEAM_SCOPE se sem permissão | ⏳ | |

#### 11. Visibilidade de Tickets por Time

| Cenário | Status | Observação |
|---------|--------|------------|
| Tickets bu_all aparecem para líder | ⏳ | |
| Tickets visibility=teams com team_id do time aparecem | ⏳ | |
| Tickets de sub-times aparecem (descendência) | ⏳ | |
| Tickets private NÃO aparecem (se não for owner/participante) | ⏳ | |

#### 12. Assets por Membros do Time

| Cenário | Status | Observação |
|---------|--------|------------|
| Empréstimos de membros do time selecionado aparecem | ⏳ | |
| Empréstimos de sub-times aparecem | ⏳ | |
| Empréstimos de outros times NÃO aparecem | ⏳ | |

---

### Status Legend

- ⏳ Pending
- ✅ PASS
- ❌ FAIL
- ⚠️ Partial

---

### Notas de Implementação

- RPCs criadas: `get_leader_teams`, `rpc_leader_dashboard_summary`, `rpc_leader_dashboard_focus`, `is_user_leader`
- Funções auxiliares: `get_team_member_ids`, `get_descendant_team_ids`
- Índices criados para performance
- useBuScopedSupabase utilizado nos hooks
