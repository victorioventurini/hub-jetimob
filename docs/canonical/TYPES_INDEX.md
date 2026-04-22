# Types Index — Catálogo Canônico

> SSOT de navegação dos tipos do Hub. Use este índice para localizar definições antes de criar novos tipos.

## 🧭 Regras

1. **Tipos genéricos** (Pagination, ApiResponse, BaseEntity, SelectOption) → `src/shared/types/index.ts`
2. **Tipos de domínio** ficam no respectivo módulo: `src/modules/<domain>/types.ts`
3. **Tipos de feature interna** (sub-pastas) podem ter seu próprio `types.ts` desde que reexportados pelo barrel do módulo
4. **NUNCA** duplicar tipos entre módulos — importar do módulo de origem
5. **NUNCA** re-exportar tudo via `src/shared/types` — quebra tree-shaking

## 📂 Catálogo

### Shared (genéricos, sem domínio)
| Path | Contém |
|------|--------|
| `src/shared/types/index.ts` | PaginationParams, PaginatedResponse, BaseEntity, SoftDeletableEntity, BuScopedEntity, ApiResponse, SelectOption, SortParams, DateRangeFilter |
| `src/shared/url/types.ts` | UrlState, FilterState |
| `src/shared/saved-links/types.ts` | SavedLink, SavedLinkFilters |

### Domínio — OKRs
| Path | Contém |
|------|--------|
| `src/modules/okrs/types.ts` | Objective, KeyResult, Cycle, Initiative, Checkin, status enums |
| `src/modules/okrs/types/wizard/core.ts` | WizardPersona, WizardConfig, VicInsight |
| `src/modules/okrs/components/wizards/shared/framework/types.ts` | StepDefinition, FrameworkStepConfig, BalanceContent, KrsItem |

### Domínio — KPIs
| Path | Contém |
|------|--------|
| `src/modules/kpis/types.ts` | KPI, KpiValue, KpiContributor, KpiStatus, KpiArea |

### Domínio — Pessoas/BUs
| Path | Contém |
|------|--------|
| `src/modules/bu/types.ts` | BusinessUnit, BuLocation, BuFeatureFlag |
| `src/modules/teams/types.ts` | Team, TeamMember |
| `src/modules/areas/types.ts` | Area |
| `src/modules/users-global/types.ts` | GlobalUser, EmploymentStatus |
| `src/modules/permissions/types.ts` | Permission, PermissionTemplate, BuPermissionOverride |

### Domínio — Operacionais
| Path | Contém |
|------|--------|
| `src/modules/projects/types.ts` | Project, Milestone, ProjectHealth |
| `src/modules/assets/types.ts` | AssetItem, AssetCategory, AssetMovement, Keyring, GiftItem, PhoneLine |
| `src/modules/tickets/types.ts` | Ticket, TicketStatus |
| `src/modules/events/types.ts` | Event, EventOccurrence |
| `src/modules/automations/types.ts` | Automation, AutomationTrigger |
| `src/modules/integrations/types.ts` | Integration, IntegrationConfig |
| `src/modules/external/types.ts` | ExternalCompany, PartnerContact |
| `src/modules/partners/types.ts` | Partner, PartnerInvite |
| `src/modules/settings/types.ts` | Settings entries |
| `src/modules/home/types.ts` | HomeWidget, HomeData |
| `src/modules/vic/types.ts` | VicAgentSlug, VicMessage, VicConversation |

### Domínio — Mensagens / Notificações
| Path | Contém |
|------|--------|
| `src/components/messaging/types.ts` | Message, Conversation |
| `src/hooks/notifications/types.ts` | Notification, NotificationChannel |

### Routes
| Path | Contém |
|------|--------|
| `src/routes/types.ts` | RouteConfig, RouteParams |

### Banco de dados (auto-gerado, READ-ONLY)
| Path | Contém |
|------|--------|
| `src/integrations/supabase/types.ts` | Database types (gerado pelo Supabase CLI — **nunca editar à mão**) |

## 🚫 Anti-patterns

- ❌ Criar `types.ts` em sub-pasta de feature sem reexportar pelo barrel do módulo
- ❌ Importar de `src/integrations/supabase/types.ts` em components — usar o tipo do domínio
- ❌ Duplicar tipos como `Status` ou `Priority` em vários módulos — promover ao `src/shared/types`
- ❌ Re-exportar todos os tipos modulares de um único barrel central (mata tree-shaking)

## 🔄 Manutenção

Sempre que criar um novo módulo ou novo `types.ts`, atualizar este índice. A próxima auditoria deve reportar:
- Tipos órfãos (não importados em nenhum lugar)
- Duplicações entre módulos
- `types.ts` ausente do índice
