---
name: External User Tickets Module Access
description: Partner contacts (userRole='external') ganham acesso ao módulo Tickets em qualquer BU sem template V2; RLS scoping é a defesa de conteúdo.
type: feature
---

## Regra

Em `src/hooks/useModuleAccess.ts`, usuários com `userRole === "external"` (vindo de `bu_user_memberships` com role='external' OU de `partner_contact_bu_associations`) recebem acesso automático ao módulo `tickets` — sem precisar de `permission_templates_v2` atribuído.

## Por quê

Partner contacts não recebem template V2 nas BUs em que são habilitados via `partner_contact_bu_associations`. Sem essa exceção, o link direto `/tickets/:id` cai em "Acesso não autorizado" mesmo quando o externo é o responsável/assignee/contato da empresa no ticket.

## Defesa em profundidade

A liberação do módulo NÃO afrouxa segurança porque:
1. RLS `can_view_ticket` filtra linha-a-linha.
2. Filtro frontend `.eq('bu_id', currentBuId)` impede leitura cross-BU.
3. `ModuleRoute` ainda checa `isModuleEnabled('tickets')` na BU.
4. Demais módulos (OKRs, KPIs, Assets, Teams, Projects, Events, Users, Settings) seguem bloqueados para externos.

## Não estender sem revisar

Não adicionar outros slugs em `EXTERNAL_ACCESSIBLE_MODULES` sem garantir que o módulo tem RLS robusta para externos (ex.: `can_view_ticket` equivalente).
