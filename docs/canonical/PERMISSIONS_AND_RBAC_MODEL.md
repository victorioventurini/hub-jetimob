# Permissions & RBAC Model — Hub da Jet

**Versão:** 1.5.0  
**Data:** 2026-02-12  
**Status:** Normativo (V2-only mode) | RLS 100% migrado | Wave 8 Audit Complete | **users_admin_v2 membership fix** | **Manager Auto-Assignment v1.0**  
**Referência:** TCR v3.7.0, RBAC_TEMPLATES_V3.md

---

## 0. Personas do Sistema

| Persona | Identificação | Wildcard | Escopo |
|---------|---------------|----------|--------|
| **Super Admin** | `user_roles.role = 'super_admin'` | `['*']` todas BUs | Plataforma inteira |
| **Admin BU** | `bu_user_memberships.role_in_bu = 'admin'` | `['*']` na BU | Business Unit específica |
| **Líder** | `teams.leader_user_id = profiles.id` | Não | Times que lidera (+ descendentes) |
| **Colaborador** | Membro da BU sem role específico | Não | Via templates atribuídos |
| **Externo** | `user_roles.role = 'external'` | Não | Apenas tickets participantes |

### Capacidades por Persona

| Capacidade | Super Admin | Admin BU | Líder | Colaborador | Externo |
|------------|:-----------:|:--------:|:-----:|:-----------:|:-------:|
| Gerenciar BUs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Impersonar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Acesso `/hub` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar usuários da BU | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerenciar OKRs org | ✅ | ✅ | ⚠️¹ | ❌ | ❌ |
| Gerenciar OKRs do time | ✅ | ✅ | ✅ | ❌ | ❌ |
| Criar check-ins | ✅ | ✅ | ✅ | ✅² | ❌ |
| Visualizar módulos | ✅ | ✅ | ✅ | ✅³ | ❌ |
| Tickets (participante) | ✅ | ✅ | ✅ | ✅ | ✅ |

¹ Requer template `okrs_admin_v2`  
² Apenas em KRs onde é owner/co-responsible  
³ Via template `collaborator_base_v2` (11 keys)

---

## 1. Visão Geral

O Hub utiliza um modelo de permissões baseado em **permission keys** com templates somáveis, eliminando completamente o sistema V1 baseado em grupos.

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODELO DE PERMISSÕES V2                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│   │   Profile   │───▶│   Membership    │───▶│   Templates   │  │
│   │ profiles.id │    │ bu_user_member..│    │ permission_   │  │
│   └─────────────┘    └─────────────────┘    │ templates_v2  │  │
│                               │              └───────────────┘  │
│                               ▼                      │          │
│                      ┌─────────────────┐             ▼          │
│                      │    Overrides    │    ┌───────────────┐  │
│                      │ bu_user_permis..│    │  Permission   │  │
│                      │ _overrides      │    │    Keys       │  │
│                      └─────────────────┘    │ (strings)     │  │
│                               │              └───────────────┘  │
│                               ▼                      │          │
│                      ┌─────────────────────────────────────┐   │
│                      │        Permissões Efetivas           │   │
│                      │  Union(Templates) + Overrides        │   │
│                      └─────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Entidades do Modelo

### 2.1 Tabelas Principais

| Tabela | Propósito | BU-Scoped |
|--------|-----------|-----------|
| `profiles` | Identidade de domínio do usuário | Não (global) |
| `bu_user_memberships` | Vínculo profile ↔ BU com role | Sim |
| `permission_catalog` | Catálogo de permission keys | Não (global) |
| `permission_templates_v2` | Templates de permissão | Não (global) |
| `permission_template_permissions_v2` | Keys por template | Não (global) |
| `bu_user_permission_templates_v2` | Templates atribuídos ao usuário | Sim |
| `bu_user_permission_overrides` | Overrides (allow/deny) por usuário | Sim |

### 2.2 Relacionamentos

```sql
-- Profile → Membership → BU
profiles.id → bu_user_memberships.profile_id
bu_user_memberships.bu_id → bu_units.id

-- Membership → Templates
bu_user_permission_templates_v2.user_id → profiles.id
bu_user_permission_templates_v2.template_id → permission_templates_v2.id

-- Templates → Permission Keys
permission_template_permissions_v2.template_id → permission_templates_v2.id
permission_template_permissions_v2.permission_id → permission_catalog.id

-- Overrides
bu_user_permission_overrides.user_id → profiles.id
bu_user_permission_overrides.permission_id → permission_catalog.id
```

---

## 3. Permission Keys

### 3.1 Formato

```
<module>.<entity>.<action>
```

**Exemplos:**
- `okrs.objective.create`
- `tickets.message.delete`
- `assets.inventory.view`
- `teams.member.assign`

### 3.2 Ações Padrão

| Ação | Descrição |
|------|-----------|
| `view` | Visualizar (read) |
| `create` | Criar |
| `update` | Atualizar |
| `delete` | Deletar |
| `manage` | Gestão completa |
| `assign` | Atribuir |
| `settings` | Configurações |

### 3.3 Catálogo de Permissões

O catálogo completo está em `permission_catalog`. Algumas categorias:

| Módulo | Prefixo | Exemplos |
|--------|---------|----------|
| Home | `home.` | `home.dashboard.view` |
| OKRs | `okrs.` | `okrs.objective.create`, `okrs.kr.checkin` |
| KPIs | `kpis.` | `kpis.metric.create:bu`, `kpis.settings.manage:bu`, `kpis.value.add:bu` |
| Tickets | `tickets.` | `tickets.view`, `tickets.category.manage` |
| Assets | `assets.` | `assets.inventory.view`, `assets.keys.checkout` |
| Teams | `teams.` | `teams.member.view`, `teams.structure.manage` |
| Users | `users.` | `users.view`, `users.profile.update` |
| Settings | `settings.` | `settings.bu.manage`, `settings.integrations.view` |

#### Detalhamento de KPIs

| Ação | Permission Key | Template Mínimo |
|------|---------------|-----------------|
| Visualizar indicadores | `kpis.view:bu` | `kpis_view_v2` |
| Criar métricas | `kpis.metric.create:bu` | `kpis_admin_v2` |
| Criar KPIs (estratégicos) | `kpis.settings.manage:bu` | `kpis_admin_v2` |
| Atualizar valores | `kpis.value.add:bu` | `kpis_operate_v2` |
| Gerenciar (arquivar/excluir) | `kpis.settings.manage:bu` | `kpis_admin_v2` |

---

## 4. Templates V2

### 4.1 Hierarquia de Templates

```
┌──────────────────────────────────────────────────────────────┐
│                    CAMADA 0: BASE (obrigatória)              │
├──────────────────────────────────────────────────────────────┤
│  collaborator_base (9 keys)      external_contact_base (4)   │
│  - Todo colaborador interno      - Contatos de parceiros     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    CAMADA ADMINISTRATIVA                      │
├──────────────────────────────────────────────────────────────┤
│  bu_admin (135 keys) - Acesso total à BU                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    CAMADA DE RESPONSABILIDADES               │
├──────────────────────────────────────────────────────────────┤
│  Tickets: tickets_operator, tickets_admin                    │
│  OKRs: okrs_viewer, okrs_team_manager, okrs_bu_manager       │
│  KPIs: kpi_viewer, kpi_editor, kpi_admin                     │
│  Inventário: inventory_manager, inventory_admin              │
│  Chaves: keys_manager, keys_admin                            │
│  Brindes: gifts_manager, gifts_admin                         │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Templates Disponíveis

| Slug | Keys | Descrição |
|------|------|-----------|
| `collaborator_base_v2` | 11 | Base para todo colaborador interno (Wave 8) |
| `external_contact_base` | 4 | Base para contatos externos |
| `bu_admin` | 135 | Admin da BU |
| `users_admin_v2` | 9 | Admin de usuários (inclui `people.membership.manage:bu`) |
| `users_operate_v2` | 3 | Operador de usuários |
| `users_view_v2` | 2 | Visualizador de usuários |
| `tickets_operator` | 8 | Operador de tickets |
| `tickets_admin` | 23 | Admin de tickets |
| `okrs_viewer` | 6 | Visualizador de OKRs |
| `okrs_team_manager` | 9 | Gestor de OKRs do time |
| `okrs_bu_manager` | 37 | Gestor de OKRs da BU |
| `kpi_viewer` | 4 | Visualizador de KPIs |
| `kpi_editor` | 7 | Editor de KPIs |
| `kpi_admin` | 13 | Admin de KPIs |
| `inventory_manager` | 10 | Gestor de inventário |
| `inventory_admin` | 16 | Admin de inventário |
| `keys_manager` | 7 | Gestor de chaves |
| `keys_admin` | 16 | Admin de chaves |
| `gifts_manager` | 5 | Gestor de brindes |
| `gifts_admin` | 11 | Admin de brindes |

---

## 5. Liderança vs Templates

### 5.1 Regra de Ouro

> **Liderança NÃO é template.** É definida pela estrutura organizacional.

```sql
-- Liderança é definida em:
teams.leader_user_id → profiles.id
squads.leader_user_id → profiles.id
```

### 5.2 Escopo de Atuação

O que um líder pode fazer depende de:
1. **Permission keys** que possui (via templates)
2. **Escopo** via `user_can_manage_team()`

```sql
-- Função que determina se usuário pode gerenciar time
CREATE FUNCTION user_can_manage_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean AS $$
  -- É líder direto?
  SELECT EXISTS (
    SELECT 1 FROM teams WHERE id = p_team_id AND leader_user_id = p_user_id
  )
  -- OU é admin/super_admin?
  OR is_platform_admin(p_user_id)
  OR is_bu_admin(p_user_id, (SELECT bu_id FROM teams WHERE id = p_team_id))
$$;
```

### 5.3 Regras de Hierarquia

| Regra | Status |
|-------|--------|
| Líder gerencia próprio time | ✅ Permitido |
| Líder gerencia times filhos | ✅ Permitido |
| Líder gerencia time pai | ❌ Proibido |
| Líder gerencia times irmãos | ❌ Proibido |
| Admin gerencia qualquer time da BU | ✅ Permitido |

### 5.4 Auto-Atribuição de Gestor (v1.5.0)

> **Liderança de time implica gestão.** Quando um membro é atribuído a um time, o líder é automaticamente atribuído como seu gestor (`profiles.manager_user_id`).

| Cenário | Comportamento |
|---------|---------------|
| Membro atribuído a time com líder | `manager_user_id` = `teams.leader_user_id` (se estava NULL) |
| Líder do time muda | Membros que reportavam ao líder antigo são atualizados para o novo líder |
| Gestor definido manualmente | Triggers **não sobrescrevem** — respeitam atribuição manual |
| Líder é ele mesmo membro do time | Trigger **não se auto-atribui** como gestor |

**Frontend:** `JetimoberDialog.tsx` pré-preenche o campo "Gestor" ao selecionar um time, permitindo ajuste manual.

**Triggers SQL:** `sync_manager_from_team_leader` (em `profiles`) e `propagate_leader_change_to_members` (em `teams`).

---

## 6. Avaliação de Permissões

### 6.1 No Backend (RLS) — 100% V2 Migrado

Todas as 79 tabelas do Hub agora usam RLS V2 com `has_permission()`:

```sql
-- Função principal de avaliação (OBRIGATÓRIA para RLS)
-- IMPORTANTE: Recebe profile_id, NÃO auth.uid()!
CREATE FUNCTION has_permission(
  p_profile_id uuid,
  p_bu_id uuid,
  p_permission_key text
) RETURNS boolean AS $$
BEGIN
  -- Admin tem tudo
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE p.id = p_profile_id
      AND ur.role IN ('super_admin', 'admin')
  ) THEN
    RETURN true;
  END IF;
  
  -- BU Admin tem tudo na BU
  IF EXISTS (
    SELECT 1 FROM bu_user_memberships m
    JOIN profiles p ON p.user_id = m.user_id
    WHERE p.id = p_profile_id
      AND m.bu_id = p_bu_id
      AND m.role_in_bu = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Verifica override DENY
  IF EXISTS (
    SELECT 1 FROM bu_user_permission_overrides o
    JOIN permission_catalog pc ON o.permission_id = pc.id
    WHERE o.user_id = p_profile_id
      AND o.bu_id = p_bu_id
      AND pc.key = p_permission_key
      AND o.effect = 'deny'
  ) THEN
    RETURN false;
  END IF;
  
  -- Verifica templates
  RETURN EXISTS (
    SELECT 1 FROM bu_user_permission_templates_v2 ut
    JOIN permission_template_permissions_v2 tp ON ut.template_id = tp.template_id
    JOIN permission_catalog pc ON tp.permission_id = pc.id
    WHERE ut.user_id = p_profile_id
      AND ut.bu_id = p_bu_id
      AND pc.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

#### Padrões RLS V2 (OBRIGATÓRIOS)

```sql
-- SELECT: Qualquer membro da BU pode ler
CREATE POLICY "Members can view" ON public.tabela
  FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- INSERT: Requer permissão específica
CREATE POLICY "Users with create permission" ON public.tabela
  FOR INSERT WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'module.entity.create:scope')
  );

-- UPDATE: Requer permissão específica
CREATE POLICY "Users with update permission" ON public.tabela
  FOR UPDATE USING (
    has_permission(my_profile_id(), bu_id, 'module.entity.update:scope')
  );

-- DELETE: Requer permissão específica
CREATE POLICY "Users with delete permission" ON public.tabela
  FOR DELETE USING (
    has_permission(my_profile_id(), bu_id, 'module.entity.delete:scope')
  );
```

#### Tabelas Globais (sem bu_id)

```sql
-- Para tabelas globais, usar scope :global
CREATE POLICY "Platform admins only" ON public.global_table
  FOR ALL USING (
    has_permission(my_profile_id(), null, 'admin.global_table.manage:global')
  );
```

### 6.2 No Frontend

```typescript
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { can, isLoading } = usePermissions();
  
  // Verificar permissão única
  if (can('okrs.objective.create')) {
    // Mostrar botão de criar
  }
  
  // Verificar múltiplas permissões (OR)
  if (can(['okrs.objective.create', 'okrs.kr.create'])) {
    // Tem pelo menos uma
  }
  
  // Verificar múltiplas permissões (AND)
  if (can('okrs.objective.create') && can('okrs.objective.delete')) {
    // Tem ambas
  }
}
```

### 6.3 Hook usePermissions

```typescript
// src/hooks/usePermissions.ts

export function usePermissions() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  
  const { data: permissions, isLoading } = useQuery({
    queryKey: queryKeys.permissions.list(currentBu?.id),
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_permissions', {
        p_bu_id: currentBu!.id
      });
      return data as string[];
    },
    enabled: !!currentBu?.id,
  });
  
  const can = useCallback((key: string | string[]) => {
    if (!permissions) return false;
    
    const keys = Array.isArray(key) ? key : [key];
    return keys.some(k => permissions.includes(k) || permissions.includes('*'));
  }, [permissions]);
  
  return { can, permissions, isLoading };
}
```

---

## 7. Governança

### 7.1 Atribuição de Templates

| Quem | Pode Atribuir | Restrições |
|------|---------------|------------|
| Super Admin | Todos | Nenhuma |
| BU Admin | Todos exceto `super_admin` role | Apenas na própria BU |
| Outros | Nenhum | - |

### 7.2 Audit Trail

Toda alteração de permissão é logada em `permission_audit_log`:

```sql
CREATE TABLE permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid REFERENCES bu_units(id),
  target_user_id uuid, -- profiles.id
  action text NOT NULL, -- 'template_added', 'template_removed', 'override_set', etc.
  template_id uuid,
  permission_key text,
  performed_by uuid, -- profiles.id
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

### 7.3 Regras de Negócio

| Regra | Implementação |
|-------|---------------|
| Colaborador base é automático | Trigger on membership insert |
| Admin não precisa de templates | Wildcard `['*']` |
| Templates são somáveis | Union no `get_my_permissions()` |
| Deny override tem precedência | Verificado primeiro na avaliação |

---

## 8. Anti-Patterns Proibidos

| Anti-Pattern | Correto |
|--------------|---------|
| `if (role === 'admin')` | `if (can('module.action'))` |
| `user_roles.role === 'collaborator'` | `usePermissions().can('...')` |
| Verificar `bu_user_memberships.role_in_bu` | Usar permission keys |
| Hardcode de roles em RLS | Usar `has_permission()` |
| Criar novos grupos V1 | Criar templates V2 |

---

## 9. Referências

- `docs/RBAC_TEMPLATES_V3.md` - Detalhes de cada template
- `docs/engineering/COMPLIANCE_BASELINE.md` - Audit de RBAC
- `docs/TECHNICAL_CONTEXT_REGISTRY.md` §3 - Seção de permissões
- `src/hooks/usePermissions.ts` - Implementação frontend

---

*Documento normativo. Qualquer implementação de permissões deve seguir este modelo.*
