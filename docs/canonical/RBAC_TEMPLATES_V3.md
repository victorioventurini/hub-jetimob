# RBAC Templates v3.0 - Modelo Reconstruído

Data: 2026-01-07

## Visão Geral

Sistema de permissões reconstruído com foco em:
- **Clareza conceitual**: separação entre base, responsabilidades e escopo
- **Segurança**: RLS + permission keys como fonte única de verdade
- **Simplicidade operacional**: poucos templates, bem definidos
- **Permissões somáveis**: usuário pode ter múltiplos "chapéus"
- **Liderança como escopo**: definida pela estrutura organizacional, não por templates

## Princípios

### 1. Três Conceitos Separados

| Conceito | Definição |
|----------|-----------|
| **Base de acesso** | Todo colaborador interno ou externo tem |
| **Responsabilidades** | Chapéus somáveis por módulo |
| **Escopo de atuação** | Definido pela hierarquia de times (`user_can_manage_team()`) |

### 2. Liderança NÃO é Template

- Líder de time/sub-time/squad é definido em `teams.leader_user_id` ou `squads.leader_user_id`
- O que o líder pode fazer depende:
  - Das permission keys que ele possui
  - Do escopo via `user_can_manage_team()`

### 3. Usuários Internos vs Externos

| Tipo | Template Base | Escopo |
|------|---------------|--------|
| Interno | `collaborator_base` | Todos os módulos (visualização) |
| Externo (parceiro) | `external_contact_base` | Apenas tickets onde participa |

---

## Templates Disponíveis

### CAMADA 0: BASE (OBRIGATÓRIA)

#### Colaborador Base (`collaborator_base`) - 11 keys
Aplicado a TODO usuário interno.

| Módulo | Permissões |
|--------|------------|
| home | dashboard.view |
| assets | general.view |
| okrs | general.view |
| kpis | general.view |
| projects | project.read, milestone.read |
| teams | team.view |
| tickets | view, thread.create, message.create, attachment.create |
| users | view, profile.view (self), profile.update (self) |

#### Contato Externo (`external_contact_base`) - 4 keys
Aplicado a contatos de empresas parceiras.

| Módulo | Permissões |
|--------|------------|
| home | dashboard.view |
| tickets | view, thread.read, message.create, attachment.create |

---

### CAMADA ADMINISTRATIVA

#### Administrador da BU (`bu_admin`) - 135 keys
Acesso total a todos os módulos e configurações da BU.

- Gerenciar permissões e usuários da BU
- Gerenciar settings de todos os módulos
- NÃO depende de liderança de time

---

### CAMADA DE RESPONSABILIDADES (SOMÁVEIS)

#### Tickets

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Tickets: Operador | `tickets_operator` | 8 | Criar, atualizar, atribuir tickets. Responder mensagens. |
| Tickets: Admin | `tickets_admin` | 23 | Tudo + categorias, parceiros, roteamento, visibilidade, settings |

#### OKRs

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| OKRs: Visualização | `okrs_viewer` | 6 | Leitura de OKRs, ciclos, iniciativas, check-ins |
| OKRs: Gestor de Time | `okrs_team_manager` | 9 | Criar/editar OKRs do time que lidera. SEM cancelar. |
| OKRs: Gestor da BU | `okrs_bu_manager` | 37 | Gestão completa incluindo cancelamento |

#### KPIs

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| KPIs: Visualização | `kpi_viewer` | 4 | Leitura de métricas e valores |
| KPIs: Editor | `kpi_editor` | 7 | Atualiza KPIs próprios e do time |
| KPIs: Admin | `kpi_admin` | 13 | Criar métricas, gerenciar settings, metas globais |

#### Inventário

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Inventário: Gestor | `inventory_manager` | 10 | Movimentar, emprestar, devolver. Ver dados sensíveis. |
| Inventário: Admin | `inventory_admin` | 16 | Tudo + cadastro, baixa, configurações |

#### Chaves

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Chaves: Gestor | `keys_manager` | 7 | Retirar/devolver chaveiros. Movimentações. Dados sensíveis. |
| Chaves: Admin | `keys_admin` | 16 | Tudo + claviculários, ganchos, configurações |

#### Brindes

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Brindes: Gestor | `gifts_manager` | 5 | Movimentações, ajustes, visualizar estoque |
| Brindes: Admin | `gifts_admin` | 11 | Tudo + cadastro, lotes, configurações |

#### Projetos

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Projetos: Gestor | `projects_manager` | 7 | Criar/editar projetos e milestones. Sem exclusão. |
| Projetos: Admin | `projects_admin` | 8 | Tudo + exclusão de projetos |

#### Avaliações (Assessments)

| Template | Nome | Keys | Descrição |
|----------|------|------|-----------|
| `assessments_view_v2` | Avaliações: Visualização v2 | 5 | Visualiza provas, formulários, convites, execuções e temas |
| `assessments_operate_v2` | Avaliações: Operador v2 | 12 | Cria/edita provas, formulários, convites — sem exclusão e sem catálogos |
| `assessments_admin_v2` | Avaliações: Admin v2 | 17 | Tudo + excluir, publicar, gerenciar temas, **categorias** e settings da BU |

> A permission key `assessments.category.manage:bu` controla CRUD de `assessment_categories` e `assessment_subcategories`. Está incluída em **Avaliações: Admin v2** e **Administrador BU v2** — não é concedida ao Operador.

---

## Regras de Ouro

| Regra | Status |
|-------|--------|
| Colaborador pode criar ticket interno | ✅ SIM (via `collaborator_base`) |
| Cancelar OKRs | Apenas `okrs_bu_manager`, BU Admin, Super Admin |
| Assets sensíveis (serial/nota) | Admin e Manager podem ver |
| Líder editar time pai | ❌ NÃO (escopo impede) |
| Permissões somam | ✅ SIM (union de templates) |

---

## Exemplo de Atribuição

### Usuário: Líder de Vendas

```
Templates atribuídos:
- collaborator_base (automático)
- okrs_team_manager
- kpi_editor

Liderança:
- teams.leader_user_id = <id do usuário>

Resultado:
- Visualiza todos os módulos
- Cria/edita OKRs do time de vendas (via user_can_manage_team)
- Atualiza KPIs do seu time
- Cria tickets internos
```

### Usuário: Operador de Inventário

```
Templates atribuídos:
- collaborator_base (automático)
- inventory_manager

Resultado:
- Visualiza todos os módulos
- Movimenta itens de inventário
- Vê dados sensíveis (serial, nota fiscal)
- NÃO pode cadastrar novos itens
- NÃO pode dar baixa
```

### Contato Parceiro: Representante Imobiliária

```
Templates atribuídos:
- external_contact_base

Resultado:
- Acessa apenas tickets onde participa
- Pode enviar mensagens e anexos
- NÃO acessa outros módulos
```

---

## Migração Realizada

- [x] Removidos todos os templates antigos (22 grupos)
- [x] Removidas todas as associações antigas (435 links)
- [x] Removidos vínculos de usuários (1 vínculo)
- [x] Criados 19 novos templates (incluindo projects_manager e projects_admin)
- [x] Associadas permission keys aos templates

---

## Próximos Passos

1. [ ] Aplicar `collaborator_base` a todos usuários internos existentes
2. [ ] Aplicar `external_contact_base` a usuários externos (quando existirem)
3. [ ] Atribuir templates de responsabilidade conforme função
4. [ ] Validar QA com cenários do checklist

---

## 🔄 Auto-Generated Reference (do banco)

<!-- @generated:rbac-templates:start -->

<!-- Gerado automaticamente por scripts/generate-rbac-templates.ts — NÃO EDITAR -->
> **Gerado em:** 2026-05-16T21:56:28.628Z
> **Total:** 35 templates ativos

### Sumário

| Slug | Nome | Módulo | Surface | System | # Keys |
|------|------|--------|---------|--------|--------|
| `assessments_admin_v2` | Avaliações: Admin v2 | — | — | ✅ | 17 |
| `assessments_operate_v2` | Avaliações: Operador v2 | — | — | ✅ | 12 |
| `assessments_view_v2` | Avaliações: Visualização v2 | — | — | ✅ | 5 |
| `bu_admin_v2` | Administrador BU v2 | — | administer | ✅ | 32 |
| `collaborator_base_v2` | Colaborador Base v2 | — | base | ✅ | 14 |
| `gifts_admin_v2` | Brindes: Admin v2 | assets | administer | ✅ | 11 |
| `gifts_operate_v2` | Brindes: Operador v2 | assets | operate | ✅ | 5 |
| `gifts_view_v2` | Brindes: Visualização v2 | assets | view | ✅ | 3 |
| `inventory_admin_v2` | Inventário: Admin v2 | assets | administer | ✅ | 16 |
| `inventory_operate_v2` | Inventário: Operador v2 | assets | operate | ✅ | 6 |
| `inventory_view_v2` | Inventário: Visualização v2 | assets | view | ✅ | 3 |
| `keys_admin_v2` | Chaves: Admin v2 | assets | administer | ✅ | 16 |
| `keys_operate_v2` | Chaves: Operador v2 | assets | operate | ✅ | 7 |
| `keys_view_v2` | Chaves: Visualização v2 | assets | view | ✅ | 3 |
| `phone_lines_admin_v2` | Linhas: Admin v2 | assets | administer | ✅ | 9 |
| `phone_lines_operate_v2` | Linhas: Operador v2 | assets | operate | ✅ | 5 |
| `phone_lines_view_v2` | Linhas: Visualização v2 | assets | view | ✅ | 3 |
| `kpis_admin_v2` | KPIs: Admin v2 | kpis | administer | ✅ | 13 |
| `kpis_operate_v2` | KPIs: Operador v2 | kpis | operate | ✅ | 7 |
| `kpis_view_v2` | KPIs: Visualização v2 | kpis | view | ✅ | 3 |
| `okrs_admin_v2` | OKRs: Admin v2 | okrs | administer | ✅ | 31 |
| `okrs_operate_v2` | OKRs: Operador v2 | okrs | operate | ✅ | 17 |
| `okrs_view_v2` | OKRs: Visualização v2 | okrs | view | ✅ | 8 |
| `projects_admin` | Projetos: Admin | projects | administer | ❌ | 8 |
| `projects_manager` | Projetos: Gestor | projects | operate | ❌ | 7 |
| `teams_admin_v2` | Times: Admin v2 | teams | administer | ✅ | 10 |
| `teams_operate_v2` | Times: Operador v2 | teams | operate | ✅ | 3 |
| `teams_view_v2` | Times: Visualização v2 | teams | view | ✅ | 3 |
| `external_contact_v2` | Contato Externo v2 | tickets | restricted | ✅ | 4 |
| `tickets_admin_v2` | Tickets: Admin v2 | tickets | administer | ✅ | 23 |
| `tickets_operate_v2` | Tickets: Operador v2 | tickets | operate | ✅ | 8 |
| `tickets_view_v2` | Tickets: Visualização v2 | tickets | view | ✅ | 3 |
| `users_admin_v2` | Usuários: Admin v2 | users | administer | ✅ | 9 |
| `users_operate_v2` | Usuários: Operador v2 | users | operate | ✅ | 2 |
| `users_view_v2` | Usuários: Visualização v2 | users | view | ✅ | 1 |

### Detalhamento por Template

#### `assessments_admin_v2` — Avaliações: Admin v2

- `assessments.assessment.create:bu`
- `assessments.assessment.delete:bu`
- `assessments.assessment.update:bu`
- `assessments.assessment.view:bu`
- `assessments.category.manage:bu`
- `assessments.form.create:bu`
- `assessments.form.delete:bu`
- `assessments.form.publish:bu`
- `assessments.form.update:bu`
- `assessments.form.view:bu`
- `assessments.invite.create:bu`
- `assessments.invite.revoke:bu`
- `assessments.invite.view:bu`
- `assessments.run.view:bu`
- `assessments.settings.manage:bu`
- `assessments.theme.manage:bu`
- `assessments.theme.view:bu`

#### `assessments_operate_v2` — Avaliações: Operador v2

- `assessments.assessment.create:bu`
- `assessments.assessment.update:bu`
- `assessments.assessment.view:bu`
- `assessments.form.create:bu`
- `assessments.form.publish:bu`
- `assessments.form.update:bu`
- `assessments.form.view:bu`
- `assessments.invite.create:bu`
- `assessments.invite.revoke:bu`
- `assessments.invite.view:bu`
- `assessments.run.view:bu`
- `assessments.theme.view:bu`

#### `assessments_view_v2` — Avaliações: Visualização v2

- `assessments.assessment.view:bu`
- `assessments.form.view:bu`
- `assessments.invite.view:bu`
- `assessments.run.view:bu`
- `assessments.theme.view:bu`

#### `bu_admin_v2` — Administrador BU v2

- `assessments.assessment.create:bu`
- `assessments.assessment.delete:bu`
- `assessments.assessment.update:bu`
- `assessments.assessment.view:bu`
- `assessments.category.manage:bu`
- `assessments.form.create:bu`
- `assessments.form.delete:bu`
- `assessments.form.publish:bu`
- `assessments.form.update:bu`
- `assessments.form.view:bu`
- `assessments.invite.create:bu`
- `assessments.invite.revoke:bu`
- `assessments.invite.view:bu`
- `assessments.run.view:bu`
- `assessments.settings.manage:bu`
- `assessments.theme.manage:bu`
- `assessments.theme.view:bu`
- `notifications.bu.manage:bu`
- `notifications.bu.view:bu`
- `notifications.health.ack:bu`
- `notifications.health.admin:bu`
- `notifications.health.read:bu`
- `notifications.outbox.retry:bu`
- `notifications.outbox.view:bu`
- `notifications.slo.admin:bu`
- `notifications.slo.read:bu`
- `notifications.templates.activate:bu`
- `notifications.templates.edit:bu`
- `notifications.templates.read:bu`
- `notifications.templates.rollback:bu`
- `notifications.test.send:bu`
- `notifications.user.manage:self`

#### `collaborator_base_v2` — Colaborador Base v2

- `assets.view:bu`
- `bu.location.view:bu`
- `bu.settings.view:bu`
- `home.view:bu`
- `kpis.view:bu`
- `notifications.user.manage:self`
- `okrs.initiative.update:self_or_owner`
- `okrs.view:bu`
- `projects.milestone.read:bu`
- `projects.project.read:bu`
- `teams.view:bu`
- `tickets.ticket.view:bu`
- `users.list.view:bu`
- `users.profile.view:bu`

#### `gifts_admin_v2` — Brindes: Admin v2

- `assets.gifts.adjustment.create:bu`
- `assets.gifts.batch.manage:bu`
- `assets.gifts.create:bu`
- `assets.gifts.delete:bu`
- `assets.gifts.item.manage:bu`
- `assets.gifts.movement.create:bu`
- `assets.gifts.read:bu`
- `assets.gifts.settings.manage:bu`
- `assets.gifts.update:bu`
- `assets.gifts.view:bu`
- `assets.view:bu`

#### `gifts_operate_v2` — Brindes: Operador v2

- `assets.gifts.adjustment.create:bu`
- `assets.gifts.movement.create:bu`
- `assets.gifts.read:bu`
- `assets.gifts.view:bu`
- `assets.view:bu`

#### `gifts_view_v2` — Brindes: Visualização v2

- `assets.gifts.read:bu`
- `assets.gifts.view:bu`
- `assets.view:bu`

#### `inventory_admin_v2` — Inventário: Admin v2

- `assets.categories.manage:bu`
- `assets.inventory.checkout:bu`
- `assets.inventory.create:bu`
- `assets.inventory.delete:bu`
- `assets.inventory.maintenance:bu`
- `assets.inventory.movement.create:bu`
- `assets.inventory.movement.update:bu`
- `assets.inventory.read:bu`
- `assets.inventory.return:bu`
- `assets.inventory.sensitive.view:bu`
- `assets.inventory.transfer:bu`
- `assets.inventory.update:bu`
- `assets.inventory.view:bu`
- `assets.inventory.write_off:bu`
- `assets.settings.manage`
- `assets.view:bu`

#### `inventory_operate_v2` — Inventário: Operador v2

- `assets.inventory.checkout:bu`
- `assets.inventory.movement.create:bu`
- `assets.inventory.read:bu`
- `assets.inventory.return:bu`
- `assets.inventory.view:bu`
- `assets.view:bu`

#### `inventory_view_v2` — Inventário: Visualização v2

- `assets.inventory.read:bu`
- `assets.inventory.view:bu`
- `assets.view:bu`

#### `keys_admin_v2` — Chaves: Admin v2

- `assets.keys.checkout:bu`
- `assets.keys.claviculary.manage:bu`
- `assets.keys.create:bu`
- `assets.keys.delete:bu`
- `assets.keys.hook_override:bu`
- `assets.keys.hooks.manage:bu`
- `assets.keys.key.manage:bu`
- `assets.keys.keyring.checkout:bu`
- `assets.keys.keyring.manage:bu`
- `assets.keys.keyring.return:bu`
- `assets.keys.movement.create:bu`
- `assets.keys.read:bu`
- `assets.keys.sensitive.view:bu`
- `assets.keys.update:bu`
- `assets.keys.view:bu`
- `assets.view:bu`

#### `keys_operate_v2` — Chaves: Operador v2

- `assets.keys.checkout:bu`
- `assets.keys.keyring.checkout:bu`
- `assets.keys.keyring.return:bu`
- `assets.keys.movement.create:bu`
- `assets.keys.read:bu`
- `assets.keys.view:bu`
- `assets.view:bu`

#### `keys_view_v2` — Chaves: Visualização v2

- `assets.keys.read:bu`
- `assets.keys.view:bu`
- `assets.view:bu`

#### `phone_lines_admin_v2` — Linhas: Admin v2

- `assets.phone_lines.create:bu`
- `assets.phone_lines.delete:bu`
- `assets.phone_lines.link_asset:bu`
- `assets.phone_lines.loan:bu`
- `assets.phone_lines.read:bu`
- `assets.phone_lines.return:bu`
- `assets.phone_lines.update:bu`
- `assets.phone_lines.view:bu`
- `assets.view:bu`

#### `phone_lines_operate_v2` — Linhas: Operador v2

- `assets.phone_lines.loan:bu`
- `assets.phone_lines.read:bu`
- `assets.phone_lines.return:bu`
- `assets.phone_lines.view:bu`
- `assets.view:bu`

#### `phone_lines_view_v2` — Linhas: Visualização v2

- `assets.phone_lines.read:bu`
- `assets.phone_lines.view:bu`
- `assets.view:bu`

#### `kpis_admin_v2` — KPIs: Admin v2

- `kpis.metric.create:bu`
- `kpis.metric.delete:bu`
- `kpis.metric.disable:bu`
- `kpis.metric.read:bu`
- `kpis.metric.update_scoped:team`
- `kpis.metric.update:self_or_owner`
- `kpis.metric.view:bu`
- `kpis.settings.manage:bu`
- `kpis.value.add:bu`
- `kpis.value.create:bu`
- `kpis.value.read:bu`
- `kpis.value.update_own:bu`
- `kpis.view:bu`

#### `kpis_operate_v2` — KPIs: Operador v2

- `kpis.metric.update:self_or_owner`
- `kpis.metric.view:bu`
- `kpis.value.add:bu`
- `kpis.value.create:bu`
- `kpis.value.read:bu`
- `kpis.value.update_own:bu`
- `kpis.view:bu`

#### `kpis_view_v2` — KPIs: Visualização v2

- `kpis.metric.view:bu`
- `kpis.value.read:bu`
- `kpis.view:bu`

#### `okrs_admin_v2` — OKRs: Admin v2

- `okrs.checkin.create:bu`
- `okrs.checkin.delete:bu`
- `okrs.checkin.read:bu`
- `okrs.checkin.update:bu`
- `okrs.cycle.create:bu`
- `okrs.cycle.delete:bu`
- `okrs.cycle.read:bu`
- `okrs.cycle.update:bu`
- `okrs.initiative.create:bu`
- `okrs.initiative.delete:bu`
- `okrs.initiative.read:bu`
- `okrs.initiative.update:bu`
- `okrs.links.manage:bu`
- `okrs.org_kr.create:bu`
- `okrs.org_kr.delete:bu`
- `okrs.org_kr.read:bu`
- `okrs.org_kr.update:bu`
- `okrs.org_objective.create:bu`
- `okrs.org_objective.delete:bu`
- `okrs.org_objective.read:bu`
- `okrs.org_objective.update:bu`
- `okrs.settings.manage:bu`
- `okrs.team_kr.create:bu`
- `okrs.team_kr.delete:bu`
- `okrs.team_kr.read:bu`
- `okrs.team_kr.update:bu`
- `okrs.team_objective.create:bu`
- `okrs.team_objective.delete:bu`
- `okrs.team_objective.read:bu`
- `okrs.team_objective.update:bu`
- `okrs.view:bu`

#### `okrs_operate_v2` — OKRs: Operador v2

- `okrs.checkin.create:self`
- `okrs.checkin.create:self_or_owner`
- `okrs.checkin.read:bu`
- `okrs.cycle.read:bu`
- `okrs.initiative.create:team`
- `okrs.initiative.read:bu`
- `okrs.initiative.update:self_or_owner`
- `okrs.links.manage:bu`
- `okrs.org_kr.read:bu`
- `okrs.org_objective.read:bu`
- `okrs.team_kr.create:team`
- `okrs.team_kr.read:team_tree`
- `okrs.team_kr.update:self_or_owner`
- `okrs.team_objective.create:team`
- `okrs.team_objective.read:team_tree`
- `okrs.team_objective.update:self_or_owner`
- `okrs.view:bu`

#### `okrs_view_v2` — OKRs: Visualização v2

- `okrs.checkin.read:bu`
- `okrs.cycle.read:bu`
- `okrs.initiative.read:bu`
- `okrs.org_kr.read:bu`
- `okrs.org_objective.read:bu`
- `okrs.team_kr.read:team_tree`
- `okrs.team_objective.read:team_tree`
- `okrs.view:bu`

#### `projects_admin` — Projetos: Admin

- `projects.milestone.create:bu`
- `projects.milestone.read:bu`
- `projects.milestone.update:bu`
- `projects.project.create:bu`
- `projects.project.delete:self_or_owner`
- `projects.project.read:bu`
- `projects.project.update:bu`
- `projects.project.update:self_or_owner`

#### `projects_manager` — Projetos: Gestor

- `projects.milestone.create:bu`
- `projects.milestone.read:bu`
- `projects.milestone.update:bu`
- `projects.project.create:bu`
- `projects.project.read:bu`
- `projects.project.update:bu`
- `projects.project.update:self_or_owner`

#### `teams_admin_v2` — Times: Admin v2

- `teams.manage:bu`
- `teams.squad.create:bu`
- `teams.squad.delete:bu`
- `teams.squad.read:bu`
- `teams.squad.update:bu`
- `teams.team.create:bu`
- `teams.team.delete:bu`
- `teams.team.read:bu`
- `teams.team.update:bu`
- `teams.view:bu`

#### `teams_operate_v2` — Times: Operador v2

- `teams.squad.read:bu`
- `teams.team.read:bu`
- `teams.view:bu`

#### `teams_view_v2` — Times: Visualização v2

- `teams.squad.read:bu`
- `teams.team.read:bu`
- `teams.view:bu`

#### `external_contact_v2` — Contato Externo v2

- `tickets.attachment.create:bu`
- `tickets.message.create:bu`
- `tickets.thread.read:bu`
- `users.profile.update:self`

#### `tickets_admin_v2` — Tickets: Admin v2

- `tickets.attachment.create:bu`
- `tickets.categories.manage:bu`
- `tickets.contact_capabilities.manage`
- `tickets.contact_capabilities.view`
- `tickets.message.create:bu`
- `tickets.partner_contacts.manage`
- `tickets.partner_contacts.view`
- `tickets.partners.manage:bu`
- `tickets.routing.manage`
- `tickets.routing.manage:bu`
- `tickets.routing.view`
- `tickets.settings.manage`
- `tickets.settings.manage:bu`
- `tickets.settings.view`
- `tickets.thread.create:bu`
- `tickets.thread.read:bu`
- `tickets.thread.update:self_or_owner`
- `tickets.ticket.assign:bu`
- `tickets.ticket.create_external:bu`
- `tickets.ticket.create_internal:bu`
- `tickets.ticket.update_status:bu`
- `tickets.ticket.view:bu`
- `tickets.visibility.override:bu`

#### `tickets_operate_v2` — Tickets: Operador v2

- `tickets.attachment.create:bu`
- `tickets.message.create:bu`
- `tickets.thread.create:bu`
- `tickets.thread.read:bu`
- `tickets.ticket.assign:bu`
- `tickets.ticket.create_internal:bu`
- `tickets.ticket.update_status:bu`
- `tickets.ticket.view:bu`

#### `tickets_view_v2` — Tickets: Visualização v2

- `tickets.attachment.create:bu`
- `tickets.thread.read:bu`
- `tickets.ticket.view:bu`

#### `users_admin_v2` — Usuários: Admin v2

- `people.membership.manage:bu`
- `people.membership.view:bu`
- `users.list.view:bu`
- `users.profile.create`
- `users.profile.delete`
- `users.profile.manage:bu`
- `users.profile.read:bu`
- `users.profile.update:self`
- `users.profile.view:bu`

#### `users_operate_v2` — Usuários: Operador v2

- `users.profile.update:self`
- `users.profile.view:bu`

#### `users_view_v2` — Usuários: Visualização v2

- `users.list.view:bu`

<!-- @generated:rbac-templates:end -->
