# Hub da Jet — Changelog

> Histórico completo. Para o catálogo técnico atual, ver `TECHNICAL_CONTEXT_REGISTRY.md`. Política de retenção em `DOCS_RETENTION_POLICY.md`.

## Changelog

### v3.30.1 (2026-05-04) — Remoção do MBR v2

- **MBR v2 removido por completo** (decisão do usuário 2026-05-04):
  - Apagados: `src/modules/okrs/pages/MbrV2Page.tsx`, `src/modules/okrs/hooks/useMbrV2ObjectiveAnalyses.ts`, `src/modules/okrs/types/wizard/mbr-v2.ts`, `docs/canonical/MBR_RITUAL.md`.
  - Removidas todas as entradas `'mbr-v2'` em `routes/rituals.routes.tsx` (rota `/rituals/mbr-v2` agora redireciona para `/rituals/mbr`), `pages/Wizards.tsx`, `types/wizard/core.ts`, `types/wizard/index.ts`, `constants/ritualLabels.ts`, `attendanceConfig.ts`, `evaluationConfig.ts`, `structureVersions.ts`.
  - Migration: `'mbr-v2'` removido da CHECK constraint `okr_wizard_sessions_wizard_type_check` e da função `get_public_ritual_evaluation_form`. Drafts pendentes deletados.
  - MBR v1 (`/rituals/mbr`) e Pré-MBR permanecem intactos.

### v3.30.0 (2026-05-04) — Pré-MBR Hardening

- **Pré-MBR — KPI Gate ancorado ao mês de referência**:
  - Novo classificador `classifyKpiGateBucketsFromMonthlySnapshots()` em `stepContentAdapters.ts` recebe `MonthlyKpiSnapshotForGate[]` e classifica buckets (overdue / critical / attention / healthy) usando `currentValue` / `previousValue` / `ragStatus` ancorados ao **fim do mês de referência**.
  - `MbrPreKpiGateStep` migrado de `useKpisForWizardV2` para `useMbrPreTeamKpisMonthly(teamId, referenceMonth)`; `reconciledSnapshots` mescla snapshots mensais com persistidos no draft.
  - Resultado: análise de KR/KPI deixa de ser contaminada por valores de meses futuros.
- **Pré-MBR — drafts resilientes**:
  - `MbrPreProjectsStep` adiciona memo `safeProjectJustifications = { projects: ... ?? {}, milestones: ... ?? {} }` consumido tanto na validação de itens bloqueantes quanto na renderização.
  - `MbrPrePage` aplica fallback `?? { projects: {}, milestones: {} }` ao prop e aos handlers `onProjectJustificationChange` / `onMilestoneJustificationChange`.
  - Elimina `TypeError: Cannot read properties of undefined (reading 'projects')` em drafts antigos.
- **Documentação**:
  - Novo doc canônico [`PRE_CHECKLIST.md`](./PRE_CHECKLIST.md) — espelho legível do pré-checklist obrigatório.
  - `DEVELOPMENT_STANDARDS.md` v1.31.0 (Resilient Draft Hydration; PostgREST `or()` array-contains quoting; Lazy with retry; Entity name length limits; anti-pattern de leitura de campos denormalizados em snapshots; nova Seção P).

### v3.13.0 (2026-03-20) — Asset Audit History v1.0
- **Trilha de auditoria field-level para Assets**:
  - Triggers automáticos em `asset_inventory`, `asset_keyrings` e `asset_phone_lines` → grava diffs na tabela `audit_logs`
  - Hook genérico `useAuditHistory` reutilizável por qualquer módulo
  - Componente compartilhado `AuditHistoryTimeline` com suporte a `fieldLabels`, `valueLabels` e `ignoredFields`
  - `usePhoneLineHistory` refatorado para usar hook genérico
  - Query keys: `assetsKeys.inventory.history()`, `assetsKeys.keys.history()`
- **Submódulo Linhas Telefônicas documentado**:
  - Tabela `asset_phone_lines` adicionada ao TCR (§2.4)
  - Campo `responsible_user_id` (responsável pela linha, independente do usuário atual)
  - Permissões granulares documentadas
- **Integração frontend**:
  - Aba "Histórico de Alterações" no `InventoryDetailView`
  - Aba "Alterações" no `KeyringDetailDialog`

### v3.12.0 (2026-03-20) — Ticket Notification Contextualisation v1.0
- **Security Scan Resolved — 0 Errors**:
  - Resolvidos todos os issues de nível `error` no security scan
  - Implementadas funções de privacidade field-level para dados sensíveis
- **External Companies Privacy Functions**:
  - `get_partner_company_with_privacy(p_company_id)` — Retorna dados da empresa parceira com mascaramento de CPF/CNPJ
  - `list_partner_companies_with_privacy(p_bu_id)` — Lista empresas parceiras com privacidade
  - Campos `document` e `document_type` visíveis apenas para usuários com permissão `partners.company.manage:bu`
  - Usuários sem permissão recebem `NULL` nesses campos sensíveis
- **Profiles Privacy Validation**:
  - Confirmado que `profiles_select_bu_v2` RLS já protege acesso a profiles
  - `get_profile_with_privacy()` RPC já aplica mascaramento de WhatsApp/Instagram/Discord
  - Birthday (dia/mês) permanece visível por requisito de negócio (celebrações internas)
- **Audits Atualizados**:
  - `SYSTEMIC_HEALTH_AUDIT_2026-02-07.md` — Auditoria sistêmica completa
  - `COMPREHENSIVE_HYGIENE_AUDIT_2026-02-07.md` — Higienização de código/banco
  - `BACKEND_ROBUSTNESS_AUDIT_2026-02-07.md` — Robustez de Edge Functions
- **System Health Score: 10/10** ✅

### v3.12.0 (2026-03-20) — Ticket Notification Contextualisation v1.0
- **Ticket Notification Contextualisation**:
  - Reescrita completa dos 5 triggers de notificação de tickets para passar metadados contextuais
  - Nova função `ticket_status_label(text)` — tradução imutável de status para pt-BR (waiting→Aguardando, in_progress→Em andamento, done→Concluído, paused→Pausado, discarded→Descartado)
  - Triggers enriquecidos: `notify_ticket_status_changed`, `notify_ticket_created`, `notify_ticket_assigned`, `notify_ticket_message_created`, `notify_ticket_mention`
  - Metadata agora inclui: `ticket_title`, `ticket_type` (Interno/Externo), `category_name`, `subcategory_name`, `actor_name`, `old_status`/`new_status` (labels pt-BR), `bu_name`
  - `p_title` em `emit_notification_event` agora passa o **título real do ticket** (não string genérica)
  - 4 templates de email atualizados: `ticket.status.changed`, `ticket.created`, `ticket.assigned`, `ticket.message.created`
  - Subjects agora seguem padrão: `[{{bu_name}}] {{ticket_title}} — {{new_status}} - {{current_datetime}}`
  - Bodies incluem tipo (Interno/Externo), categoria/subcategoria, ator da ação
  - Nenhuma alteração em frontend ou Edge Functions (sistema server-side via `p_metadata` → `templateVars`)

### v3.31.0 (2026-05-16) — Assessments: Categorias e Subcategorias
- **Catálogo BU-scoped** seguindo o padrão de `ticket_categories`/`ticket_subcategories` (sem `scope` e sem `default_initial_message`):
  - Tabelas: `assessment_categories` e `assessment_subcategories` (status via enum `catalog_status`, soft delete via `deleted_at`).
  - Vínculo opcional em `assessments`: colunas `category_id` e `subcategory_id` (nullable, `ON DELETE SET NULL`).
  - Trigger `assessment_subcategory_validate_bu` garante mesma BU entre categoria e subcategoria.
  - Trigger `assessment_validate_category_subcategory` garante coerência entre `category_id` e `subcategory_id` na prova.
  - Limites de nome (1..120) via **validation triggers** (padrão canônico — sem CHECK constraints).
- **RBAC**:
  - Nova permission key: `assessments.category.manage:bu` (CRUD de categorias e subcategorias).
  - Atribuída aos templates **Administrador BU v2** e **Avaliações: Admin v2**.
  - SELECT exige `assessments.assessment.view:bu` (qualquer usuário com leitura de provas vê o catálogo).
- **Frontend**:
  - `useAssessmentCategoriesData` — hooks CRUD com guards (impede excluir categoria vinculada a provas).
  - `AssessmentCategorySelect` / `AssessmentSubcategorySelect` — selects unificados (memoizados).
  - `AssessmentCategoriesSettings` — tab "Categorias" em `/assessments` (admin).
  - Edição de categoria/subcategoria no dialog "Editar prova" em `AssessmentDetailPage`.
  - Criação no dialog "Nova prova".

### v2.99.0 (2026-02-07) — Comprehensive Hygiene Audit v1.0
- **Database Hygiene**:
  - Removidas 4 funções SQL deprecated: `cleanup_old_agent_logs`, `cleanup_old_cron_logs`, `cleanup_old_perf_snapshots`, `cleanup_old_wizard_sessions`
  - Função canônica consolidada: `cleanup_old_logs()`
- **Performance Indexes Created**:
  - `idx_okr_audit_log_created_at` — Temporal queries em okr_audit_log
  - `idx_asset_inventory_active` — Partial index soft-delete
  - `idx_notifications_created_at` — Ordenação em notifications
- **QueryKeys Standardization**:
  - 4 arquivos migrados para queryKeys centralizadas:
    - `useTeamDependencies.ts` → `queryKeys.squads.byTeam()`
    - `useGreetingSubtext.ts` → `queryKeys.profiles.detail()`
    - `usePartnerServices.ts` → `queryKeys.tickets.partnerServices()`
    - `useTeamArea.ts` → `queryKeys.teams.area()`
- **100% Query Keys Compliance** ✅

### v3.5.0 (2026-02-10) — External User Type Consistency
- **Trigger `handle_new_user` Corrigida**:
  - Agora seta `user_type = 'external'` para usuários externos (antes mantinha default `'internal'`)
  - Aplica tanto no INSERT (novo profile) quanto no UPDATE (profile pré-existente sem user_id)
- **Dados Corrigidos**: 6 profiles com `employment_status = 'external'` mas `user_type = 'internal'` atualizados
- **View `v_all_participants` Corrigida**:
  - Adicionado filtro `AND p.user_type = 'internal'` na parte profiles do UNION ALL
  - Evita duplicação de usuários externos (que aparecem via `partner_contacts`)
- **RPC `search_mention_candidates` Corrigida**:
  - Mesmo filtro `AND p.user_type = 'internal'` adicionado
  - Dropdown de menções agora mostra externos apenas 1x
- **Edge Function `send-partner-invite` Corrigida**:
  - Join legado `partner_companies(id, name)` → `external_company:external_companies(id, name)`
- **Documentação Atualizada**:
  - `EXTERNAL_USER_IDENTITY_PATTERN.md`: `user_type = 'external'` documentado no trigger, nomes legados corrigidos
  - `UNIFIED_PARTICIPANT_LAYER.md`: SQL da view atualizado

### v2.98.0 (2026-02-07) — Systemic Health Audit v1.0
- **auth-email-hook Bug Fix**:
  - Corrigido crash em payload inválido (~50 erros/min)
  - Guard adicionado para validar `user.email` e `email_data.token_hash`
- **Views Security Verified**:
  - Todas as 27 views usam DEFAULT (INVOKER implícito)
  - Linter warning de SECURITY DEFINER é falso positivo
- **Database Cleanup Active**:
  - pg_cron configurado para cleanup semanal
  - Tabelas de logs com retenção automática

### v2.91.0 (2026-02-04) — Google Tag Manager Integration
- **Google Tag Manager via Painel de Integrações**:
  - GTM adicionado ao catálogo de integrações (`hub_integrations_catalog`)
  - Configuração do Container ID via `/hub/integrations/google-tag-manager`
  - GA4 agora é gerenciado dentro do GTM (não mais no código)
- **Analytics Module Refatorado**:
  - `src/lib/analytics/gtag.ts` — Funções migradas para GTM `dataLayer.push()`
  - `src/lib/analytics/useGtmConfig.ts` — Hook para buscar Container ID dinamicamente
  - `initGTM(containerId)` substitui `initGA4()` (deprecated)
  - Funções mantidas (API compatível): `setTenantId`, `trackVirtualPageView`, `trackEvent`, `pushToDataLayer`, `initSessionContext`
- **Inicialização Dinâmica**:
  - `GtmInitializer` componente no `App.tsx` carrega GTM após buscar config
  - `main.tsx` limpo — GTM não é mais inicializado no bootstrap
- **Fluxo de Dados**:
  ```
  Hub → dataLayer.push() → GTM → GA4 (configurado no GTM)
  ```
- **User Property**: `tenant_id` (bu_id) enviado via `tenant_selected` event

### v2.88.0 (2026-02-04) — Listing Page Layout Standardization
- **Novo Padrão de Layout de Listagem**:
  - Estrutura hierárquica: `PageHeader` → `SummaryCards` → `ListPageFilters` → `ViewOptionsBar` → `Content`
  - Linha 1: Busca + Filtros (todos inline)
  - Linha 2: Contador de resultados (esquerda) + Toggle de visualização (direita)
- **Novo Componente `ViewOptionsBar`** (`src/components/ui/view-options-bar.tsx`):
  - Padroniza layout: contador à esquerda + controles à direita
  - Props: `resultCount`, `resultCountLabel`, `resultCountLabelSingular`, `children`
- **Refatoração de `ListPageFilters`**:
  - Removidas props: `actions`, `resultCount`, `resultCountLabel`, `resultCountLabelSingular`
  - Foco exclusivo: busca + filtros inline (children)
- **Páginas Atualizadas**:
  - `/kpis` — Novo layout com ViewOptionsBar
  - `/kpis/evolution` — Novo layout com ViewOptionsBar + tabs
  - `/users` — Breadcrumbs integrados no PageHeader
  - `/assets/inventory` — ViewOptionsBar com contador
  - `/assets/keys` — Layout inline busca + ação
  - `/assets/gifts` — Layout inline busca + ações
  - `/settings/areas` — Ação movida para PageHeader
- **Anti-patterns Novos** (UI_COMPONENTS_REGISTRY v1.4.0):
  - #12: ViewToggle dentro de ListPageFilters.actions → Usar ViewOptionsBar separado
  - #13: Contador de resultados misturado com filtros → Mover para ViewOptionsBar
- **Documentação**: UI_COMPONENTS_REGISTRY.md seções 5.3, 5.4, 5.5 atualizadas

### v2.81.0 (2026-02-03) — Remoção de health_indicator
- **Enum `kpi_indicator_type` simplificado** — Removido tipo `health_indicator`
- Sistema agora opera apenas com: `kpi` (indicador estratégico) e `metric` (medição operacional)
- Zero registros afetados (nenhum dado usava o tipo removido)
- Migration recriou o enum PostgreSQL com apenas valores válidos

### v2.80.0 (2026-02-03) — Assets Reports Deep Links + Overdue Loans Alert
- **Assets Reports Deep Links v1.0**:
  - Métricas nos cards de `/assets/reports` agora são clicáveis com deep links
  - Inventário: Total, Disponíveis, Emprestados, Em Manutenção → links para listagem filtrada
  - Chaves: Total, Disponíveis, Emprestados, Extraviados → links para listagem filtrada
  - Brindes: Total, Estoque baixo → links para listagem filtrada
  - Componente reutilizável `ReportStatItem` com suporte a Link e variantes de cor
- **Overdue Loans Alert Card v1.0**:
  - Novo card destacado em `/assets/reports` para devoluções em atraso
  - Exibe até 5 itens críticos com link para detalhe
  - Link "Ver todos" navega para `/assets/inventory?status=loaned&overdue=true`
  - Lógica baseada em `isPast(expected_return_at)`
- **URL State para Assets**:
  - `InventoryPage`: novo filtro `overdue=true` para empréstimos atrasados
  - `KeysPage`: novo filtro `status` (available|loaned|lost) via URL state
  - `GiftsPage`: novo filtro `lowStock=true` para estoque baixo
- **Documentação**: TCR seção 3.2 e 4.11 atualizadas

### v2.79.0 (2026-02-03) — KPI Evolution v2.1
- **KPI Module Evolution v2.1** — Transforma KPIs em instrumentos de gestão auditáveis:
  - **Novos Enums** (4): `kpi_indicator_type`, `kpi_lifecycle_status`, `kpi_confidence_level`, `kpi_rag_status`
  - **Expansão de Enum**: `kpi_value_source` agora inclui `api`, `webhook`, `spreadsheet`, `database`
  - **Novas Colunas em `kpi_metrics`** (4):
    - `indicator_type` — Classifica: KPI, Métrica
    - `lifecycle_status` — Ciclo de vida: Proposto, Ativo, Em Observação, Depreciado
    - `target_source` — Fonte/URL do target/benchmark
    - `recovery_protocol` — Protocolo de recuperação quando fora da meta
  - **Novas Colunas em `kpi_values`** (5):
    - `period_start`, `period_end`, `period_label` — Período ISO week aligned
    - `confidence` — Nível de confiança (high/medium/low)
    - `rag_status` — Status RAG calculado automaticamente
  - **Funções SQL**:
    - `kpi_calculate_rag(value, target, direction)` — Cálculo RAG com proteção divisão por zero
    - `kpi_calculate_period(reference_date, frequency)` — Cálculo de período ISO
  - **Trigger `trg_kpi_value_validation`**:
    - Calcula período automaticamente quando NULL
    - Calcula RAG status em INSERT/UPDATE
    - Gate: comentário obrigatório para KPIs amarelos/vermelhos
    - Default confidence baseado em source
  - **Índices de Performance** (11 novos): Otimiza queries por BU, owner, team, lifecycle, RAG
  - **Índice de Unicidade por Período**: Previne duplicidade de valores por período
  - **Frontend**:
    - `useKpisForWizard.ts` — Hook fail-safe para wizards OKR (retorna latest value, RAG, needs_update)
    - Types, labels e interfaces atualizados em `types.ts`
    - Query keys: `kpisKeys.forWizard()`, `kpisKeys.byRagStatus()`
- **Documentação**: TCR seção 2.3 atualizada com campos v2.1

### v2.78.0 (2026-02-02)
- **Organogram Text Export v1.0**:
  - Novo utilitário `organogramToText.ts` para conversão ASCII
  - Botão de exportar em `OrganogramControls` (normal + fullscreen)
  - Formato legível para análise por LLMs (GPT, Claude)
  - Respeita filtros de visualização (membros, squads)
  - Copia para clipboard com toast de confirmação
- **Dashboard Ticket Links v1.0**:
  - Contadores de tickets na home agora são clicáveis
  - Links navegam para `/tickets` com filtros pré-aplicados
  - "Abertos" → `/tickets`
  - "Vencidos" → `/tickets?overdue=true`
  - "Vence hoje" → `/tickets?due_today=true`
- **PII Security Views Update v1.0**:
  - Views `v_bu_active_profiles` e `v_profiles_directory` atualizadas
  - Removidos campos sensíveis: `whatsapp_personal`, `instagram_id`, `discord_id`
  - Views agora usam `security_invoker = on`
  - Dados PII acessíveis apenas via RPC `get_profile_with_privacy()`
- **OKR Wizards Documentation**:
  - Seção 4.8 expandida com documentação dos 5 wizards
  - Tabela com propósito, frequência e participantes de cada ritual

### v2.77.0 (2026-01-30) — Result Count Pattern + Subcategory Filter Fix
- **Padrão de Contador de Resultados**:
  - `ListPageFilters` agora aceita prop `resultCount` para exibir "X itens encontrados"
  - Props adicionais: `resultCountLabel` (plural), `resultCountLabelSingular` (singular)
  - Formatação com `toLocaleString("pt-BR")` para números grandes
  - Implementado como exemplo em `InventoryPage`
- **Correção de Filtro de Subcategoria**:
  - Filtro hierárquico de categoria em Assets corrigido
  - Lógica anterior só funcionava para categorias pai
  - Nova lógica: categoria pai inclui filhos, subcategoria requer match exato
  - Mesmo fix aplicado para localização hierárquica

### v2.76.0 (2026-01-30) — External Companies Migration
- **Migração de Nomenclatura**:
  - `partner_companies` → `external_companies`
  - `partner_company_id` → `external_company_id` em todas as tabelas
  - `partner_company_bu_associations` → `external_company_bu_associations`
- **RPCs Atualizadas**:
  - `get_partner_categories(p_external_company_id)`
  - `get_partner_subcategories(p_external_company_id, p_category_id)`
  - `search_mention_candidates(p_bu_id, p_external_company_id, ...)`
- **Joins Atualizados**:
  - Todas as queries de tickets usam `external_company:external_companies(...)`
  - Componentes de filtro e hover cards corrigidos

### v2.73.0 (2026-01-23) — Generic Messaging Reply System v1.0
- **Sistema de Reply Genérico (estilo WhatsApp)**:
  - Nova coluna `reply_to_message_id` em `ticket_messages` (FK self-referencing)
  - Índice parcial `idx_ticket_messages_reply_to` para queries eficientes
  - Suporte completo para usuários internos e externos
- **Componentes Genéricos de Mensagens** (`src/components/messaging/`):
  - Arquitetura reutilizável para futuros módulos (Projetos, etc.)
  - Interfaces: `GenericMessage`, `MessageParticipant`, `MessageThreadConfig`
  - Componentes: `MessageBubble`, `QuotedMessage`, `ReplyPreview`
  - Configs: `DEFAULT_INTERNAL_CONFIG`, `DEFAULT_EXTERNAL_CONFIG`
- **Integração com Tickets**:
  - `TicketMessageBubble` e `TicketMessageComposer` como adapters
  - Query JOIN para buscar dados do reply (`reply_to.author_user`, `reply_to.author_contact`)
  - Estado `replyingTo` em `TicketDetailPage` para modo de resposta
  - Correção de `isOwnMessage` para verificar `author_contact_id` em externos
  - `onScrollToMessage` implementado para clicar na citação e rolar
- **Documentação**:
  - Schema Reference atualizado com `reply_to_message_id`
  - Data Model Registry atualizado com FKs de `ticket_messages`
  - Memory: `generic-messaging-reply-system` criado

### v2.55.0 (2026-01-22) — Impersonation Wildcard Fix + can_view_ticket Hybrid User Support
- **Impersonation Wildcard Fix v1.0**:
  - Corrigido bug onde módulos não apareciam ao impersonar admin de BU
  - `usePermissions().isWildcard` agora reflete corretamente as permissões do usuário impersonado
  - Durante impersonação de admin BU: `isWildcard = true` (porque recebe `*` do backend)
  - Durante impersonação de colaborador comum: `isWildcard = false`
  - Atualizado `useModuleAccess.ts` e `useAssetPermissionsV2.ts` para usar `isWildcard` durante impersonação
  - Documentação `IMPERSONATION_AWARE_COMPONENTS.md` atualizada com novo comportamento
- **can_view_ticket Hybrid User Support v1.0**:
  - Corrigida função `can_view_ticket()` para suportar usuários híbridos (profile + partner_contact)
  - Usuários externos com profile que foram adicionados como participantes via `partner_contact_id` agora podem ver o ticket
  - Ordem de verificação atualizada: 1) Creator/owner, 2) Participante interno, 3) Participante externo via auth.uid, 4) Profile com partner_contact, 5) Regras de visibilidade
  - Corrigido enum `'all'` → `'bu_all'` e removido `'squads'` inexistente

### v2.89.0 (2026-02-04) — Saved Links for KPIs Evolution
- **Saved Links System v1.3**:
  - Página `/kpis/evolution` agora suporta links salvos com favoritos
  - `SavedLinksPopover` adicionado à `ViewOptionsBar` seguindo novo padrão de layout
  - moduleSlug: `kpis-evolution` para persistência de filtros de evolução
  - Módulos com Saved Links: OKRs, KPIs Dashboard, KPIs Evolution, Assets, Tickets

### v2.54.0 (2026-01-22) — Saved Links for Tickets Module
- **Saved Links System v1.2**:
  - Módulo Tickets agora suporta links salvos com favoritos
  - `SavedLinksPopover` adicionado ao `PageHeader` de `/tickets`
  - Padrão consistente com OKRs e Assets
  - Módulos com Saved Links: OKRs, Assets, Tickets

### v2.53.0 (2026-01-22) — Notification Templates v2 + Tickets UI Enhancement
- **Notification Templates v2**:
  - 19 templates de email atualizados com novo padrão de subject: `[{{bu_name}}] ... - {{current_datetime}}`
  - 35+ variáveis registradas em `notification_template_variables`
  - Triggers enriquecidos: `notify_ticket_message_created`, `notify_ticket_status_changed`, `notify_asset_checkout`, `notify_team_membership_changed`
  - Edge Function `process-notification-outbox` atualizado para resolver `actor_name` dinamicamente
  - Formato de data padronizado: `DD/MM às HH:MM`
  - > **Nota:** Triggers de tickets foram **reescritos na v3.12.0** com metadata contextual completa (título, tipo, categoria, ator)
- **Tickets Table Enhancement**:
  - Coluna "Criado por" adicionada à listagem de tickets com avatar e nome
  - Campo `created_by` já estava disponível no select, agora exibido na UI
- **External User Onboarding Fix**:
  - Corrigido loop de tela branca após onboarding de usuários externos
  - Rota `/select-bu` agora pula verificação de onboarding para evitar condição de corrida
  - Auto-redirect para single-BU users com fallback seguro

### v2.52.0 (2026-01-22) — ON CONFLICT Index Fixes

### v2.45.0 (2026-01-21) — Global Partner Companies + Home Module Access Control
- **Estrutura Global de Partner Companies**:
  - Tabela `partner_companies` agora é global (CPF/CNPJ único no sistema)
  - Nova tabela `partner_company_bu_associations` para vínculo empresa ↔ BU
  - Campos adicionados: `person_type`, `document`, `document_type`
  - Índice único em `document` para evitar duplicatas globais
  - Função SQL `find_partner_by_document(p_document text)` para busca global
  - Edge Function `request-magic-link` atualizada para validar via associações
  - Frontend `PartnerCompanyDialog` com campos PF/PJ e CPF/CNPJ mascarado
  - Hooks: `useGlobalPartners`, `usePartnerBuAssociations`
- **Controle de Acesso por Módulo na Home**:
  - Cards de OKRs (Rituais, LeaderDashboard, MyOkrsCard, OkrSummaryCard, TeamStatusCard) 
    ocultos para usuários sem acesso ao módulo `/okrs`
  - Uso de `useModuleAccess().hasModuleAccess("okrs")` para controle condicional
  - Afeta usuários internos e externos sem permissão no módulo OKRs
- **Documentação**:
  - Seção 2.8 (Módulo Partners) adicionada ao TCR
  - Critérios de OTP atualizados para refletir nova estrutura

### v2.42.0 (2026-01-16) — Team OKR/KR Linking Edit
- **Security Fixes (2 error-level issues)**:
  - RLS habilitado em `perf_metrics_snapshots` com política deny-all para authenticated
  - 3 views convertidas de SECURITY DEFINER para SECURITY INVOKER:
    - `v_pending_checkins`, `v_shared_okrs_summary`, `v_team_contributed_okrs`
- **Performance Wave P5.1 — 7 índices críticos**:
  - `idx_user_roles_user_id` — lookup por user_id (-90% seq scans)
  - `idx_user_roles_user_role` — validação has_role() composta
  - `idx_profiles_bu_active` — filtro por bu_id onde não deletado (-80% seq scans)
  - `idx_ai_agent_documents_agent` — filtro por agent_id (-100% seq scans)
  - `idx_bu_locations_bu` — filtro por bu_id onde não deletado
  - `idx_asset_movements_asset` — histórico por asset ordenado por data
  - `idx_asset_movements_bu_date` — listagem por BU ordenada por data
  - Impacto estimado: **-16M sequential scans**
- **Documentação**:
  - Novo: `docs/engineering/PERFORMANCE_ACTION_PLAN_P5.md` — Plano Wave P5
  - Atualizado: `SLOW_QUERIES_ACTION_PLAN.md` → v1.5.0

### v2.38.0 (2026-01-15) — OKR Status Filter & UI Polish
- **Filtro de status `discarded` em OKRs**:
  - Hooks `useOrgObjectives` e `useTeamObjectives` agora excluem objetivos com status `discarded` por padrão
  - Antes: apenas `cancelled` era excluído. Agora: `cancelled` E `discarded` são excluídos
  - Opção `includeAllStatuses: true` permite incluir todos os status quando necessário
  - Arquivos alterados: `src/modules/okrs/hooks/queries/useOkrQueries.ts`
- **Cards de Times com altura uniforme**:
  - `TeamCard.tsx` atualizado com `h-full flex flex-col` para altura consistente no grid
  - Footer do card agora usa `mt-auto` para alinhar ao fundo
- **Página de Permissões BU simplificada**:
  - Removido `TabsList` com única tab "Usuários" (redundante)
  - Layout simplificado mantendo funcionalidade completa
- **Organograma melhorado**:
  - Expansão padrão: CEO, Áreas e Times de primeiro nível expandidos, subtimes colapsados
  - Novo toggle "Expandir/Recolher tudo" nos controles do organograma
  - Props `expansionMode` e `expansionKey` para controle global de estado

### v2.37.0 (2026-01-15) — Areas Strategic Layer
- **Áreas (camada estratégica) implementadas**:
  - Tabela `areas` com líder, co-líder, cor, ícone e status
  - Áreas NÃO possuem OKRs (diferente de times)
  - Interface de gestão em `/settings/areas`
  - Vínculo `teams.area_id` para associar times a áreas
- **Cobertura de testes para Teams/Areas**:
  - Novos testes para `TeamCard`, `TeamForm`, `AreaForm`
  - Integração com framework de testes automatizados

### v2.36.0 (2026-01-15) — Saved Links System
- **Sistema de Links Salvos implementado**:
  - Nova tabela `user_saved_links` para armazenar links personalizados por módulo
  - Usuário pode salvar quantos links quiser com filtros preservados
  - Um link pode ser marcado como **favorito** por módulo (único por módulo/BU)
  - Link favorito torna-se o destino padrão ao clicar no menu lateral
- **Arquitetura**:
  - Tabela: `user_saved_links` (RLS por `user_id = my_profile_id()`)
  - Query Keys: `src/lib/queryKeys/savedLinks.ts`
  - Hooks: `useSavedLinks`, `useModuleFavoriteLink`, `useFavoriteLinks`
  - Componentes: `SaveLinkDialog`, `SavedLinksPopover`
  - Barrel: `src/shared/saved-links/index.ts`
- **Integração com Sidebar**:
  - `DynamicSidebar.tsx` e `MobileSidebar.tsx` usam `useFavoriteLinks()`
  - Função `getFavoriteHref(moduleSlug, defaultHref)` retorna path favorito ou fallback
- **Primeiro módulo integrado**: OKRs (`/okrs`)
- **Expansão planejada**: Tickets, KPIs, Assets, Teams

### v2.35.0 (2026-01-15) — Cancel Filter Fix
- **Filtro de cancelados corrigido em todo sistema OKRs**:
  - Views `v_shared_okrs_summary` e `v_team_contributed_okrs` atualizadas
  - RPC `get_cycle_checkins` filtrado por `cancelled_at IS NULL` e `status != 'cancelled'`
  - Hooks frontend atualizados para excluir objetivos/KRs/iniciativas cancelados

### v2.31.0 (2026-01-14) — Hooks Consolidation Wave
- **Consolidação de Hooks em todos os módulos**:
  - Criado/atualizado `hooks/index.ts` (barrel file) em 12 módulos
  - Módulos consolidados: `okrs`, `teams`, `assets`, `tickets`, `permissions`, `bu`, `automations`, `kpis`, `settings`, `integrations`, `home`, `vic`
  - Arquivos legados duplicados removidos (`useOrgObjectiveView.ts`, `useTeamContributedOkrs.ts`)
  - Imports atualizados para usar barrel files centrais
- **Estrutura padrão de hooks por módulo**:
  - `hooks/index.ts` como ponto único de export
  - Subpastas opcionais (`queries/`, `mutations/`) com seus próprios barrel files
  - Proibido import direto de arquivos (sempre via barrel)
- **OKRs Org-View Fix**:
  - `LinkedTeamObjectivesSection` exibe objetivos de times vinculados a objetivos organizacionais
  - Tipo `LinkedTeamObjective` adicionado ao módulo de queries
  - Query `useOrgObjectiveView` atualizada para buscar `linkedTeamObjectives`
- **Documentação atualizada**:
  - TCR seção 10.4 com regras de barrel files
  - DEVELOPMENT_STANDARDS seção K com imports de hooks
  - SHARED_COMPONENTS_REGISTRY atualizado

### v2.30.0 (2026-01-13) — Org KR Owner + Wizard Initiative Filter
- **Org KR Owner implementado**
- **Wizard Initiative Filter aprimorado**

### v2.52.0 (2026-01-22) — ON CONFLICT Index Fixes
- **FIX: `ticket_participants` unique index constraints**:
  - Índices `idx_ticket_participants_unique_user` e `idx_ticket_participants_unique_contact` recriados
  - Removida condição `is_active = true` que impedia `ON CONFLICT` de funcionar
  - Nova definição: `UNIQUE (ticket_id, profile_id) WHERE profile_id IS NOT NULL`
  - Corrige erro `42P10` no trigger `auto_add_ticket_mention_as_participant`
- **FIX: `notification_outbox` dedupe key index**:
  - Índice `idx_notification_outbox_dedupe_key` convertido de parcial para não-parcial
  - Permite `ON CONFLICT (dedupe_key) DO NOTHING` em `emit_notification_event()`
  - Corrige erro `42P10` no trigger `notify_ticket_message_created`
- **BU-Scoped Client JWT Fallback**:
  - `readAccessTokenFromStorage()` agora varre `localStorage` para encontrar token
  - Fallback para `sb-*-auth-token` keys se o canonical key falhar
  - Previne requests como `anon` em ambientes com storage key variável

### v2.49.0 (2026-01-21) — Tickets Module Enhancements
- **Pinned Messages v1.0**:
  - Colunas adicionadas: `is_pinned`, `pinned_at`, `pinned_by_user_id` em `ticket_messages`
  - Função `can_pin_ticket_message(p_profile_id, p_ticket_id)` valida permissão
  - Hook `usePinMessage()` + helper `canUserPinMessages()` para UI
  - Mensagens fixadas aparecem no topo da conversa com destaque visual
- **Ticket Transfer System v1.0**:
  - Hook `useTransferTicket()` para transferência entre responsáveis (interno ↔ interno, externo ↔ externo)
  - Mensagem de sistema registrada no histórico do ticket
  - Notificação `ticket.assigned` emitida para novo responsável
  - Validação: tickets internos só podem ser transferidos para usuários internos; externos só para contatos da mesma empresa
- **Attachments RLS v3 (External Access)**:
  - Nova policy `ticket_attachments_insert_v3` permite contatos externos participantes fazer upload
  - Verificação via `ticket_participants.partner_contact_id` + `partner_contacts.user_id = auth.uid()`
  - Storage path usa path interno (não URL pública) para bucket privado
- **Hook Canônico `usePartnerCompanyContacts`**:
  - Listar contatos ativos de uma empresa parceira específica
  - POST-BU compliant, queryKeys centralizadas
  - Usado em `TicketTransferModal` para seleção de contatos externos

### v2.48.0 (2026-01-21) — RLS Security Audit v1.0
- **6 Correções Críticas de RLS** (ver `docs/engineering/RLS_SECURITY_AUDIT_2026-01-21.md`):
  - Recursão infinita em `partner_contacts` ↔ `partner_contact_bu_associations`
  - Identity mismatch: `has_permission(auth.uid())` → `has_permission(my_profile_id())`
  - Self-reference bug em `partner_contacts` UPDATE policy
  - Overly permissive INSERT em tabelas de audit
- **Funções SECURITY DEFINER**:
  - `get_user_partner_contact_id(auth.uid())` — Retorna contact_id sem disparar RLS recursiva

### v2.47.0 (2026-01-21) — Mention Triggers for External Contacts
- **Triggers de Menções Ativados**:
  - `trg_auto_add_ticket_mention_as_participant` — Auto-adiciona usuário/contato mencionado como participante do ticket (role: `watcher`)
  - `trg_notify_ticket_mention` — Notifica usuário/contato mencionado via sistema centralizado (`emit_notification_event`)
- **Suporte Completo a Contatos Externos**:
  - Função `notify_ticket_mention` refatorada para usar `emit_notification_event`
  - Contatos externos são notificados por e-mail (via `notification_outbox`)
  - Contatos externos com `profile_user_id` recebem notificação in-app
  - Contatos mencionados ganham acesso automático ao ticket via RLS
- **Fluxo Completo**:
  1. Usuário menciona contato externo → Trigger cria participante (watcher)
  2. Trigger emite evento `mention.created` → Notificação e-mail + in-app
  3. Contato externo pode visualizar e responder no ticket

### v2.19.0 (2026-01-12) — Mentions Global Restoration
- **Correção Arquitetural**: Tabela `mentions` restaurada como tabela global canônica
  - A tabela `mentions` é agora a fonte única para menções em todos os módulos (tickets, OKRs, etc)
  - Usa `entity_type` + `entity_id` para identificar o contexto (ex: `ticket_message`, `ticket`, `okr`)
  - Tabela `ticket_mentions` foi removida (era específica, agora centralizado em `mentions`)
- **Código atualizado**: `useTickets.ts`, `useTicketMessages.ts` usam `mentions` com `entity_type`

### v2.18.0 (2026-01-12) — Codebase Hygiene Wave 7
- **Higienização de Banco de Dados**:
  - Função `_identity_dual_mode_deadline` removida (cutover concluído)
  - Funções de retenção criadas: `cleanup_old_agent_logs()` (90 dias), `cleanup_old_cron_logs()` (30 dias)
- **Índices de Performance**:
  - `idx_okr_team_objectives_bu_team_status` — OKR queries
  - `idx_notifications_user_read_created` — Inbox do usuário
  - `idx_notification_outbox_status_pending` — Processamento de outbox
- **Documentação**:
  - Novo documento `HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md` com roadmap completo
  - Wave 1 (Higienização Crítica) concluída
  - Waves 2-4 planejadas (centralização, refatoração OKRs, performance)

### v2.17.0 (2026-01-11) — Notification Admin RLS Hardening
- **RLS Policies corrigidas para telas administrativas de notificações**:
  - `notification_outbox` (SELECT): agora exige `is_current_bu(bu_id)` + (`super_admin` OR `admin` OR `notifications.outbox.view:bu`)
  - `notification_outbox` (UPDATE): agora exige `is_current_bu(bu_id)` + (`super_admin` OR `admin` OR `notifications.outbox.retry:bu`)
  - `notifications` (SELECT para admin view): agora exige `is_current_bu(bu_id)` + (`super_admin` OR `admin` OR `notifications.bu.view:bu` OR `notifications.bu.manage:bu`)
- **Permission Keys usadas** (já existentes no catálogo):
  - `notifications.outbox.view:bu` — Ver fila de envio de notificações (outbox)
  - `notifications.outbox.retry:bu` — Reprocessar notificações com falha
  - `notifications.bu.view:bu` — Ver configuração de notificações da BU
  - `notifications.bu.manage:bu` — Gerenciar canais e eventos de notificação da BU
- **Correção de padrão**: todas as policies agora usam o sufixo `:scope` canônico (ex: `:bu`) conforme TCR v2.11+

### v2.13.0 (2026-01-09) — V2-Only Mode & Governance Hardening
- **V1 Permissions completamente removido** (Wave 9 Final):
  - Todas tabelas V1 dropadas: `permission_groups`, `permission_group_permissions`, `bu_user_permission_groups`, `permission_key_aliases`
  - Funções V1 removidas: `resolve_permission_key`, `log_legacy_key_usage`, `block_v1_writes`
  - Frontend limpo: `usePermissionAliases`, `AliasesTab.tsx` removidos
  - **V2 é a única fonte de verdade para controle de acesso**
- **Wave 10 — Governance Gate Enforced**:
  - Presets inteligentes (12 configurados): `assets_viewer`, `assets_operator`, `okrs_leader`, `tickets_admin`, etc.
  - Visual Diff obrigatório antes de aplicar alterações
  - Motivo obrigatório (min 10 chars) para qualquer alteração de permissão
  - Logs de auditoria estruturados em `permission_audit_log`
  - Views de governança: `v_permission_risk_report`, `v_users_without_templates`
  - `PermissionDiffDialog` + `PermissionExplanationDrawer` no frontend
- **User Directory Global v2** consolidado:
  - View canônica `v_bu_active_profiles` como fonte única
  - Hooks: `useBuUsersDirectory`, componentes: `BuUserSelect`, `BuUserMultiSelect`
  - Regra: usuários aparecem no diretório mesmo com `profiles.user_id = NULL`
  - Audit script `audit-user-directory.ts` retorna 0 findings
- **OKR Cycle Checkins**:
  - RPC `get_cycle_checkins` com feed paginado, agregações e KRs overdue
  - Página `/okrs/checkins` com tabs Feed, Pendências, Resumo
  - Filtros por time, owner, confidence, status via URL state
- **Métricas atualizadas**:
  - Permission Keys: 160 (era 143)
  - Templates V2: 27
  - Presets: 12
  - User Assignments V2: 37

### v2.12.0 (2026-01-08) — Wave 7-9 Consolidation
- **Wave 7 — Sunset V1 (Permissions)**:
  - Modelo de permissões v1 congelado (read-only) via triggers
  - UI de edição v1 removida (apenas visualização legado)
  - Sistema de migração controlada v1 → v2 implementado
- **Wave 8-9 — DROP V1**:
  - Tabelas e funções V1 removidas definitivamente
  - Guardrail view `users_without_v2_permissions` implementado
  - Auto-assign trigger para template base V2

### v2.11.0 (2026-01-08) — Notifications & OKR Hardening
- **Central de Notificações V1 completa**:
  - Outbox Pattern implementado com retry automático
  - Templates versionados por evento/canal
  - Canais ativos: `in_app`, `email` (Slack/WhatsApp planejados)
  - Views de observabilidade: `v_notification_delivery_health`, `v_notification_failures`
- **OKR Team Scope Hardening**:
  - Função `get_manageable_teams()` para RBAC de times
  - RLS enforced para objetivos e KRs por hierarquia de times

### v2.10.0 (2026-01-08)
- **Auditoria Global completa** do Hub:
  - Relatório `docs/GLOBAL_AUDIT_REPORT.md` com 7 áreas auditadas
  - Checklist QA manual `docs/QA_GLOBAL_AUDIT.md` com 80+ testes
  - 1 débito crítico identificado (uso de supabase raw em módulos operacionais)
  - 6 débitos médios, 7 débitos baixos documentados
- **Validação de Permissões**:
  - `usePermissions()` funcionando corretamente
  - `PermissionGuard` e `RequirePermission` operacionais
  - Wildcard `['*']` para admins confirmado
- **BU Scope Audit**:
  - 15+ arquivos identificados usando supabase raw (a migrar)
  - 14 tabelas com bu_id nullable (a corrigir)
  - Tabelas de Assets/Tickets corretamente NOT NULL
- **Edge Functions**:
  - `global-search` validando BU access corretamente
  - `process-notification-outbox` funcional com retry
  - Recomendação: adicionar middleware de logging estruturado
- **Notificações V1 validado**:
  - Idempotência via dedupe_key funcionando
  - Views de observabilidade operacionais

### v2.6.0 (2026-01-07) — Central de Notificações V1 Completa
- **Complementos da Central de Notificações**:
  - Tabela `notification_templates` para templates por evento/canal
  - Coluna `dedupe_key` na `notification_outbox` com UNIQUE INDEX para idempotência
  - Views de observabilidade: `v_notification_delivery_health`, `v_notification_failures`
  - Função `emit_notification_event` atualizada para gerar `dedupe_key` automaticamente
  - Templates padrão para 10 eventos principais (email)
  - Proteção contra duplicatas in-app (5 minutos)
- **Formato dedupe_key**: `{event_slug}:{recipient_id}:{channel}:{context_type}:{context_id}`
- **Relatório completo** em `docs/NOTIFICATION_SYSTEM_REPORT.md`

### v2.5.0 (2026-01-07) — Central de Notificações Base
- **Central de Notificações** implementada (arquitetura escalável multi-canal):
  - 6 novas tabelas: `notification_events`, `notification_channels`, `bu_notification_channels`, `user_notification_preferences_v2`, `notification_outbox`, coluna `event_slug` em `notifications`
  - Governança em 3 níveis: Global (catálogo de eventos/canais), BU (configuração de canais), Usuário (preferências pessoais)
  - Função SQL `emit_notification_event(p_event_slug, p_bu_id, p_recipient_ids, p_title, p_message, p_context_type, p_context_id, p_context_url, p_metadata)`
  - Suporte a eventos obrigatórios (`is_mandatory = true`) que ignoram preferências
  - Suporte a audiência (`internal`, `external`, `both`) para controle de usuários externos
  - 5 canais configurados: `in_app`, `email`, `slack`, `whatsapp`, `webhook`
  - 18 eventos padrão em 6 módulos (core, okrs, tickets, assets, teams, kpis)
  - Edge Function `process-notification-outbox` para envio assíncrono com retry
  - RLS policies completas em todas as tabelas
- **Frontend de Notificações**:
  - `/hub/notifications` — Gerenciamento global de eventos e canais (super_admin)
  - `/settings/notifications` — Configuração de canais por BU (admin)
  - `/me/notifications` — Preferências pessoais do usuário
  - Hook `useNotificationCenter` com mutations para todas as operações
- **Preparação para canais futuros**:
  - Arquitetura desacoplada via `notification_outbox`
  - Payloads genéricos em JSONB
  - Retry automático com exponential backoff
- **QA Checklist** documentado em `docs/QA_NOTIFICATIONS.md`
- **Compliance Report** em `docs/NOTIFICATIONS_COMPLIANCE_REPORT.md`

### v2.4.0 (2026-01-07) — BU Scope Enforcement
- **BU Scope Enforcement** implementado (segurança multi-tenant):
  - `current_bu_id()` atualizado para **NUNCA retornar NULL** — lança `NO_BU_CONTEXT` se inválido
  - `is_current_bu(bu_id)` helper seguro para RLS policies
  - `assert_bu_scope(bu_id)` valida BU em triggers, lança `MISSING_BU_ID`, `NO_BU_CONTEXT`, `BU_SCOPE_VIOLATION`
  - Triggers `enforce_bu_scope_trigger` aplicados a 20+ tabelas operacionais (OKRs, Teams, Assets, Tickets, KPIs)
  - RLS policies atualizadas: `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`
  - View `v_bu_id_null_report` para auditoria de registros sem `bu_id`
- **Frontend BU Scope**:
  - Novo hook `useBuScopedSupabase()` injeta header `x-current-bu-id` automaticamente
  - Helper `createBuScopedClient(buId)` para uso fora de React
  - Helper `withBuId(payload, buId)` para inserts/updates explícitos
- **Scanner de auditoria**:
  - Script `scripts/audit-bu-scope.ts` detecta operações sem `bu_id`
  - Arquivo `scripts/audit-bu-exceptions.json` lista tabelas globais ignoradas
  - Findings: `INSERT_MISSING_BU_ID`, `UPDATE_MISSING_BU_ID`, `SELECT_MISSING_BU_FILTER`
- **QA Checklist** documentado em `docs/qa/QA_BU_SCOPE.md`

### v2.3.0 (2026-01-06) — Full Hierarchy Enforcement
- **Hierarquia de Times (Enforcement Total no Frontend)**:
  - Componentes `TeamCard`, `TeamsPage`, `TeamDetailPage`, `SquadSection` usam `canManageTeam()`
  - Botões de edição/deleção só aparecem se `canManageTeam(teamId)` retornar true
  - Regra consistente entre backend (RLS) e frontend (UI guards)
- **Links Compartilháveis na Busca Global**:
  - Edge Function `global-search` atualizada para retornar `/go/:entity/:id` em todas as URLs
  - Entidades: `user`, `team`, `ticket`, `okr_org_objective`, `okr_team_objective`, `okr_org_kr`, `okr_team_kr`, `kpi`, `asset`, `keyring`, `gift`
  - Nenhum link direto para rotas operacionais em resultados de busca
- **Remoção total de referências a "CEO"**:
  - Comentários e referências a "CEO" removidos do frontend
  - Apenas `super_admin` e `admin` são roles válidos no sistema
- **Query Keys Centralizadas**:
  - Hook `useSharedData.ts` migrado para usar `queryKeys` de `src/lib/queryKeys.ts`

### v2.2.0 (2026-01-06) — Permission & Team Hierarchy Hardening
- **Remoção definitiva do role "ceo"**:
  - Removido de `is_bu_admin()` e demais funções SQL
  - Removidas referências no frontend (useAuth, usePageTitle, useHomeDashboard)
  - Apenas `super_admin` e `admin` são roles válidos
- **Hierarquia de Times (SQL Functions)**:
  - `is_team_leader(user_id, team_id)`: verifica liderança direta
  - `team_is_ancestor(ancestor_id, team_id)`: verifica ancestralidade via CTE recursiva
  - `team_is_descendant(team_id, ancestor_id)`: verifica descendência via CTE recursiva
  - `user_can_manage_team(user_id, team_id)`: regra FINAL de gestão (líder direto OU admin)
  - `get_manageable_teams(user_id, bu_id)`: retorna IDs dos times gerenciáveis
- **Frontend Team Management**:
  - Novo hook `useTeamManagement()` em `src/hooks/useTeamManagement.ts`
  - Helper `canManageTeam(teamId)` para controle de UI
  - Array `manageableTeamIds` para filtragem
- **Regras de gestão de times documentadas**:
  - Líder gerencia APENAS próprio time e filhos diretos
  - Proibido gerenciar time pai, irmãos ou outros ramos
  - Admins e super_admins podem gerenciar qualquer time da BU

### v2.1.0 (2026-01-06) — TCR Consolidation
- **Documentação consolidada** do novo padrão de links:
  - Seção 4.3 reescrita para refletir remoção de `buId` da URL
  - Tabela completa de entidades suportadas pelo `/go/:entity/:id`
  - Documentação do helper `getShareableUrl()` e `getShareableAbsoluteUrl()`
  - Regras claras de onde usar links compartilháveis vs internos
  - Fluxo detalhado do `ResolveContextPage`
  - Documentação das SQL functions para códigos de assets
- **Contexto de BU** documentado como fonte única de verdade
- **Removidas referências obsoletas** a `/bu/:buId/` nas rotas

### v2.46.0 (2026-01-21)
- **Global Partner Contacts v1.0**:
  - Contatos de parceiros agora são globais (únicos por email)
  - Nova tabela `partner_contact_bu_associations` para vínculo N:N entre contatos e BUs
  - Constraint `UNIQUE (lower(email)) WHERE deleted_at IS NULL` em `partner_contacts`
  - Campo `bu_id` em `partner_contacts` tornado nullable (deprecated)
  - Migração automática de dados existentes para nova estrutura
  - RLS atualizada para ler contatos via tabela de associações
  - Modal de cadastro refatorado para fluxo multi-step:
    - Step 1: Verificação de email (busca global)
    - Step 2a: Contato existente → botão "Ativar nesta BU"
    - Step 2b: Contato novo → formulário completo
  - Novos hooks: `useCheckContactByEmail`, `useActivateContactInBu`, `useCreateGlobalContact`
  - Edge functions atualizadas: `send-partner-invite`, `request-magic-link`
  - Hook `useExternalUser` atualizado para buscar BUs via associações
  - Hook `usePartnerContacts` atualizado para listar via associações

### v2.0.0 (2026-01-06) — Link Standard Refactoring
- **Padrão Oficial de Links Compartilháveis**:
  - Formato único: `/go/:entity/:id` para TODOS os links externos, compartilháveis, notificações, busca
  - Entidades suportadas: `asset`, `team`, `user`, `ticket`, `okr_org_objective`, `okr_team_objective`, `okr_org_kr`, `okr_team_kr`, `keyring`, `gift`, `kpi`
  - Helper centralizado: `getShareableUrl(entity, id)` em `src/lib/shareableLinks.ts`
  - Links internos nunca incluem `buId` na URL
- **Compatibilidade com QR Codes Físicos**:
  - Rota legada `/assets/:code` mantida permanentemente (etiquetas já impressas)
  - Se usuário autenticado → resolve BU via `resolve_asset_by_code_global()` → redireciona para `/go/asset/:uuid`
  - Se não autenticado → renderiza página pública `/p/assets/:code`
- **SQL Functions para Asset Codes**:
  - `normalize_asset_code(code)`: remove não-dígitos, aplica LPAD(4)
  - `resolve_asset_by_code_for_bu(bu_id, code)`: resolve asset UUID dentro de uma BU
  - `resolve_asset_by_code_global(code)`: resolve asset UUID + bu_id globalmente (SECURITY DEFINER)
  - Índice único parcial: `(bu_id, internal_code) WHERE deleted_at IS NULL`
- **PublicAssetRedirect refatorado**:
  - Detecta autenticação antes de decidir entre público/interno
  - Usa RPC `resolve_asset_by_code_global` para normalizar código
  - Troca BU automaticamente antes de navegar
- **Edge Function `get-public-asset`**:
  - Usa `resolve_asset_by_code_global()` para normalização consistente
  - `internal_view_path` retorna `/go/asset/{uuid}` sempre
- **ResolveContextPage expandido**:
  - Novas entidades: `okr_org_kr`, `okr_team_kr`, `kpi`
  - Labels e rotas para todas entidades do Hub

### v2.15.0 (2026-01-11)
- **Auditoria Completa e Limpeza**:
  - Análise completa de DB/Backend/Frontend executada
  - Todos os componentes UI não utilizados removidos (carousel, menubar, context-menu, toggle-group, navigation-menu, input-otp, aspect-ratio, resizable, toggle)
  - Dependências npm correspondentes removidas
  - Hooks mock removidos (useMockOkrData, useMockKpiData)
  - **NOTA**: Entrada sobre `mentions` estava incorreta — ver v2.19.0 para correção
- **Relatório de Saúde Técnica**:
  - Novo documento `HEALTH_REPORT_2026-01-11.md` com status completo
  - Zero violações de padrões TCR
  - 100% compliance com standards de segurança
  - RLS em todas as tabelas operacionais
  - SECURITY INVOKER em todas as views
  - search_path fixo em todas as funções
- **Índice de Documentação Consolidado**:
  - TCR header atualizado com links para todos os docs técnicos
  - Documentação categorizada por área (Padrões, Dados, Identity, Compliance, Ops)
- **Linter Status**:
  - SECURITY DEFINER Views: falso positivo (security_invoker=true em reloptions)
  - RLS WITH CHECK(true): 4 tabelas de audit (exceção documentada)
  - Extension in public: warning aceitável

### v2.14.0 (2026-01-10)
- **Wave 8 — External User Dashboard**:
  - Dashboard dedicado para usuários externos (`employment_status = 'external'`)
  - Novo hook `useExternalUser()` para detecção e dados específicos
  - Componentes: `ExternalHero`, `ExternalTicketsSection`, `ExternalQuickActions`
  - Rota `/external` com guarda `ExternalDashboardPage`
  - RLS para tickets: contatos externos veem apenas tickets onde são `assigned_contact_id`
  - Notificações filtradas para externos
- **Performance Sweep (Wave P2.3)**:
  - 23 índices de banco adicionados para performance
  - Agregação RPC para dashboards implementada

### v2.10.0 (2026-01-08)
- **Modelo de Identidade documentado e enforced**:
  - Nova seção 4.10 "Modelo de Identidade (auth.users.id vs profiles.id)"
  - Funções canônicas: `my_profile_id()`, `my_profile_id_strict()`, `profile_id_from_user_id()`, `user_id_from_profile_id()`, `assert_profile_identity()`
  - View `identity_rls_violations` para detectar RLS policies incorretas
  - Script `npm run audit:identity` para varredura de código
  - Correção de 18 policies RLS em OKRs, Tickets, KPIs, Teams
  - Correção de 4 registros legados em Assets (auth.users.id → profiles.id)
  - Documentação completa em `docs/IDENTITY_CONVENTION.md` v2.0
  - Relatórios: `IDENTITY_FULL_SYSTEM_COMPLIANCE_REPORT.md`, `IDENTITY_PREVENTION_REPORT.md`
- **Regra de Ouro**: Colunas de domínio (`owner_user_id`, `leader_user_id`, `current_user_id`, etc.) armazenam `profiles.id`. Comparações em RLS devem usar `my_profile_id()`, nunca `auth.uid()` diretamente.

### v1.9.0 (2026-01-06)
- **BU Session Core** implementado (remoção de `buId` da URL):
  - Nova página `ResolveContextPage` (`/go/:entity/:id`) resolve BU do recurso antes de navegar
  - Entidades suportadas: `asset`, `team`, `user`, `ticket`, `okr_org_objective`, `okr_team_objective`, `keyring`, `gift`
  - Valida acesso do usuário à BU via `user_has_bu_access()` antes de redirecionar
  - Telas de loading e erro dedicadas para UX fluida
  - `BuContext.setCurrentBuId()` agora limpa cache do TanStack Query (`queryClient.clear()`)
- **Edge Function `get-public-asset`** atualizada:
  - `internal_view_path` agora aponta para `/go/asset/{id}` (resolve BU automaticamente)
  - Links externos sempre passam pelo resolver para garantir BU correta
- **Padrão de links compartilháveis**:
  - Links públicos, busca global e notificações devem usar `/go/{entity}/{id}`
  - Rotas operacionais não têm mais `buId` na URL
  - BU ativa vem exclusivamente do contexto de sessão (`currentBuId`)

### v1.8.0 (2026-01-06)
- **Permission Core** implementado:
  - Nova função SQL `get_my_permissions(bu_id)` retorna array de permission keys
  - Novo hook `usePermissions()` centralizado em `src/hooks/usePermissions.ts`
  - Novo guard `RequirePermission` em `src/components/auth/RequirePermission.tsx`
  - Admins/super_admins recebem `['*']` (wildcard)
- **Remoção do role "ceo"**:
  - Tipo `HomeDashboardData.role` agora usa `"executive" | "leader" | "collaborator"`
  - `CeoDashboardPage` renomeado para `ExecutiveDashboardPage`
  - Rota `/okrs/ceo` alterada para `/okrs/executive`
  - Removidas referências a "ceo" e "director" do frontend
- **Novas permissões no catálogo**: `hub.global.view`, `hub.global.manage`

### v1.7.0 (2026-01-06)
- **RLS para BU Admins** aprimorado:
  - **Teams/Squads**: BU admins podem gerenciar times, squads, memberships
  - **Profiles**: BU admins podem visualizar e editar perfis da sua BU
- **Sistema de Permissões (UI)**: aba "Grupos" mostra mensagem para admins de BU

### v1.6.0 (2026-01-06)
- **Kits de Inventário** implementados:
  - Novas tabelas: `asset_groups`, `asset_group_items`
  - Enums: `asset_group_type`, `asset_group_status`, `asset_group_item_role`
  - Triggers para sincronização automática de `primary_asset_id`
  - Função `get_kit_required_accessories(asset_id)` para checkout integrado
  - Componentes: `KitSection`, `CreateKitDialog`, `AddToKitDialog`, `KitCheckoutInfo`
  - Hook: `useAssetGroups` para CRUD de kits
  - Busca global inclui kits (`assets_kits`)
- **Página Pública de Assets** aprimorada:
  - Edge Function `get-public-asset` retorna dados sanitizados (sem JWT)
  - Campos públicos: name, internal_code, status, photos, holder_summary, due_at, last_moved_at
  - Dados da BU: name, legal_entity, cnpj
  - Itens relacionados (kit) sanitizados
  - Nunca expõe: serial_number, acquisition_value, documents, current_user_id, nomes
  - Rota `/assets/:code` compatível com QR codes existentes
- **BU Aware Routing** implementado:
  - Padrão de rotas: `/bu/:buId/{moduleRoute...}` para todos os módulos operacionais
  - Helper: `getBuScopedPath(buId, path)` em `src/lib/buRouting.ts`
  - Hook: `useBuRouting()` e `useRequiredBuId()` em `src/hooks/useBuRouting.ts`
  - Guard: `BuScopedRoute` valida acesso à BU e sincroniza contexto
  - Invalidação automática de TanStack Query ao trocar BU
  - Links internos sempre usam BU explícita na URL
  - Página pública monta link interno com `bu_id` do asset
  - Rotas legadas redirecionam para versão bu-scoped
  - Módulos cobertos: assets, okrs, teams, users, tickets

### v1.5.0 (2026-01-06)
- **Migração de componentes para padrão centralizado**:
  - `OkrStatusBadge`: Agora usa `StatusDot` compartilhado
  - `TeamKrListItem`: Migrado para `StatusBadge` centralizado
  - `InventoryDetailView`, `GiftItemCard`: Status badge padronizado
  - `ProtectedRoute`, `BuRequiredRoute`, `AdminRoute`: Migrados para `LoadingState`
  - `KpiDashboardPage`, `ClaviculariesTab`, `TeamContributionPage`: Loaders centralizados
  - `SearchPage`, `GlobalIntegrationsPage`: `EmptyState` e `ErrorState` padronizados
  - `OkrsPage`, `KpiDashboardPage`, `TicketsPage`, `Users`, `SearchPage`: `PageHeader` centralizado
- **Query Keys normalizadas**:
  - `useTeams`, `useTickets`, `useCategories`, `useTicketMessages`, `NotificationCenter`, `Users`: Agora usam `queryKeys.ts`
- **Componentes compartilhados documentados** (`src/components/ui/`):
  - `StatusBadge`, `StatusDot` - Status visual com variantes semânticas
  - `LoadingState`, `LoadingSpinner`, `SkeletonCard`, `SkeletonList`, `SkeletonTable` - Estados de carregamento
  - `ErrorState` - Estado de erro com retry
  - `EmptyState` - Estado vazio com CTA
  - `FilterBar`, `FilterSection` - Barra de filtros reutilizável
  - `PageHeader` - Cabeçalho de página padronizado

### v2.35.0 (2026-01-15)
- **Performance Metrics Dashboard (P4) - COMPLETO**:
  - **Nova tabela:** `perf_metrics_snapshots` - Armazena snapshots de métricas de performance
    - Campos: `id`, `bu_id`, `collected_at`, `metrics` (JSONB)
    - RLS policies para admins apenas
  - **Novas funções SQL:**
    - `collect_perf_metrics()` - Coleta métricas de todas as tabelas (scans, tuplas, índices)
    - `cleanup_old_perf_snapshots()` - Remove snapshots > 30 dias
  - **Edge Function `cron-dispatcher` atualizada:**
    - Integra coleta de métricas a cada execução (5 min)
    - Cleanup diário de snapshots antigos (1x por dia)
  - **Dashboard UI:** `/hub/performance`
    - Cards com métricas: Snapshots, Tabelas monitoradas, Taxa de índice, Scans por segundo
    - Gráficos de série temporal para table scans e index usage
    - Top 10 tabelas com mais scans
    - Hook: `usePerfMetrics.ts` para fetch de dados
  - **Navegação:** Sidebar atualizada com link para Performance (ícone Activity)
  - **Documentação:** `PERF_METRICS_DASHBOARD.md` v1.4.0
- **Data Model Registry regenerado** - 107 tabelas, 23 views, 70 enums documentados

### v2.24.0 (2026-01-12)
- **RLS V2 Migration - 100% Completo**:
  - Todas as 79 tabelas migradas para RLS V2 usando `has_permission()` e `is_profile_bu_member()`
  - **Módulos migrados**:
    | Módulo | Tabelas | Status |
    |--------|---------|--------|
    | Assets | 14 | ✅ 100% |
    | OKRs | 12 | ✅ 100% |
    | KPIs | 2 | ✅ 100% |
    | Tickets | 8 | ✅ 100% |
    | Teams | 5 | ✅ 100% |
    | Profiles | 1 | ✅ 100% |
    | Notifications | 2 | ✅ 100% |
    | Automations | 4 | ✅ 100% |
    | Partners | 4 | ✅ 100% |
    | AI/Agents | 6 | ✅ 100% |
    | BU Config | 8 | ✅ 100% |
    | Global/Infra | 13 | ✅ 100% |
  - **Funções legadas removidas**: Todas as policies agora usam `has_permission(my_profile_id(), bu_id, 'key:scope')` em vez de `has_role()`, `is_bu_admin()`, `is_platform_admin()` direto
  - **Padrão SELECT**: `is_profile_bu_member(my_profile_id(), bu_id)` para leitura
  - **Padrão INSERT/UPDATE/DELETE**: `has_permission(my_profile_id(), bu_id, 'module.entity.action:scope')`
  - Cleanup de policies legadas duplicadas

### v2.29.0 (2026-01-13)
- **Auth OTP Code Migration**:
  - Sistema de autenticação migrado de Magic Link para OTP Code (6 dígitos)
  - **Motivo**: Scanners de email corporativos invalidavam Magic Links antes do usuário clicar
  - **Fluxo novo**:
    1. Usuário insere email → validação de domínio
    2. Supabase Auth envia email com código de 6 dígitos
    3. Usuário insere código na tela de verificação
    4. Sistema verifica OTP e autentica
  - **Arquivos alterados**:
    - `supabase/functions/request-magic-link/index.ts` — Usa `signInWithOtp()` ao invés de `generateLink()`
    - `src/hooks/useAuth.tsx` — Novo método `verifyOtp()`
    - `src/pages/Auth.tsx` — UI de input de 6 dígitos com auto-focus e paste
  - **Edge Function**: Nome `request-magic-link` mantido por compatibilidade (envia OTP Code)
  - **Documentação atualizada**: TCR, GO_LIVE_CHECKLIST, MEMBERSHIP_RECOVERY_REPORT, tcr-content.ts

### v2.23.0 (2026-01-12)
- **Impersonation System v2.0** completo
- **Identity Cutover v3.0** finalizado

### v2.26.0 (2026-01-12)
- **Sistema Vic Culture — Guardião da Cultura**:
  - **Pool de mensagens reescrito**: Todas as 600+ frases agora limitadas a **60 caracteres**
  - **`useCultureMessage` hook refatorado**:
    - Usa agente IA "cultura" via `invoke("cultura", "dashboard-culture")` 
    - Cache inteligente por turno (máx 3 chamadas/dia)
    - Contexto rico: dia, turno, role, OKRs, pendências, ciclo
    - Fallback robusto com seleção contextualizada do pool
    - Truncamento automático para 60 caracteres
  - **Novo hook `useGreetingSubtext`**:
    - Gera subtexto contextualizado para saudação na home
    - Considera: dia/turno, role, liderança, times, performance, aniversários
    - Cache por turno + fallback inteligente
    - Integra com agente IA para personalização
  - **Arquivo `src/data/cultureMessages.ts`**:
    - 14 categorias temáticas (simplicidade, cultura, execução, colaboração, etc.)
    - 3 perfis (executive, leader, collaborator)
    - Mensagens por momento (segunda-sexta, início/fim de ciclo)
    - Mensagens por turno (manhã, tarde, noite)
    - Função `getContextualCultureMessage()` com pool ponderado
- **Leader Detection em Permissões**:
  - `useBuUsers` hook atualizado: inclui `is_team_leader` e `led_teams[]`
  - Badge "Líder" com tooltip mostrando times liderados
  - Query busca `teams.leader_user_id` comparando com `profile_id`
  - Ordenação: líderes aparecem mais acima na lista de permissões

### v2.25.0 (2026-01-12)
- **Wave 2 - Deprecações CONCLUÍDO**:
  - ✅ `profiles.job_title` - Coluna já removida do banco (migrado para `job_title_id`)
  - ✅ `user_notification_preferences` - Tabela já removida (migrado para v2)
  - ✅ `send-magic-link` - Edge function removida (0 chamadas em 30 dias, substituída por `request-magic-link`)
- **Cleanup de documentação**:
  - `LEGACY_CLASSIFICATION_MATRIX.md` atualizado para v2.0
  - `DEPRECATION_SEND_MAGIC_LINK.md` e `DEPRECATION_SEND_MAGIC_LINK_REPORT.md` removidos
  - Script `generate-data-model-registry.ts` atualizado
- **Tabela `mentions` global restaurada** (correção v2.19.0):
  - Modelo com `entity_type` + `entity_id` para uso multi-módulo
  - RLS V2 policies aplicadas
  - Frontend atualizado (`useTickets.ts`, `useTicketMessages.ts`)

### v2.63.0 (2026-01-22)
- **Ticket Watcher Messaging Fix v1.0**:
  - Corrigido: Watchers (mencionados) agora podem enviar mensagens
  - Problema: `TicketDetailPage` usava `profileId` em vez de `realProfileId` para mutations
  - Solução: Usar `realProfileId` do `useIdentity()` conforme IDENTITY_CONVENTION.md
- **Ticket Message Pinning RLS v3**:
  - Nova policy `ticket_messages_update_v3` permite criador/owner do ticket fixar mensagens
  - Função `can_pin_ticket_message()` valida permissão de pinagem
  - Corrigido erro "Cannot coerce result to single JSON object"
- **Tickets UI Badge Standardization v1.0**:
  - Criado `TICKET_TYPE_STYLES` em `src/lib/colors.ts` (padrão canônico)
  - `TicketsTable` agora usa estilos canônicos de `colors.ts` para tipo e status
  - Badges com dot colorido + fundo muted (consistência com detail page)
- **Assets Inventory Return Date Column v1.0**:
  - Campo `expected_return_at` adicionado ao tipo `AssetInventory`
  - Query enriquecida para buscar `due_at` da última movimentação de checkout
  - Nova coluna "Devolução" na tabela de inventário com indicadores visuais de atraso
- **System Audit Report 2026-01-22**:
  - Relatório completo de auditoria criado em `docs/audits/SYSTEM_AUDIT_2026-01-22.md`
  - Identificados débitos técnicos P1/P2/P3 e plano de ação

### v2.58.0 (2026-01-22)
### v3.7.0 (2026-02-12)
- **Manager Auto-Assignment v1.0**:
  - **Trigger `sync_manager_from_team_leader`** em `profiles`: Auto-preenche `manager_user_id` com `teams.leader_user_id` quando `team_id` é atribuído e gestor está vazio. Não se auto-atribui.
  - **Trigger `propagate_leader_change_to_members`** em `teams`: Ao mudar `leader_user_id`, atualiza `manager_user_id` de membros que apontavam para o líder antigo. Preserva gestores manuais.
  - **Frontend `JetimoberDialog.tsx`**: Pré-preenche campo "Gestor" ao selecionar time, permitindo ajuste manual.
  - **Migration one-time**: Corrigidos 5 profiles com `manager_user_id = NULL` que deveriam herdar o líder do time.
- **Null-Safe Sort Standard v1.0**:
  - Corrigidos 4 `.sort()` com `localeCompare` em `CreateTicketPage.tsx` que crashavam com `name: undefined`.
  - Causa raiz: `v_partner_services_by_bu` retorna `subcategory_name: NULL` para empresas generalistas.
  - **Nova regra em DEVELOPMENT_STANDARDS §I (anti-pattern #15)**: Todo `.sort()` com `localeCompare` DEVE usar `?? ''`.
- **Onboarding Race Condition Fix**:
  - `OnboardingWizard.tsx`: Cache atualizado sincronamente (`setQueryData`) antes de navegar para `/select-bu`.
  - Evita que `OnboardingGuard` leia dados stale e redirecione de volta para `/onboarding` (tela branca).


  - **7 Partial Indexes para Soft-Delete**: Criados índices parciais (`WHERE deleted_at IS NULL`) para:
    - `partner_company_bu_associations`, `squad_memberships`, `squads`, `ticket_categories`
    - `ticket_messages`, `ticket_routing_rules`, `ticket_subcategories`
  - **pg_cron Cleanup Semanal**: Agendado `cleanup_old_logs()` via pg_cron (Domingo 03:00 UTC)
  - **user_team_memberships Schema Fix**: 
    - Corrigido: Tabela **não possui** coluna `is_active` (membership ativo = registro existe)
    - RPCs `user_has_permission_ctx` e `get_visible_ticket_ids_for_impersonation` atualizadas
    - Frontend `UserHoverCard.tsx` corrigido (removido filtro `.eq('is_active', true)`)
  - **18 Edge Functions Documentadas**: Todas as funções ativas catalogadas no TCR
  - **Relatório de Saúde Atualizado**: `HEALTH_REPORT_2026-01-22.md` reflete estado atual

### v2.57.0 (2026-01-22)
- **TCR Edge Functions Documentation**:
  - Documentadas 18 edge functions ativas com status e categoria
  - Adicionada seção "Edge Functions" no TCR

### v2.56.0 (2026-01-22)
- **Impersonation Ticket List External Support v1.0**:
  - Corrigida RPC `get_visible_ticket_ids_for_impersonation` para suportar usuários externos (partner_contacts)
  - Problema: Usuários externos impersonados não viam lista de tickets porque a RPC só verificava `profile_id`
  - Solução: RPC agora resolve `auth.uid` do perfil e verifica participação via `partner_contact_id`
  - Paridade com `can_view_ticket` que já suportava usuários híbridos
  - Afeta: Listagem de tickets durante impersonação de contatos externos

### v2.22.0 (2026-01-12)
- **Technical Debt Sprint P1-P3**:
  - **P1 - Crítico** (✅ 100% completo):
    - Cleanup automático de logs via `cron-dispatcher` (ai_agent_logs 90d, cron_logs 30d, wizard_sessions 7d)
    - 7 novos índices de performance criados (ai_agents, app_error_logs, cycles, okr_objective_reviews, ticket_attachments, ticket_messages, ticket_participants)
    - Documentação atualizada
  - **P2 - Importante** (✅ 75% completo):
    - `supabase/functions/_shared/response.ts` criado com helpers padronizados para respostas
    - Hooks de debounce consolidados em `src/hooks/useDebounce.ts` (useDebouncedValue, useDebouncedCallback, useDebouncedCallbackAdvanced)
    - `TicketMentionInput.tsx` removido (deprecated, substituído por MentionInput)
    - Migração text→enum adiada (views dependentes)
  - **P3 - Backlog** (✅ 100% avaliado):
    - `LegacyAssetRedirect.tsx` removido (dead code - importado sem rota)
    - `queryKeys` já modularizado em `/queryKeys/*.ts` - migração gradual
    - `ticket_subcategories` avaliado: baixo impacto (1 ticket usa), manter como está
- **Cleanup de código**:
  - Removidos arquivos: `LegacyAssetRedirect.tsx`, `TicketMentionInput.tsx`, `useDebouncedValue.ts`, `useDebouncedCallback.ts`
  - Imports atualizados para novos módulos consolidados

### v2.64.0 (2026-01-22)
- **Database Hygiene Wave — Score 10/10**:
  - `cleanup_old_logs()` atualizada para incluir `audit_logs` com retenção de 180 dias
  - Função consolidada agora gerencia 5 tabelas: `ai_agent_logs` (14d), `perf_metrics_snapshots` (14d), `cron_execution_logs` (7d), `okr_wizard_sessions` (30d), `audit_logs` (180d)
  - pg_cron já configurado para execução semanal (domingo 03:00 UTC)
- **Índices de Performance P2**:
  - `idx_ai_agent_logs_agent_id` — busca por agent_id
  - `idx_notification_deliveries_notification_id` — busca por notification_id
  - `idx_ai_agent_documents_agent_id` — busca por agent_id
  - `idx_okr_audit_log_entity_id` — busca por entity_id
- **Frontend Hygiene**:
  - `useDebounce` alias deprecated REMOVIDO de `src/hooks/useDebounce.ts`
  - Migrado `useInitiativeNameValidation.ts` para usar `useDebouncedValue`
  - Migrado `TeamOkrKrDetailStep.tsx` para usar `useDebouncedValue`
- **Audit Report atualizado**: `docs/audits/SYSTEM_AUDIT_2026-01-22.md` com todos itens P1/P2 resolvidos

### v2.28.0 (2026-01-13)
- **OKR Wizard Team Selection Fix**:
  - Wizard de criação de OKRs agora exibe seletor de times (`HierarchyContextSwitcher`) quando acessado sem `?team=` na URL
  - Antes: erro "Time não selecionado" forçava voltar para página anterior
  - Agora: usuário pode selecionar qualquer time gerenciável diretamente no wizard
  - Melhora UX para admins que não têm um time pessoal atribuído
- **OKR Dashboard Team Fallback Bugfix**:
  - Corrigido bug onde `userProfile?.team_id` de outra BU era usado como fallback
  - Novo comportamento: fallback só usa `team_id` se pertencer à BU atual (via `manageableTeamIds`)
  - Ordem de fallback: `URL param → team_id na BU atual → primeiro time gerenciável`
  - Afeta: botão "Novo Objetivo" no dashboard e empty state

### v2.27.0 (2026-01-13)
- **CheckinWizard Legacy Removido**:
  - Removido componente `CheckinWizard.tsx` (modal antigo de check-in)
  - Removido diretório `wizard/` com componentes: `WizardSetup`, `WizardKrSelection`, `WizardCheckinStep`, `WizardSummary`
  - Botão "Iniciar Check-in do Time" removido de `CycleCheckinsPage`
  - Check-ins agora usam **formato full-page** (padrão adotado para todos wizards de OKRs)
- **Correção useCycleCheckins**:
  - Hook atualizado para mapear corretamente resposta da RPC `get_cycle_checkins`
  - Mapeamento: `feed` → `checkins`, `total_count` → `total`
  - Filtro `rag_status` renomeado para `status` (alinhamento com RPC)
- **Correção useActiveCycles**:
  - Priorização de ciclos por tipo: `quarter > semester > year`
  - Ciclo default é agora o trimestre vigente (não mais o ano)
- **Documentação removida**:
  - `docs/OKR_CHECKIN_WIZARD_REPORT.md` (obsoleto)
  - `docs/qa/QA_OKR_CHECKIN_WIZARD.md` (obsoleto)

### v3.24.0 (2026-04-14) — Cross-BU Profile Visibility Fix v1.0
- **Correção de visibilidade cross-BU de perfis**:
  - **Causa raiz:** Policy RLS `profiles_select_bu_v2` verificava apenas `is_profile_bu_member(my_profile_id(), profiles.bu_id)` — bloqueava perfis cuja BU primária fosse diferente da do viewer, mesmo compartilhando BU via `bu_user_memberships`
  - **Correção:** Adicionada condição `OR EXISTS` na policy para permitir visibilidade quando viewer e target compartilham qualquer BU via memberships
  - **Detalhe técnico:** Usa `their_m.profile_id = profiles.id` (não `user_id`) para cobrir perfis sem login (`user_id = NULL`), consistente com `v_bu_active_profiles`
  - **Segurança:** Isolamento de BU mantido — só vê perfis com BU em comum; condição original preservada (OR)
  - **Usuários afetados (Jetimob):** Gabriel Peixoto, João Victor Ehlers Machado (BU primária Jet Experience, membership em Jetimob)
  - **Arquivos:** Migration SQL (DROP + CREATE policy `profiles_select_bu_v2`)

### v3.23.0 (2026-04-07)
- **QBR Executive Report v1.1** — Relatório executivo de QBR com narrativa IA:
  - Nova rota: `/okrs/executive/qbr-report?cycle=<id>` — acessível a **todos os usuários da BU** (sem restrição de admin)
  - Estrutura: Resumo Narrativo (IA Gemini), Evolução de Indicadores (KPI Evolution), Ponto Crítico (MRR Churn × MRR Commit × Receita de Expansão × Orçamento Mkt & Vendas com eficiência de custo), Como Chegamos Aqui (OKRs Organizacionais + contribuições)
  - Persistência via `okr_wizard_sessions` (`wizard_type = 'qbr-executive-report'`) — snapshot imutável em `reflection_data`
  - Auto-load: ao acessar a rota, carrega cache automaticamente sem necessidade de clicar "Gerar Relatório"
  - Correção de persistência: validação de `profile.id` antes do insert (RLS compliance)
  - KPI "Receita de Expansão" adicionado à tabela comparativa de Ponto Crítico com cálculo de `totalRevenue = mrrCommit + expansion`
  - **Arquivos:** `QbrExecutiveReportPage`, `useQbrExecutiveReport`, `CriticalKpiComparison`, `KpiEvolutionCard`, `OkrContributionsSection`
- **Auth Token Refresh Deduplication v1.0** — Correção de perda de sessão por 429 rate limit:
  - **Causa raiz:** 3 clientes Supabase (client.ts, globalClient.ts, buScopedClient.ts) todos com `autoRefreshToken: true` competindo para renovar token
  - **Correção:** `buScopedClient.ts` agora usa `autoRefreshToken: false` e sincroniza sessão via listener `onAuthStateChange` do `globalClient`
  - **Import fix:** `useAuditHistory.ts` migrado de `client.ts` → `globalClient.ts` (último arquivo que importava `client.ts`)
  - **Resultado:** apenas 1 client renova tokens, eliminando tempestade de requests `/token`
  - **Arquivos:** `buScopedClient.ts`, `useAuditHistory.ts`

### v3.22.0 (2026-04-06)
- **QBR Rituals Enhancement v1.1** — Melhorias aditivas nos rituais QBR Meeting e QBR Post:
  - **QBR Meeting — Opening Step (Item 2):**
    - Scorecard do quarter: 4 metric cards (OKRs healthy/at_risk/off_track + times sem submissão)
    - Pauta obrigatória do C-Level com fallback visual ("sessão C-Level não submetida")
    - Agenda visual da reunião (5 steps com indicador de progresso)
    - KPIs em alerta mantidos (reposicionados após novos blocos)
  - **QBR Meeting — Closing Step (Item 4):**
    - Resumo de governança: contadores de OKRs aprovados/ajustados/diferidos/descartados, decisões com dono, compromissos
    - Checklist dinâmico: itens habilitados condicionalmente (`allTeamsReviewed`, `decisionsHaveOwners`) com tooltip de pendência
  - **QBR Post — Promotion Step (Item 5):**
    - Flags de calibração do C-Level exibidas por time
    - Campo de ajuste inline (`adjustmentNotes`) para OKRs aprovados "com ajuste" (`approved_with_changes`)
    - Indicador de dependências cross-área (badge "Depende de: [time]")
  - **QBR Post — Minutes Step (Item 6):**
    - Resumo automático read-only (dados estruturados, sem IA): OKRs promovidos por time, decisões com dono/prazo, compromissos cross-área, times sem promoção
    - Collapsible expandido por padrão, acima do campo de ata narrativa
  - **Tipo `QbrPostDraftData`:** Novo campo `adjustmentNotes?: Record<string, string>`
  - **Arquivos impactados:** `QbrMeetingOpeningStep`, `QbrMeetingClosingStep`, `QbrMeetingPage`, `QbrPostOkrPromotionStep`, `QbrPostMinutesStep`, `QbrPostPage`, `types/wizard.ts`
  - Sem alteração de schema, edge functions ou RLS — dados derivados de snapshots imutáveis em `reflection_data`
  - Items já implementados previamente: Step Balanço do Quarter (qbr-pre-clevel) e Flags/Adendos no OKR Review (qbr-meeting)

### v3.21.0 (2026-03-30)
- **Documentation Update v1.0**:
  - `docs/HUB_ADMIN_DEEP_DIVE.md` — Deep dive técnico da área `/hub` (19 rotas, 12 wizard_types, QBR state machine, RBAC V3)
  - `docs/BU_SETTINGS_DEEP_DIVE.md` — Deep dive técnico de BU Settings e todos os módulos operacionais (~95 rotas totais)
  - Contagens atualizadas: 123 tabelas + 27 views, 157 funções SQL (via types), 85 enums, 26 edge functions
  - Novas tabelas desde v3.20.0: `ritual_cadences`, `ritual_occurrences`, `asset_recommendations`, `kpi_data_contributors`, `kpi_target_history`, `project_comments`, `project_comment_attachments`
  - Novas views: `v_all_participants`, `v_identity_health_check`, `v_partner_services_by_bu`, `v_teams_clean`
- **handle_new_user Deterministic BU Fix v1.0**:
  - Profile pré-existente (importado por admin) preserva `bu_id` original em vez de sobrescrever com domínio
  - Domínio `jetimob.com` removido da BU Jet Experience para resolução determinística
- **Ritual Calendar Health Filters v1.0**:
  - Filtros da aba Saúde agora usam mesmo layout da aba Calendário (grid 4 cols, período inline)

### v3.20.0 (2026-03-29)
- **Módulo Projetos v1.4 — Comments System & Test Coverage**:
  - Novas tabelas: `project_comments`, `project_comment_attachments` — sistema de comentários completo
  - Storage bucket: `project-attachments` (privado, signed URLs)
  - Realtime habilitado para `project_comments`
  - Funcionalidades: texto rico, menções (@), anexos, reply, pin/unpin
  - Reutiliza sistema genérico de messaging (`MessageBubble`, `ReplyPreview`)
  - Filtros salvos (`SavedLinksPopover`) adicionados à listagem
  - RLS: author/admin para update/delete, BU-scoped para select/insert
  - Fix: `project_teams` RLS alinhada com `projects` (adicionado `is_leader_of_project_owner`)
  - 19 hooks, 16 componentes, 2 páginas
  - 112 testes passando no módulo (era 78)
  - Novos testes: externalUrlLabel, useGanttData, ProjectViewToggle, comment types

### v3.19.0 (2026-03-27)
- **Módulo Projetos v1.3**:
  - Nova tabela: `milestone_krs` — vinculação granular de KRs a milestones individuais (cross-area)
  - `project_milestones`: campo `notes` (text, opcional) adicionado
  - Campos obrigatórios em projetos: `owner_id`, `start_date`, `due_date` — validação Zod no dialog
  - Milestones: todos campos (due_date, owner_id, notes) permanecem opcionais
  - Gantt charts: visualização na listagem geral (`view=gantt`) e inline no detalhe do projeto
  - Gantt charts: validação defensiva de datas (`isValidDateStr`) para evitar crashes com `parseISO`
  - Gantt charts: notas de milestones exibidas nos tooltips
  - Filtros completos na listagem: status, responsável, time, vínculo a KR, busca textual
  - Vinculação de projetos a KRs pela UI de OKRs (`ProjectsForKrLinkingSection`)
  - Mobile UX: responsive charts, filtros empilhados, botões com ícones apenas
  - 17 hooks, 15 componentes, 2 páginas
  - 78 testes passando no módulo

### v3.18.0 (2026-03-26)
- **Projects Permissions Parity v1.0**:
  - Templates de permissão: `projects_manager` (7 keys), `projects_admin` (8 keys)
  - Hook: `useProjectPermissionsV2` com 9 flags de permissão
  - Module Access registrado em `MODULE_VIEW_PERMISSIONS`

### v3.17.0 (2026-03-26)
- **Projects Module Documentation Parity**:
  - Documentação TCR completa para módulo Projetos
  - Contagens: 118 tabelas + 27 views, 219 funções SQL, 85 enums

### v3.16.0 (2026-03-26)
- **Módulo Projetos v1.0**:
  - 5 novas tabelas: `projects`, `project_teams`, `project_krs`, `project_milestones`, `project_milestone_dependencies`
  - 2 novos enums: `project_status`, `project_impact`
  - 1 nova função SQL: `calculate_project_health` (SECURITY DEFINER, search_path = public)
  - RLS completa com enforce_bu_scope e updated_at triggers
  - Frontend: types, hooks, utils, 7 componentes, 2 páginas (/projects, /projects/:id)
  - Integrações aditivas: ProjectsSummary nos wizards (TeamCheckin, LeaderPrep, MBR), ProjectsForKrSection na visão de KR, MyProjectsCard na Home
  - Sidebar atualizado (DynamicSidebar + MobileSidebar)
  - Contagens atualizadas: 118 tabelas + 27 views, 219 funções SQL, 85 enums, 1896 testes passando

### v3.15.1 (2026-03-25)
- **Metrics Correction**:
  - Contagens corrigidas: 113 tabelas + 27 views (antes "140 tabelas"), 82 enums (antes 94), 25 edge functions (antes 26)
  - 218 funções SQL confirmadas (sem alteração)
- **Test Suite 100% Green**:
  - 547 testes passando com 0 falhas
  - Automated Testing Framework atualizado para v1.2
  - Fixes: EditKpiDialog (BuContext mock + UnitSelect + scope assertions), OkrOwnerInfo (null/empty assertions), MbrPanoramaStep (unit formatting), MbrTeamOkrsSteps (navigation + reviewed text + progress format)

### v3.15.0 (2026-03-25)
- **AI Agents Model Migration — Gemini 3 Flash Preview**:
  - Todos os 11 agentes de IA ativos migrados para `google/gemini-3-flash-preview`
  - Agentes afetados: `alinhamento-estrategico`, `coach-okrs`, `persona-vic`, `analista-kpis`, `facilitador-decisoes`, `revisor-comunicacao`, `initiative-validator`, `kr-advisor`, `hr-onboarding-assistant`, `ticket-assistant`, `hub-admin-assistant`
  - Modelos anteriores: `gpt-4o-mini`, `gpt-4-turbo` → unificados em `google/gemini-3-flash-preview`
- **Documentação Consolidada v3.15.0**:
  - TCR atualizado com contagens reais: 113 tabelas + 27 views, 218 funções SQL, 82 enums, 25 edge functions
  - Edge Functions section atualizada: adicionadas 8 funções de resumo IA (collaborator, team, clevel, mbr, qbr-pre, qbr-meeting, qbr-post) + health-check
  - DEVELOPMENT_STANDARDS atualizado para v1.27.0 com QBR ritual e testing framework
  - Deep Dive, DOCUMENTATION_INDEX e tcr-content.ts sincronizados
  - Automated Testing Framework: test-utils com TooltipProvider, AuthContext, BuContext wrappers

### v3.9.0 (2026-03-03)
- **MBR (Monthly Business Review) Ritual v1.0**:
  - Wizard full-page de 7 etapas: Panorama Executivo → KPI Gate → Overview OKRs Times → Análise Detalhada por Time → OKRs Organizacionais → Decisões Estratégicas → Encerramento
  - **`MbrKpiSnapshot`** inclui `unit` (unidade de medida) e `lastValueAt` (data do último valor registrado)
  - Panorama Executivo agrupa KPIs ativos por escopo (Global/Área/Time) com `formatValueWithUnit` canônico
  - Cards de KPI exibem `LastCheckinBadge` com data humanizada do último update
  - Overview de OKRs usa layout de cards com pontuação de saúde (filtra apenas times com OKRs ativas)
  - Análise Detalhada por Time: UI simplificada com grid Base/Atual/Meta (sem progress bars internas)
  - Auto-seeding imutável de KPIs e OKRs para integridade de snapshot histórico
  - Rota `/okrs/mbr` com `requiresBuAdmin`
  - Componentes: `MbrPanoramaStep`, `MbrKpiGateStep`, `MbrTeamOkrsOverviewStep`, `MbrTeamOkrsDetailStep`, `MbrOrgOkrsStep`, `MbrDecisionsStep`, `MbrClosingStep`

### v2.83.0 (2026-02-03)
- **OKR/KPI Wizard Integration v1.0** — Integração aprimorada entre OKRs, KPIs e Wizards:
  - **Nova tabela `kpi_data_contributors`** — Modelo de contribuidores de dados separado de owners
    - Campos: `kpi_id`, `contributor_user_id`, `role` (data_entry/reviewer)
    - RLS: Membros podem visualizar, editores podem gerenciar
    - Indexes otimizados para lookup por usuário e KPI
  - **Tipos `KpiForWizardV2`** — Classificação de KPIs por papel do usuário:
    - `userRole`: 'owner' | 'contributor' | 'viewer'
    - `displayMode`: 'editable' | 'readonly' | 'alert'
    - `isStrategic`, `isGuardrailAtRisk`, `linkedKrIds`
  - **Hook `useKpisForWizardV2`** — Retorna KPIs separados por contexto:
    - `kpisToUpdate` — KPIs onde usuário é contribuidor
    - `kpisTeamContext` — KPIs do time (read-only)
    - `kpisStrategic` — KPIs organizacionais
    - `kpisInAlert`, `guardrailsViolated`
  - **Hook `useKpiContributors`** — CRUD de contribuidores de KPI
  - **Novos componentes de wizard**:
    - `KpiContextSection` — Separação visual de KPIs por papel (update/context/strategic)
    - `KrLinkedKpiCard` — Exibição condicional de KPIs vinculados a KRs (KPI Gate)
    - `LeaderKpiAlertStep` — Nova seção "Indicadores em Atenção" no Leader Prep
    - `ManagersSystemicKpisStep` — Nova seção de indicadores sistêmicos cross-team
    - `KpiContributorsManager` — UI para gerenciar contribuidores
  - **Atualizações de wizards**:
    - `CollaboratorContextStep` — 3 seções separadas de KPIs por papel
    - `CollaboratorKpiStep` — Mensagem de clareza (contribuidor vs responsável)
    - `TeamKrReviewStep` — KPI Gate condicional (só mostra quando relevante)
    - `CLevelInsightsStep` — Dados reais de sinais estratégicos
    - `LeaderPrepPage` — Novo step 'kpi-alerts'
    - `ManagersCheckinPage` — Novo step 'systemic-kpis'
  - **Arquivos criados/modificados**: 15+ componentes e hooks

### v2.21.0 (2026-01-12)
- **Technical Debt Analysis** criado em `docs/engineering/TECHNICAL_DEBT_ANALYSIS_2026-01-12.md`
- Análise completa de higienização, refatoração, centralização e performance
- Plano de ação P1/P2/P3 documentado

### v2.12.0 (2026-01-08)
- **Wave 7 — Sunset V1 (Permissions)**:
  - Modelo de permissões v1 congelado (read-only) via triggers
  - UI de edição v1 removida (apenas visualização legado)
  - Sistema de migração controlada v1 → v2 implementado
  - Tabela `permission_migrations` para tracking de migração por usuário
  - Dashboard de migração em `/hub/permissions` (aba "Migração")
  - Script `audit-permissions-v1-usage.ts` para detectar uso residual de v1
  - Documentação: `docs/permissions/WAVE7_V1_V2_MAP.md`, `docs/permissions/WAVE7_SUNSET_V1_REPORT.md`
- **Operações**:
  - **Playbook de Backup & Restore** criado em `docs/ops/BACKUP_RESTORE_PLAYBOOK.md`
    - Estratégias: Supabase Pro backups, PITR, pg_dump
    - Procedimentos por tipo de incidente
    - Checklist pós-restore
    - Responsabilidades e boas práticas

### v1.4.0 (2026-01-06)
- **Otimização Geral do Hub** (hardening + refactor):
  - **Componentes compartilhados**: `StatusBadge`, `StatusDot`, `LoadingState`, `LoadingSpinner`, `SkeletonCard`, `SkeletonList`, `SkeletonTable`, `ErrorState`, `FilterBar`, `PageHeader`
  - **Query Keys centralizadas**: `src/lib/queryKeys.ts` com padrões consistentes por módulo
  - **Índices de banco**: 23 novos índices para performance (profiles, teams, okrs, assets, tickets, notifications, memberships)
  - **Security Hardening**: RLS policies corrigidas para exigir autenticação e membership de BU em tabelas sensíveis (profiles, ai_agents, okr_*, teams, squads, asset_inventory, kpi_*, hub_integrations_catalog)
  - **Migrações de componentes**: InventoryCard, InventoryListItem, PublicAsset, GlobalSearch agora usam StatusBadge/StatusDot centralizados
- **Findings de segurança resolvidos**:
  - Dados de profiles restritos à mesma BU
  - AI agents requerem autenticação
  - OKRs, Times, Squads restritos por BU
  - Assets inventory restrito por BU (com acesso público limitado para QR codes)
  - KPIs restritos por BU
  - Catálogo de integrações restrito a admins

### v1.3.0 (2026-01-06)
- **Home Dashboard** melhorado:
  - Cards de aniversários, jet-aniversários e novos Jetimobers agora filtram por BU
  - Novos Jetimobers mostra últimos 30 dias
  - Nomes clicáveis com link para perfil do usuário (UserLink component)
- **Busca Global** corrigida:
  - Busca de pessoas agora usa `profiles.bu_id` diretamente (sem join)
  - Adicionado `currentBuId` ao contexto BuContext
- **profiles.bu_id** passa a ser campo principal para escopo de BU (não mais via join)
- **Módulo Tickets** adicionado à lista de módulos ativos

### v1.2.0 (2026-01-05)
- **Busca Global** implementada via Edge Function `global-search`
  - Busca multi-contexto em 13 entidades diferentes
  - Suporte a Assets com validação de permissões por sub-módulo
  - Componente Command Palette com atalho ⌘K
  - Página expandida `/search` com filtros por tipo
- **UI do módulo Assets** implementada
  - Páginas: Inventário, Chaves, Brindes, Relatórios, Configurações
  - Componentes: Cards, Dialogs, Filtros, Listas
  - Sub-navegação por tabs
- **Configuração de módulos por BU** via interface
  - Nova aba em `/settings/modules` para toggle de módulos por BU
  - Toggle on/off para módulos operacionais
  - Visualização de quantas BUs têm cada módulo ativo

### v1.1.0 (2026-01-05)
- Adicionado módulo **Assets** completo (Inventário, Chaves, Brindes)
- Adicionada entidade **bu_locations** para sedes por BU
- Adicionada entidade **okr_contributions** para relações informativas
- Adicionada entidade **okr_kr_metrics** para vínculo KR ↔ KPI
- Novos tipos de KR: regras de contribuição por tipo
- Proteção contra divisão por zero no cálculo de progresso
- Novas Edge Functions: `search-address`, `get-place-details`
- Novos eventos de automação para Assets e Locations
- Documentação de permissões por sub-módulo

### v1.0.0 (2026-01-05)
- Versão inicial do TCR
- Documentação completa de todas as entidades
- Regras de negócio consolidadas
- Funções de autorização renomeadas (`is_platform_admin`)

---

## Uso com ChatGPT

Para usar este documento como contexto no ChatGPT:

1. Copie o conteúdo completo deste arquivo
2. Cole no início da conversa com ChatGPT
3. Instrua: "Use este TCR como fonte de verdade para gerar código e decisões sobre o Hub"

**Prompt sugerido:**
```
Você é um desenvolvedor sênior trabalhando no Hub da Jet.
Todas as decisões devem respeitar o TCR (Technical Context Registry) fornecido.
Se houver conflito ou ambiguidade, pergunte antes de prosseguir.
Priorize: segurança, consistência com padrões existentes, simplicidade.
```
