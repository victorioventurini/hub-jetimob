---
name: Internal OKR navigation
description: Padrão de URLs internas para navegar a entidades de OKRs — quando usar /go/ vs path direto + tabela de rotas canônicas
type: feature
---

# Navegação interna de OKRs

## Regra de ouro

- **Compartilhar / linkar de fora** (notificação, email, search global, copy-link, mention, QR) → `/go/:entity/:id` via `getShareableUrl()` do `src/lib/shareableLinks.ts`. Resolve BU automaticamente em `ResolveContextPage`.
- **Navegação interna em mesma BU** (cards, listas, dashboards) → pode ir direto ao destino canônico, MAS **o destino DEVE existir em `okrs.routes.tsx`**.
- Quando em dúvida (cross-BU, super_admin) → sempre `/go/`.

## Tabela de rotas canônicas (após bugfix 2026-04-25)

| Entity | Destino canônico (após resolver BU) |
|---|---|
| `okr_org_objective` | `/okrs/org-view/:id` |
| `okr_team_objective` | `/okrs?objective=:id` (dashboard com scroll/highlight no card) |
| `okr_org_kr` | `/okrs/org-view/:objective_id?kr=:id` |
| `okr_team_kr` | `/okrs?kr=:id` |
| `checkin` | `/okrs?checkin=:id` |

## Implementação atual (`OkrDashboardPage`)

`?objective=:id` faz scroll-into-view no `[data-objective-id="..."]` do `ObjectiveListItem`,
aplica highlight visual temporário (ring), depois limpa o param. Se o objetivo não está
visível com os filtros atuais, mostra toast informativo.

## Redirects legacy (em `okrs.routes.tsx`)

URLs antigas em emails/bookmarks são redirecionadas:
- `/okrs/team-objective/:id` → `/go/okr_team_objective/:id`
- `/okrs/team/:id` → `/go/okr_team_objective/:id`
- `/okrs/org/:id` → `/okrs/org-view/:id`

## Auditoria

Ao adicionar nova entrada em `ResolveContextPage.ENTITY_CONFIGS`, **verificar que a rota
de destino existe em `okrs.routes.tsx`** (ou no módulo equivalente). Bug histórico:
`okr_team_objective` apontava para `/okrs/team/:id` que nunca existiu — link 100% quebrado.
