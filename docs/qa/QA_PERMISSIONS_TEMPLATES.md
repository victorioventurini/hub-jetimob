# QA Checklist: Permissões e Templates v3.0

## Visão Geral

Sistema de permissões baseado em permission keys com templates somáveis (RBAC v3.0).

## Modelo de Templates

### Camada 0: Base
- `collaborator_base` - Todo usuário interno
- `external_contact_base` - Contatos de parceiros

### Camada Administrativa
- `bu_admin` - Admin da Business Unit

### Camada de Responsabilidades (Somáveis)
- Tickets: `tickets_operator`, `tickets_admin`
- OKRs: `okrs_viewer`, `okrs_team_manager`, `okrs_bu_manager`
- KPIs: `kpi_viewer`, `kpi_editor`, `kpi_admin`
- Inventário: `inventory_manager`, `inventory_admin`
- Chaves: `keys_manager`, `keys_admin`
- Brindes: `gifts_manager`, `gifts_admin`

---

## Cenários de Teste

### 1. Colaborador Base (`collaborator_base`)
- [ ] Pode visualizar home, assets, okrs, kpis, teams, users
- [ ] Pode criar ticket interno
- [ ] Pode enviar mensagens/anexos em tickets
- [ ] Pode ver e editar próprio perfil
- [ ] **NÃO** pode criar ticket externo
- [ ] **NÃO** pode gerenciar configurações

### 2. Contato Externo (`external_contact_base`)
- [ ] Pode ver tickets onde participa
- [ ] Pode enviar mensagens e anexos
- [ ] **NÃO** pode ver outros módulos
- [ ] **NÃO** pode criar tickets

### 3. Tickets Operador (`tickets_operator`)
- [ ] Pode criar tickets internos e externos
- [ ] Pode atribuir tickets
- [ ] Pode atualizar status
- [ ] **NÃO** pode gerenciar categorias/parceiros
- [ ] **NÃO** pode alterar roteamento

### 4. Tickets Admin (`tickets_admin`)
- [ ] Tudo do Operador +
- [ ] Pode gerenciar categorias
- [ ] Pode gerenciar parceiros
- [ ] Pode configurar roteamento
- [ ] Pode alterar visibilidade

### 5. OKRs Viewer (`okrs_viewer`)
- [ ] Pode ler OKRs, ciclos, iniciativas, check-ins
- [ ] **NÃO** pode criar/editar OKRs
- [ ] **NÃO** pode cancelar OKRs

### 6. OKRs Gestor de Time (`okrs_team_manager`)
- [ ] Pode criar/editar OKRs do time que lidera
- [ ] `user_can_manage_team()` funciona corretamente
- [ ] **NÃO** pode cancelar OKRs
- [ ] **NÃO** pode editar OKRs de times que não gerencia

### 7. OKRs Gestor da BU (`okrs_bu_manager`)
- [ ] Pode criar/editar qualquer OKR da BU
- [ ] Pode cancelar OKRs
- [ ] Pode gerenciar insights e configurações

### 8. KPI Editor (`kpi_editor`)
- [ ] Pode adicionar valores a KPIs
- [ ] Pode atualizar KPIs do seu escopo (time)
- [ ] **NÃO** pode criar métricas
- [ ] **NÃO** pode gerenciar settings

### 9. Inventory Manager (`inventory_manager`)
- [ ] Pode movimentar assets (checkout/return/transfer)
- [ ] Pode registrar manutenção
- [ ] Pode ver dados sensíveis (serial, nota fiscal)
- [ ] **NÃO** pode criar novos itens
- [ ] **NÃO** pode dar baixa

### 10. Keys Manager (`keys_manager`)
- [ ] Pode retirar/devolver chaveiros
- [ ] Pode registrar movimentações
- [ ] Pode ver dados sensíveis
- [ ] **NÃO** pode gerenciar claviculários

### 11. BU Admin (`bu_admin`)
- [ ] Acessa /hub/permissions
- [ ] Pode atribuir templates a usuários da BU
- [ ] Pode habilitar/desabilitar grupos na BU
- [ ] Acesso total a todos os módulos

### 12. Super Admin (role = super_admin)
- [ ] Acessa /settings/permissions (catálogo global)
- [ ] Pode criar/editar templates globais
- [ ] Pode promover/rebaixar admin de BU
- [ ] Wildcard (*) funciona corretamente

---

## Regras de Negócio Críticas

- [ ] Templates são somáveis (union de permissões)
- [ ] Usuário pode ter múltiplos templates
- [ ] Líder NÃO é um template, é definido por `teams.leader_user_id`
- [ ] Escopo de líder respeitado via `user_can_manage_team()`
- [ ] RLS bloqueia acesso cross-BU
- [ ] Admin só pode ser promovido/rebaixado por super_admin

---

## Templates Disponíveis

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Colaborador Base | collaborator_base | 9 | Acesso básico obrigatório |
| Contato Externo | external_contact_base | 4 | Parceiros - apenas tickets |
| Administrador da BU | bu_admin | 135 | Acesso total à BU |
| Tickets: Operador | tickets_operator | 8 | Operação de tickets |
| Tickets: Admin | tickets_admin | 23 | Gestão de tickets |
| OKRs: Visualização | okrs_viewer | 6 | Leitura de OKRs |
| OKRs: Gestor de Time | okrs_team_manager | 9 | Gestão de OKRs do time |
| OKRs: Gestor da BU | okrs_bu_manager | 37 | Gestão completa de OKRs |
| KPIs: Visualização | kpi_viewer | 4 | Leitura de KPIs |
| KPIs: Editor | kpi_editor | 7 | Edição de valores |
| KPIs: Admin | kpi_admin | 13 | Gestão de KPIs |
| Inventário: Gestor | inventory_manager | 10 | Operação de inventário |
| Inventário: Admin | inventory_admin | 16 | Gestão de inventário |
| Chaves: Gestor | keys_manager | 7 | Operação de chaves |
| Chaves: Admin | keys_admin | 16 | Gestão de chaves |
| Brindes: Gestor | gifts_manager | 5 | Operação de brindes |
| Brindes: Admin | gifts_admin | 11 | Gestão de brindes |

---

## Comando de Auditoria

```bash
npx tsx scripts/audit-permission-keys.ts
```

Verificar: zero keys faltando no catálogo.
