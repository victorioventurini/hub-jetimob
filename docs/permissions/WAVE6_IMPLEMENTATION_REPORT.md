# Wave 6 — Implementation Report

**Data:** 2026-01-08  
**Versão:** 1.0.0  
**Status:** ✅ IMPLEMENTADO

---

## Resumo Executivo

Wave 6 implementa a simplificação do sistema de permissões do Hub da Jet, introduzindo:

1. **Aliases de Permission Keys** - Compatibilidade retroativa durante migração
2. **Templates v2** - Organizados por módulo e surface (VIEW/OPERATE/ADMINISTER)
3. **Atribuições v2 por BU** - Múltiplos templates somáveis por usuário
4. **Preview de Permissões** - Visualização de diff antes de migrar

---

## 1. Migrations / Tabelas Criadas

### 1.1 permission_key_aliases
```sql
CREATE TABLE public.permission_key_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_key text NOT NULL UNIQUE,
  new_key text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
```

### 1.2 permission_templates_v2
```sql
CREATE TABLE public.permission_templates_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  surface text, -- 'view' | 'operate' | 'administer' | 'base' | 'restricted'
  module text,
  is_system boolean DEFAULT true,
  version int DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.3 permission_template_items_v2
```sql
CREATE TABLE public.permission_template_items_v2 (
  template_id uuid REFERENCES permission_templates_v2(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (template_id, permission_key)
);
```

### 1.4 bu_user_permission_templates_v2
```sql
CREATE TABLE public.bu_user_permission_templates_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES bu_units(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  template_id uuid NOT NULL REFERENCES permission_templates_v2(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(bu_id, user_id, template_id)
);
```

---

## 2. Aliases Inseridos

| old_key | new_key |
|---------|---------|
| okrs.read | okrs.view:bu |
| okrs.write | okrs.edit:bu |
| kpis.read | kpis.view:bu |
| kpis.write | kpis.edit:bu |
| assets.read | assets.view:bu |
| assets.write | assets.edit:bu |
| tickets.read | tickets.view:bu |
| tickets.write | tickets.edit:bu |
| users.read | users.view:bu |
| users.write | users.edit:bu |
| teams.read | teams.view:bu |
| teams.write | teams.edit:bu |
| settings.read | settings.view:bu |
| settings.write | settings.edit:bu |
| hub.read | hub.view:bu |

**Total: 15 aliases**

---

## 3. Templates v2 Criados

### 3.1 Por Módulo e Surface

| Módulo | VIEW | OPERATE | ADMINISTER |
|--------|------|---------|------------|
| OKRs | okrs_view_v2 | okrs_operate_v2 | okrs_admin_v2 |
| KPIs | kpis_view_v2 | kpis_operate_v2 | kpis_admin_v2 |
| Tickets | tickets_view_v2 | tickets_operate_v2 | tickets_admin_v2 |
| Assets | assets_view_v2 | assets_operate_v2 | assets_admin_v2 |
| Assets Keys | keys_view_v2 | keys_operate_v2 | keys_admin_v2 |
| Assets Gifts | gifts_view_v2 | gifts_operate_v2 | gifts_admin_v2 |
| Teams | teams_view_v2 | teams_operate_v2 | teams_admin_v2 |
| Users | users_view_v2 | users_operate_v2 | users_admin_v2 |
| Hub | hub_view_v2 | hub_operate_v2 | hub_admin_v2 |

### 3.2 Templates Base
- collaborator_base_v2
- external_contact_base_v2
- bu_admin_v2

**Total: 27 templates v2**

---

## 4. RPCs e Funções Atualizadas

### 4.1 resolve_permission_key(p_key text)
Resolve alias para key canônica.

### 4.2 has_permission(...) - Atualizado
Agora resolve aliases antes de verificar permissões.

### 4.3 get_my_permissions(p_bu_id uuid)
Retorna keys canônicas, resolvendo aliases.

### 4.4 get_effective_permissions_preview(p_bu_id, p_user_id, p_mode)
Nova RPC para preview de permissões efetivas.
- mode: 'v1' | 'v2' | 'both'

---

## 5. Telas UI Alteradas

| Path | Alterações |
|------|------------|
| /settings/permissions | Novas tabs: templates-v2, surfaces, aliases |
| /settings/permissions?tab=catalog | Catálogo existente (sem alteração) |
| /settings/permissions?tab=templates | Templates v1 (marcado como legado) |
| /settings/permissions?tab=templates-v2 | **NOVO** - Templates v2 por módulo/surface |
| /settings/permissions?tab=surfaces | **NOVO** - Visualização de surfaces |
| /settings/permissions?tab=aliases | **NOVO** - Gerenciamento de aliases |
| /hub/permissions | Sheet v2 com tabs v1/v2/preview |
| /hub/permissions?q=... | Busca por usuário |

---

## 6. Componentes Criados

| Componente | Descrição |
|------------|-----------|
| AliasesTab.tsx | Tab de gerenciamento de aliases |
| SurfacesTab.tsx | Tab de visualização de surfaces por módulo |
| TemplatesV2Tab.tsx | Tab de listagem de templates v2 |
| UserPermissionsV2Sheet.tsx | Sheet de atribuição v2 com preview |

---

## 7. Hooks Criados

| Hook | Descrição |
|------|-----------|
| usePermissionAliases | CRUD de aliases |
| usePermissionTemplatesV2 | Lista e gerencia templates v2 |
| useTemplateItemsV2 | Permission keys de um template |
| useUserTemplatesV2 | Atribuições v2 de um usuário na BU |
| useEffectivePermissionsPreview | Preview de permissões efetivas |

---

## 8. Resultados dos Audits

### 8.1 Build Status
```
Status: ✅ PASS
Data: 2026-01-08
Correções aplicadas:
- is_super_admin → role === 'super_admin' (via useAuth)
- is_external derivado de role_in_bu === 'external'
- Dialog props: onSubmit → onSave, removido modules
```

### 8.2 audit-rbac.ts
```
Status: PENDENTE
Observações: Executar após deploy
```

### 8.3 audit-identity-usage.ts
```
Status: PENDENTE
Observações: Executar após deploy
```

### 8.4 audit-bu-scope.ts
```
Status: PENDENTE
Observações: Executar após deploy
```

---

## 9. QA Status

Ver: [QA_WAVE6_IMPLEMENTATION.md](../qa/QA_WAVE6_IMPLEMENTATION.md)

**Status Atual:** 🟡 AGUARDANDO TESTES

---

## 10. Plano de Transição

### Fase 1 - Wave 6 (Atual)
- ✅ Aliases criados
- ✅ Templates v2 criados
- ✅ UI de atribuição v2
- ✅ Preview de permissões
- ⏳ QA e validação

### Fase 2 - Wave 7 (Futuro)
- [ ] Migração gradual de usuários para v2
- [ ] Deprecação de templates v1
- [ ] Remoção de aliases após sunset period
- [ ] Limpeza de código legado

### Timeline Sugerido
- **Wave 6:** Implementação e validação (atual)
- **Wave 7:** 30 dias após Wave 6 - migração gradual
- **Sunset v1:** 90 dias após Wave 7 - remoção de legado

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebra de permissões existentes | Aliases garantem compatibilidade |
| Migração automática quebra fluxos | Migração é manual e opt-in |
| Templates v2 incompletos | Preview mostra diff antes de aplicar |
| Admin perde acesso | Somente super_admin edita admins |

---

## 12. Métricas de Sucesso

| Métrica | Baseline | Target |
|---------|----------|--------|
| Templates atribuídos por usuário | 1-2 (v1) | 3-5 (v2 granulares) |
| Keys duplicadas | ~20 | 0 |
| Tempo para atribuir permissões | N/A | < 30s |
| Erros de permissão reportados | N/A | 0 |

---

## Conclusão

Wave 6 está **implementada e pronta para QA**. A migração de usuários é gradual e não automática, garantindo zero quebra de funcionalidade existente.

Próximos passos:
1. Executar QA checklist
2. Rodar audits de RBAC
3. Validar cenários críticos com stakeholders
4. Preparar comunicação para Wave 7

---

*Relatório gerado automaticamente - Wave 6 Implementation*
