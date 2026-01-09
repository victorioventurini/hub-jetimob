# Development Standards - Hub Jetimob

## Navegação entre Rotas

### Regra Canônica (OBRIGATÓRIA)

❌ **PROIBIDO**: `onClick={() => navigate(...)}` em `<div>`, `<span>`, `<li>`, `<button>` ou similares

✅ **OBRIGATÓRIO**: Usar `<Link>` ou `<NavLink>` do `react-router-dom`

### Por quê?

O padrão `onClick + navigate()` impede:
- Cmd+Click / Ctrl+Click abrir em nova aba
- Clique do meio do mouse
- Context menu "Abrir em nova aba"

### Padrões de Implementação

#### Cards e Containers Clicáveis

```tsx
// ❌ PROIBIDO
<div onClick={() => navigate(`/teams/${id}`)}>
  <TeamCard team={team} />
</div>

// ✅ CORRETO
<Link to={`/teams/${id}`} className="block">
  <TeamCard team={team} />
</Link>
```

#### Botões CTA

```tsx
// ❌ PROIBIDO
<Button onClick={() => navigate('/okrs')}>Ver todos</Button>

// ✅ CORRETO
<Button asChild>
  <Link to="/okrs">Ver todos</Link>
</Button>
```

#### Botões de Voltar

```tsx
// ❌ PROIBIDO (quando a rota pai é conhecida)
<Button onClick={() => navigate('/tickets')}>
  <ArrowLeft /> Voltar
</Button>

// ✅ CORRETO
<Button asChild variant="ghost">
  <Link to="/tickets">
    <ArrowLeft /> Voltar
  </Link>
</Button>
```

### Exceções Permitidas

O uso de `onClick` é permitido APENAS quando:
- Abre modal/dialog
- Expande accordion/collapsible
- Seleciona item (sem navegação)
- Executa ação (delete, edit inline, toggle)
- `navigate(-1)` quando não há rota conhecida

**Se muda de rota → OBRIGATORIAMENTE `<Link>`**

---

## Convenção de Identidade: ProfileId vs AuthUserId

### Regra Canônica (OBRIGATÓRIA)

| Contexto | ID a usar | Tipo TS |
|----------|-----------|---------|
| UI / Selects / Hooks | `profiles.id` | `ProfileId` |
| `notifications.user_id` | `auth.users.id` | `AuthUserId` |
| RPCs que enviam notificação | Aceitar `profile_id`, resolver `auth_user_id` internamente | — |

### Por quê?

- `profiles.id` é o identificador de domínio (pessoa na BU).
- `notifications.user_id` tem FK para `auth.users.id` (para realtime/push).
- Passar `profiles.id` onde `auth.users.id` é esperado causa **FK violation**.

### Padrões de Implementação

```tsx
// ❌ PROIBIDO — passar auth.users.id pela UI
const { mutate } = useSendTestNotification();
mutate({ targetUserId: user.id }); // user.id vem de useAuth

// ✅ CORRETO — UI passa profile_id, RPC resolve
const { mutate } = useSendTestNotification();
mutate({ targetProfileId: profile.id }); // profile.id vem de v_bu_active_profiles
```

### Branded Types Obrigatórios

```tsx
import { ProfileId, AuthUserId, asProfileId, asAuthUserId } from '@/lib/idTypes';

// Cast explícito obrigatório
const profileId: ProfileId = asProfileId(rawId);
const authUserId: AuthUserId = asAuthUserId(profile.user_id!);

// ❌ PROIBIDO — cast direto entre tipos
const wrong: AuthUserId = profileId as any; // NUNCA
```

### RPCs Aprovadas

| RPC | Parâmetro | Descrição |
|-----|-----------|-----------|
| `send_test_notification_v2` | `p_target_profile_id` | ✅ Aceita profile_id, resolve auth_user_id |
| `send_test_notification` | `p_target_user_id` | ❌ **@deprecated** — NÃO USAR |

---

## Audits Obrigatórios

### Auditoria ProfileId vs AuthUserId

**Script:** `scripts/audit-auth-vs-profile-id.ts`

**Execução:**
```bash
npx tsx scripts/audit-auth-vs-profile-id.ts
```

**Exit codes:**
- `0`: Nenhum problema crítico
- `1`: Problemas críticos encontrados (build deve falhar)

**Quando executar:**
- Pre-commit (recomendado)
- CI/CD pipeline (obrigatório)
- Antes de PRs que tocam notificações

**Critério de aceite:**
- 0 findings CRITICAL
- Warnings devem ser revisados manualmente

### Checklist para PRs de Notificações

- [ ] Nenhuma chamada a `send_test_notification` (usar v2)
- [ ] UI passa `profile.id`, nunca `user.id`
- [ ] Branded types `ProfileId`/`AuthUserId` usados em hooks
- [ ] Audit script passa com exit code 0

---

## Convenção de Email: work_email (NUNCA profiles.email)

### Regra Canônica (OBRIGATÓRIA)

❌ **PROIBIDO**: `profiles.email` — **ESTE CAMPO NÃO EXISTE**

✅ **OBRIGATÓRIO**: `profiles.work_email`

### Por quê?

A tabela `profiles` usa `work_email`, não `email`. Usar `profiles.email` causa:
- Queries falhando silenciosamente
- Notificações não enviadas
- Erros de "User email not found"

### Resolver Canônico

```sql
-- Usar sempre a função canônica para resolver email
SELECT public.resolve_work_email('auth-user-id-here');

-- Ou para info completa do destinatário
SELECT public.resolve_notification_recipient('auth-user-id-here');
-- Retorna: { profile_id, display_name, work_email, has_profile }
```

### Em Edge Functions

```typescript
// ❌ PROIBIDO
const { data } = await supabase
  .from("profiles")
  .select("email")  // CAMPO NÃO EXISTE
  .eq("user_id", userId);

// ✅ CORRETO — usar resolver canônico
const { data } = await supabase.rpc("resolve_notification_recipient", {
  p_auth_user_id: userId
});
const email = data?.work_email;
```

### Auditoria Obrigatória

**Script:** `scripts/audit-profiles-email.ts`

```bash
npx tsx scripts/audit-profiles-email.ts
```

**Exit codes:**
- `0`: Nenhum problema
- `1`: Uso de `profiles.email` detectado (build deve falhar)

### Checklist para PRs com Email

- [ ] Nenhum uso de `profiles.email`
- [ ] Usar `profiles.work_email` ou resolver RPC
- [ ] Audit script `audit-profiles-email.ts` passa
