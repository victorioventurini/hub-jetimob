# QA Checklist: Permissões e Templates

## Visão Geral

Sistema de permissões baseado em permission keys com templates somáveis (TCR v2.4.0).

## Cenários de Teste

### 1. Colaborador Base
- [ ] Pode visualizar home, usuários, times, OKRs, KPIs
- [ ] Pode criar ticket interno
- [ ] Pode adicionar mensagens/anexos em tickets
- [ ] Pode visualizar assets
- [ ] **NÃO** pode criar ticket externo
- [ ] **NÃO** pode gerenciar configurações

### 2. Inventory Manager
- [ ] Pode movimentar assets (checkout/return/transfer)
- [ ] Pode registrar manutenção
- [ ] Pode ver dados sensíveis (serial, nota fiscal)
- [ ] **NÃO** pode criar novos itens de inventário
- [ ] **NÃO** pode dar baixa em itens

### 3. Keys Manager
- [ ] Pode retirar/devolver chaveiros
- [ ] Pode registrar movimentações de chaves
- [ ] Pode ver dados sensíveis de chaves
- [ ] **NÃO** pode gerenciar claviculários

### 4. OKRs Manager
- [ ] Pode criar/editar objetivos organizacionais
- [ ] Pode cancelar OKRs do próprio time
- [ ] **NÃO** pode cancelar OKRs de times que não gerencia
- [ ] user_can_manage_team funciona corretamente

### 5. BU Admin
- [ ] Acessa /hub/permissions ✅
- [ ] **NÃO** acessa /settings/permissions (somente super_admin)
- [ ] Pode atribuir templates a usuários da BU
- [ ] Pode habilitar/desabilitar grupos na BU

### 6. Super Admin
- [ ] Acessa /settings/permissions (catálogo global)
- [ ] Pode criar/editar templates globais
- [ ] Pode promover/rebaixar admin de BU
- [ ] Wildcard (*) funciona corretamente

### 7. Regras de Negócio
- [ ] Templates são somáveis (union de permissões)
- [ ] Usuário pode ter múltiplos templates
- [ ] Admin só pode ser promovido/rebaixado por super_admin
- [ ] RLS bloqueia acesso cross-BU
- [ ] BU scope enforcement funciona

## Comando de Auditoria

```bash
npx tsx scripts/audit-permission-keys.ts
```

Verificar: zero keys faltando no catálogo.

## Templates Disponíveis

| Template | Slug | Descrição |
|----------|------|-----------|
| Colaborador (Base) | collaborator_base | Acesso básico |
| Estagiário | intern | Acesso limitado |
| Visitor (Read-only) | viewer_readonly | Somente leitura |
| OKRs Manager | okrs_manager | Gestão de OKRs |
| KPI Editor | kpi_editor | Edição de KPIs |
| KPI Admin | kpi_admin | Admin de KPIs |
| Tickets Operator | tickets_operator | Operação de tickets |
| Tickets Admin | tickets_admin | Admin de tickets |
| Inventory Manager | inventory_manager | Gestão de inventário |
| Inventory Admin | inventory_admin | Admin de inventário |
| Keys Manager | keys_manager | Gestão de chaves |
| Keys Admin | keys_admin | Admin de chaves |
| Gifts Manager | gifts_manager | Gestão de brindes |
| Gifts Admin | gifts_admin | Admin de brindes |
| BU Admin | bu_admin | Admin da BU |
