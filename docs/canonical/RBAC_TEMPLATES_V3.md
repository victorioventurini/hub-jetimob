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
