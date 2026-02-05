
# Wave 8: Auditoria e Consolidação do Catálogo de Permissões

## Resumo Executivo

Revisão completa do catálogo de permissões do Hub garantindo consistência entre RLS policies, catálogo e frontend, com cobertura adequada para todas as personas do sistema.

---

## Diagnóstico: Inconsistências Identificadas

### 1. Permission Keys Fantasmas no Frontend

Keys usadas no código que **NÃO EXISTEM** no `permission_catalog`:

| Arquivo | Key Usada | Key Correta no Catálogo |
|---------|-----------|-------------------------|
| `LeaderDashboard.tsx` | `okrs.read` | `okrs.view:bu` |
| `LeaderDashboard.tsx` | `kpis.read` | `kpis.view:bu` |
| `LeaderDashboard.tsx` | `tickets.read` | `tickets.ticket.view:bu` |
| `LeaderDashboard.tsx` | `assets.read` | `assets.view:bu` |
| `EditBuDialog.tsx` | `bu.settings.manage:bu` | ❌ Não existe |
| `LocationDialog.tsx` | `bu.location.manage:bu` | ❌ Não existe |

### 2. Inconsistência de Nomenclatura

O catálogo tem padrões mistos:

| Padrão | Exemplo | Quantidade |
|--------|---------|------------|
| `module.resource.action:scope` | `okrs.org_objective.create:bu` | Maioria |
| `module.action:scope` | `okrs.view:bu` | Alguns |
| `module.resource.action` (sem scope) | `assets.settings.manage` | Poucos |

### 3. Template `collaborator_base_v2` - Cobertura Insuficiente

Conforme documentação, deveria ter 9 keys de visualização básica. Porém o template atual não inclui keys de visualização genéricas como `home.view:bu`, `okrs.view:bu`, `kpis.view:bu`.

### 4. Keys Órfãs ou Duplicadas

| Key | Status |
|-----|--------|
| `assets.inventory.read:bu` | Potencialmente duplica `assets.inventory.view:bu` |
| `kpis.metric.read:bu` | Potencialmente duplica `kpis.view:bu` |

---

## Mapeamento de Personas

### 1. Super Admin (Platform Level)

**Identificação:** `user_roles.role = 'super_admin'`

| Capacidade | Status | Implementação |
|------------|--------|---------------|
| Wildcard `['*']` em todas as BUs | ✅ OK | `get_my_permissions()` retorna `['*']` |
| Acesso a `/hub` (gestão de BUs) | ✅ OK | Verificado via `is_platform_admin()` |
| Impersonação de usuários | ✅ OK | `ImpersonationContext` |
| Gerenciar super_admins | ✅ OK | Apenas super_admin |

### 2. Admin de BU

**Identificação:** `bu_user_memberships.role_in_bu = 'admin'`

| Capacidade | Status | Implementação |
|------------|--------|---------------|
| Wildcard `['*']` na BU | ✅ OK | `has_permission()` verifica |
| Gerenciar usuários da BU | ✅ OK | Template `bu_admin_v2` |
| Configurações da BU | ⚠️ Faltam keys | `bu.settings.manage:bu` não existe |

### 3. Líder de Time

**Identificação:** `teams.leader_user_id = profiles.id`

| Capacidade | Status | Implementação |
|------------|--------|---------------|
| Gerenciar OKRs do time | ✅ OK | `okrs.team_objective.create:team` + `user_can_manage_team()` |
| Gerenciar KPIs do time | ⚠️ Parcial | Depende de template |
| Ver membros do time | ✅ OK | Via scope `team` |

### 4. Colaborador Interno

**Identificação:** Sem role específico, membro de BU

| Capacidade | Status | Implementação |
|------------|--------|---------------|
| Visualizar módulos | ⚠️ Incompleto | `collaborator_base_v2` precisa keys de view |
| Criar tickets internos | ✅ OK | `tickets.thread.create:bu` |
| Check-ins próprios | ✅ OK | Via scope `self_or_owner` |

### 5. Usuário Externo (Partner Contact)

**Identificação:** `user_roles.role = 'external'`

| Capacidade | Status | Implementação |
|------------|--------|---------------|
| Apenas tickets onde participa | ✅ OK | RLS `can_view_ticket()` |
| Enviar mensagens | ✅ OK | 4 keys no template |
| NÃO acessa outros módulos | ✅ OK | Bloqueado |

---

## Plano de Execução (6 Fases)

### Fase 1: Correção Imediata de Keys Fantasmas (30min)

Corrigir as keys usadas no frontend que não existem no catálogo.

**Arquivos a modificar:**
1. `src/modules/home/components/LeaderDashboard.tsx`
   - `okrs.read` → `okrs.view:bu`
   - `kpis.read` → `kpis.view:bu`
   - `tickets.read` → `tickets.ticket.view:bu`
   - `assets.read` → `assets.view:bu`

### Fase 2: Adicionar Keys Faltantes ao Catálogo (30min)

Migração SQL para adicionar keys de BU settings:

```sql
INSERT INTO permission_catalog (key, module, resource, action, scope, description) VALUES
  ('bu.settings.manage:bu', 'bu', 'settings', 'manage', 'bu', 'Gerenciar configurações da BU'),
  ('bu.location.manage:bu', 'bu', 'location', 'manage', 'bu', 'Gerenciar localizações da BU'),
  ('bu.settings.view:bu', 'bu', 'settings', 'view', 'bu', 'Visualizar configurações da BU');
```

### Fase 3: Expandir Template `collaborator_base_v2` (30min)

Adicionar keys de visualização básica:

```sql
-- Keys a adicionar ao collaborator_base_v2
INSERT INTO permission_template_items_v2 (template_id, permission_id)
SELECT 
  (SELECT id FROM permission_templates_v2 WHERE slug = 'collaborator_base_v2'),
  id
FROM permission_catalog
WHERE key IN (
  'home.view:bu',
  'okrs.view:bu',
  'kpis.view:bu',
  'assets.view:bu',
  'teams.view:bu',
  'users.list.view:bu'
);
```

### Fase 4: Auditoria de RLS vs Catálogo (1h)

Verificar todas as RLS policies que usam `has_permission()` e confirmar que as keys existem.

**Script de auditoria:**
```sql
-- Listar policies e extrair keys usadas
SELECT 
  schemaname, tablename, policyname,
  regexp_matches(definition, '''([a-z]+\.[a-z_]+\.[a-z_]+:[a-z_]+)''', 'g') as keys_used
FROM pg_policies
WHERE definition LIKE '%has_permission%';
```

### Fase 5: Padronização de Nomenclatura (1h)

Criar aliases para keys sem scope e deprecar gradualmente:

| Key Atual | Alias/Novo |
|-----------|------------|
| `assets.settings.manage` | `assets.settings.manage:bu` |

### Fase 6: Documentação (30min)

Atualizar:
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/RBAC_TEMPLATES_V3.md`
- `docs/qa/QA_PERMISSIONS_TEMPLATES.md`
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` → Bump para v2.92.0

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/modules/home/components/LeaderDashboard.tsx` | Corrigir 4 keys |
| `src/modules/bu/components/EditBuDialog.tsx` | Verificar fallback |
| `src/modules/bu/components/LocationDialog.tsx` | Verificar fallback |
| Migração SQL `wave8_permission_catalog_fixes.sql` | Adicionar keys faltantes |
| Migração SQL `wave8_expand_collaborator_base.sql` | Expandir template |
| `docs/audits/WAVE8_PERMISSION_AUDIT_REPORT.md` | Criar relatório |
| `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` | Atualizar seção de personas |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | Bump version |

---

## Critérios de Sucesso

| Critério | Métrica |
|----------|---------|
| Zero keys fantasmas no frontend | Todas as keys usadas existem no catálogo |
| `collaborator_base_v2` expandido | ≥ 8 keys de visualização |
| Personas documentadas | 5/5 no RBAC model |
| TCR atualizado | v2.92.0 |

---

## Estimativa de Tempo

| Fase | Tempo |
|------|-------|
| Fase 1: Keys fantasmas | 30min |
| Fase 2: Keys faltantes | 30min |
| Fase 3: Expandir template | 30min |
| Fase 4: Auditoria RLS | 1h |
| Fase 5: Padronização | 1h |
| Fase 6: Documentação | 30min |
| **Total** | **4-5h** |

