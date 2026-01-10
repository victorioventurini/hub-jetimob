# Convenção de Identidade: user_id vs profile_id

**Versão:** 2.0.0  
**Última atualização:** 2026-01-08  
**Status:** Ativo

---

## ⚠️ REGRA DE OURO

> **❌ NUNCA comparar `auth.uid()` diretamente com colunas de domínio.**
> 
> **✅ SEMPRE converter usando `my_profile_id()` ou funções canônicas.**

```sql
-- ❌ ERRADO: Comparação direta
WHERE owner_user_id = auth.uid()

-- ✅ CORRETO: Usando função canônica
WHERE owner_user_id = my_profile_id()
```

---

## 1. Definições

O Hub utiliza **dois identificadores distintos** para representar usuários:

| Identificador | Tabela de Origem | Propósito |
|--------------|------------------|-----------|
| `user_id` | `auth.users.id` | Identidade de **autenticação** (Supabase Auth) |
| `profile_id` | `public.profiles.id` | Identidade de **domínio** (entidade de usuário no Hub) |

### 1.1 Quando usar cada um

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTENTICAÇÃO                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  auth.users                                              │   │
│  │  └── id (UUID) ← user_id                                │   │
│  │      • Usado em: auth.uid(), RLS policies, JWT tokens   │   │
│  │      • Nunca expor diretamente para o usuário           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK: profiles.user_id → auth.users.id
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          DOMÍNIO                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  public.profiles                                         │   │
│  │  ├── id (UUID) ← profile_id                             │   │
│  │  └── user_id (UUID) → referência para auth.users.id     │   │
│  │                                                          │   │
│  │  Usado em:                                               │   │
│  │  • Relações de domínio (memberships, teams, OKRs, etc.) │   │
│  │  • Queries de listagem de usuários                       │   │
│  │  • Exibição de dados na UI                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.2 Mapeamento Definitivo de Tabelas

### Tabelas que usam `auth.users.id`:

| Tabela | Coluna | FK Explícita | Uso |
|--------|--------|--------------|-----|
| `bu_user_memberships` | `user_id` | ✓ Sim | Membership em BUs |
| `user_roles` | `user_id` | ✓ Sim | Roles globais |
| `audit_logs` | `user_id` | ✗ Não | Audit trail (sessão) |
| `profiles` | `user_id` | ✓ Sim | Link auth → domínio |

### Tabelas que usam `profiles.id`:

| Tabela | Coluna | FK Explícita | Uso |
|--------|--------|--------------|-----|
| `teams` | `leader_user_id` | ✓ Sim | Liderança de time |
| `user_team_memberships` | `user_id` | ✓ Sim | Participação em times |
| `bu_user_permission_groups` | `user_id` | ✓ Sim | Grupos de permissão |
| `okr_initiatives` | `owner_user_id` | ✓ Sim | Ownership de iniciativas |
| `okr_org_objectives` | `owner_user_id` | ✓ Sim | Ownership de objetivos org |
| `okr_org_key_results` | `owner_user_id` | ✓ Sim | Ownership de KRs org |
| `okr_team_objectives` | `owner_user_id` | ✓ Sim | Ownership de objetivos |
| `okr_team_key_results` | `owner_user_id` | ✓ Sim | Ownership de KRs |
| `okr_checkins` | `user_id` | ✓ Sim | Autor do check-in |
| `mentions` | `mentioned_user_id` | ✓ Sim | Menções |
| `kpi_metrics` | `owner_user_id` | ✓ Sim | Ownership de KPIs |

### ⚠️ COLUNAS LEGADAS QUE ARMAZENAM `profiles.id`

> **ATENÇÃO:** As colunas abaixo possuem nomes que sugerem `auth.users.id`, mas **NÃO** armazenam `auth.users.id`. Elas foram migradas para armazenar `profiles.id`.

#### Módulo OKRs (migrado em 2026-01-07)

| Tabela | Coluna (nome legado) | Armazena | FK Constraint |
|--------|---------------------|----------|---------------|
| `okr_org_objectives` | `owner_user_id` | **profiles.id** | `okr_org_objectives_owner_profile_fkey` |
| `okr_org_key_results` | `owner_user_id` | **profiles.id** | `okr_org_key_results_owner_profile_fkey` |
| `okr_team_objectives` | `owner_user_id` | **profiles.id** | `okr_team_objectives_owner_profile_fkey` |
| `okr_team_key_results` | `owner_user_id` | **profiles.id** | `okr_team_key_results_owner_profile_fkey` |
| `okr_checkins` | `user_id` | **profiles.id** | `okr_checkins_author_profile_fkey` |
| `okr_initiatives` | `owner_user_id` | **profiles.id** | `okr_initiatives_owner_user_id_fkey` |

#### Módulo Tickets (migrado em 2026-01-07)

| Tabela | Coluna (nome legado) | Armazena | FK Constraint |
|--------|---------------------|----------|---------------|
| `tickets` | `owner_user_id` | **profiles.id** | `tickets_owner_profile_fkey` |
| `tickets` | `created_by_user_id` | **profiles.id** | `tickets_created_by_profile_fkey` |
| `ticket_messages` | `author_user_id` | **profiles.id** | `ticket_messages_author_profile_fkey` |
| `ticket_participants` | `user_id` | **profiles.id** | `ticket_participants_profile_fkey` |

#### Módulo Assets (migrado em 2026-01-07)

| Tabela | Coluna (nome legado) | Armazena | FK Constraint |
|--------|---------------------|----------|---------------|
| `asset_inventory` | `current_user_id` | **profiles.id** | `asset_inventory_current_user_profile_fkey` |
| `asset_movements` | `from_user_id` | **profiles.id** | `asset_movements_from_user_profile_fkey` |
| `asset_movements` | `to_user_id` | **profiles.id** | `asset_movements_to_user_profile_fkey` |
| `asset_movements` | `performed_by_user_id` | **profiles.id** | `asset_movements_performed_by_profile_fkey` |
| `asset_movements` | `authorized_by_user_id` | **profiles.id** | `asset_movements_authorized_by_profile_fkey` |

**Por que não renomeamos?**
- Evitar breaking changes em código existente
- Manter compatibilidade com RLS policies
- As FKs e comentários de coluna documentam a verdadeira referência

**Como saber qual ID usar?**
- Verifique a FK constraint no banco
- Consulte esta documentação
- Use `useIdentity().profileId` no frontend para essas colunas

### ⚠️ REGRA OBRIGATÓRIA

**Toda nova tabela com relação de ownership DEVE:**
1. Usar `profiles.id` como referência
2. Ter FK explícita declarada
3. Usar `useIdentity().profileId` no frontend

**PROIBIDO:** Usar `useAuth().user.id` diretamente para ownership/permissões.

---

## 2. Regras de Uso

### 2.1 Use `user_id` (auth.users.id) para:

| Contexto | Exemplo |
|----------|---------|
| Verificar autenticação | `auth.uid()` em RLS policies |
| Funções de autorização | `is_platform_admin(auth.uid())` |
| Auditoria de ações | `audit_logs.user_id` |
| Sessões e tokens | JWT claims |
| Tabela `user_roles` | Mapping de roles globais |
| Tabela `bu_user_memberships` | Membership em BUs |

### 2.2 Use `profile_id` (profiles.id) para:

| Contexto | Exemplo |
|----------|---------|
| Ownership de entidades | `okr_initiatives.owner_user_id` |
| Liderança de times | `teams.leader_user_id` |
| Participação em times | `user_team_memberships.user_id` |
| Grupos de permissão | `bu_user_permission_groups.user_id` |
| Menções e notificações | `mentions.mentioned_user_id` |
| Atribuições de assets | `asset_inventory.current_user_id` |

### 2.3 Nomenclatura de Colunas

| Coluna no DB | Referencia | Quando usar |
|--------------|------------|-------------|
| `user_id` | Pode ser ambos | Verificar FK para determinar |
| `owner_user_id` | `profiles.id` | Owner de entidades de domínio |
| `leader_user_id` | `profiles.id` | Líder de time |
| `created_by_user_id` | `profiles.id` | Criador de registro |
| `author_user_id` | `profiles.id` | Autor de conteúdo |
| `performed_by_user_id` | `profiles.id` | Executor de ação |
| `profile_user_id` | `profiles.id` | Vínculo explícito com profile |

---

## 3. Conversão entre IDs

### 3.1 No Frontend (TypeScript)

```typescript
// Obtendo ambos os IDs a partir do contexto de autenticação
import { useAuth } from "@/hooks/useAuth";

function useIdentity() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // user.id = auth.users.id (user_id)
  const userId = user?.id;
  
  // Para obter profile_id, fazer query em profiles
  useEffect(() => {
    if (userId) {
      supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [userId]);
  
  // profile.id = profiles.id (profile_id)
  const profileId = profile?.id;
  
  return { userId, profileId };
}
```

### 3.2 No Backend (PostgreSQL)

```sql
-- De user_id para profile_id
SELECT id AS profile_id
FROM public.profiles
WHERE user_id = auth.uid();

-- De profile_id para user_id
SELECT user_id
FROM public.profiles
WHERE id = p_profile_id;

-- Helper function para usar em outras funções
CREATE OR REPLACE FUNCTION get_profile_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = p_user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION get_auth_user_id(p_profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id FROM profiles WHERE id = p_profile_id LIMIT 1
$$;
```

### 3.3 Padrão em Hooks

```typescript
// Hook que expõe ambos os IDs de forma consistente
interface UserIdentity {
  userId: string;      // auth.users.id
  profileId: string;   // profiles.id
}

// Exemplo: useBuUsers retorna objeto com ambos
interface BuUser {
  user_id: string;     // auth.users.id
  profile_id: string;  // profiles.id
  profiles: ProfileData;
}
```

---

## 4. Mapeamento de Tabelas

### 4.1 Tabelas que usam `auth.users.id` (user_id de autenticação)

| Tabela | Coluna | Justificativa |
|--------|--------|---------------|
| `user_roles` | `user_id` | Roles globais de autenticação |
| `bu_user_memberships` | `user_id` | Membership verificada via auth |
| `audit_logs` | `user_id` | Auditoria de sessão |
| `profiles` | `user_id` | FK para auth.users |

### 4.2 Tabelas que usam `profiles.id` (profile_id de domínio)

| Tabela | Coluna | Justificativa |
|--------|--------|---------------|
| `teams` | `leader_user_id` | Líder é entidade de domínio |
| `user_team_memberships` | `user_id` | Membro de time |
| `bu_user_permission_groups` | `user_id` | Grupos de permissão por BU |
| `okr_initiatives` | `owner_user_id` | Owner de iniciativa |
| `okr_team_objectives` | `owner_user_id` | Owner de objetivo |
| `okr_team_key_results` | `owner_user_id` | Owner de KR |
| `okr_checkins` | `user_id` | Autor do check-in |
| `tickets` | `owner_user_id`, `created_by_user_id` | Responsável/criador |
| `mentions` | `mentioned_user_id`, `author_id` | Participantes |
| `asset_inventory` | `current_user_id` | Detentor atual |

---

## 5. RLS Policies

### 5.1 Padrão para policies que verificam ownership

```sql
-- CORRETO: Comparar auth.uid() com profiles.user_id
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- CORRETO: Para entidades de domínio, converter primeiro
CREATE POLICY "Users can view own initiatives"
  ON public.okr_initiatives FOR SELECT
  USING (
    owner_user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- MELHOR: Usar function helper
CREATE POLICY "Users can view own initiatives v2"
  ON public.okr_initiatives FOR SELECT
  USING (owner_user_id = get_profile_id(auth.uid()));
```

### 5.2 Funções de autorização existentes

```sql
-- Já existentes no sistema
is_platform_admin(user_id)      -- Usa auth.users.id
is_super_admin(user_id)         -- Usa auth.users.id
is_bu_admin(user_id, bu_id)     -- Usa auth.users.id
user_has_bu_access(user_id, bu_id)  -- Usa auth.users.id
is_team_leader(user_id, team_id)    -- Recebe auth.users.id, converte para profile_id internamente
user_can_manage_team(user_id, team_id)  -- Recebe auth.users.id
```

---

## 6. Checklist de Implementação

Ao criar novas features ou tabelas:

- [ ] **Definir qual ID usar** baseado no contexto (auth vs domínio)
- [ ] **Nomear coluna adequadamente** (ver seção 2.3)
- [ ] **Criar FK explícita** para `auth.users(id)` ou `profiles(id)`
- [ ] **Documentar na migração** qual referência está sendo usada
- [ ] **No frontend**: garantir que hooks/componentes passem o ID correto
- [ ] **Em RLS policies**: usar conversão se necessário

### Exemplo de migração documentada:

```sql
-- Coluna owner_user_id referencia profiles.id (profile_id)
-- Justificativa: ownership é conceito de domínio, não de autenticação
ALTER TABLE public.my_new_table
  ADD COLUMN owner_user_id uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.my_new_table.owner_user_id IS 
  'ID do profile (profiles.id) que é owner desta entidade';
```

---

## 7. Erros Comuns e Como Evitar

### ❌ Erro: Misturar IDs em joins

```typescript
// ERRADO: Passando auth.users.id onde espera-se profiles.id
const { data } = await supabase
  .from("okr_initiatives")
  .select("*")
  .eq("owner_user_id", user.id); // user.id é auth.users.id!

// CORRETO: Usar profile_id
const { data } = await supabase
  .from("okr_initiatives")
  .select("*")
  .eq("owner_user_id", profile.id); // profile.id é profiles.id
```

### ❌ Erro: FK violation ao inserir

```
ERROR: insert or update on table "bu_user_permission_groups" 
violates foreign key constraint "bu_user_permission_groups_user_id_fkey"
```

**Causa**: Tentando inserir `auth.users.id` em coluna que referencia `profiles.id`

**Solução**: Usar `profile_id` na operação

### ❌ Erro: Dados não aparecem na query

**Causa**: Comparando IDs de tipos diferentes (auth vs profile)

**Solução**: Verificar qual ID a tabela espera e converter se necessário

---

## 8. Referência Rápida

```
┌────────────────────────────────────────────────────────────────┐
│ RESUMO: QUAL ID USAR?                                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Preciso verificar se usuário está logado?                     │
│  → auth.uid() (user_id)                                        │
│                                                                 │
│  Preciso verificar role/membership global?                     │
│  → user_id (auth.users.id)                                     │
│                                                                 │
│  Preciso atribuir ownership de algo no Hub?                    │
│  → profile_id (profiles.id)                                    │
│                                                                 │
│  Preciso listar usuários com dados?                            │
│  → profiles.id como chave, profiles.user_id para auth checks  │
│                                                                 │
│  Preciso verificar liderança de time?                          │
│  → teams.leader_user_id = profiles.id                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. Módulos Migrados

### 10.1 OKRs ✅ (2026-01-07)
- FKs migradas para `profiles.id`
- Frontend usando `useIdentity().profileId`
- Lint gate ativo: bloqueia `useAuth` no módulo

### 10.2 Tickets ✅ (2026-01-07)
- FKs migradas para `profiles.id`
- Frontend usando `useIdentity().profileId`
- Lint gate ativo: bloqueia `useAuth` nos hooks

### 10.3 Assets ✅ (2026-01-07)
- FKs migradas para `profiles.id`
- Campos de auditoria (`created_by`, `updated_by`) mantêm `auth.users.id` (uso de auditoria)

### 10.4 KPIs ✅ (já estava correto)

---

## 11. Identity Unification v2.2 (2026-01-09)

A v2.2 implementou arquitetura profile-first completa:

### 11.1 Novas Colunas
- `profiles.email` (canônico, substitui `work_email`)
- `profiles.deleted_at` (soft delete)
- `bu_user_memberships.profile_id` (FK → profiles.id)
- `bu_user_memberships.deleted_at` (soft delete)

### 11.2 Novas Views
| View | Propósito |
|------|-----------|
| `v_profiles_directory` | Diretório global de perfis |
| `v_bu_memberships_active` | Memberships ativos por BU |
| `v_bu_all_profiles_admin` | Admin view completa |
| `v_bu_active_profiles` | Compatibilidade |

### 11.3 Novas Funções
| Função | Uso |
|--------|-----|
| `my_profile_id()` | Retorna profile_id do usuário autenticado |
| `is_profile_bu_member(profile_id, bu_id)` | Verifica membership |
| `is_profile_bu_admin(profile_id, bu_id)` | Verifica admin |
| `get_profile_bus(profile_id)` | Lista BUs do profile |

### 11.4 Padrão de Uso (Pós v2.2)

```sql
-- ✅ CORRETO: Usar my_profile_id() em RLS
WHERE owner_user_id = my_profile_id()

-- ✅ CORRETO: Usar funções profile-first
WHERE is_profile_bu_member(my_profile_id(), bu_id)

-- ⚠️ LEGADO (funciona até 2026-02-15): Funções com user_id
WHERE is_bu_member(auth.uid(), bu_id)
```

### 11.5 Deadline

- **Dual-mode deadline:** 2026-02-15
- Após essa data, funções com `user_id` emitirão warnings
- Migração de RLS policies será obrigatória
- `owner_user_id` já referenciava `profiles.id`
- RLS usa hierarquia de times para gestão

---

## 11. Scripts de Validação

### 11.1 Check de Convenção de Identidade

**Localização:** `scripts/check-identity-convention.sh`

**Uso:**
```bash
chmod +x scripts/check-identity-convention.sh
./scripts/check-identity-convention.sh
```

**Integração com CI (GitHub Actions):**
```yaml
# .github/workflows/lint.yml
- name: Check Identity Convention
  run: ./scripts/check-identity-convention.sh
```

**Integração com pre-commit (husky):**
```bash
# .husky/pre-commit
./scripts/check-identity-convention.sh
```

---

## Changelog

| Versão | Data | Descrição |
|--------|------|-----------|
| 2.0.0 | 2026-01-10 | Identity Cutover v3.0 completo, canary gates, strict mode |
| 1.2.0 | 2026-01-08 | Corrigidas 7 RLS policies de OKRs que comparavam auth.uid() com profile_id |
| 1.1.0 | 2026-01-07 | Adicionada dívida técnica de Tickets e script de validação |
| 1.0.0 | 2026-01-07 | Documento inicial com convenções estabelecidas |
