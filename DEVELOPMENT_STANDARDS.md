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

---

## D. UI Immediate Update Pattern (Atualização Imediata da UI)

### Regra

**OBRIGATÓRIO**: Todas as mutations (create, update, delete) devem invalidar queries relacionadas com `refetchType: 'active'` para garantir atualização imediata da UI sem necessidade de refresh manual.

### Por que isso importa?

- Sem `refetchType: 'active'`, o React Query pode não refetch queries inativas
- Usuário precisa dar refresh manual para ver alterações
- UX degradada e confusão sobre se a ação foi bem-sucedida

### Implementação Correta

```typescript
// ✅ CORRETO - Atualização imediata
const createMutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.module.entity(buId), 
      refetchType: 'active'  // ← OBRIGATÓRIO
    });
    toast.success("Item criado");
  },
});

// ❌ ERRADO - Pode não atualizar UI imediatamente
const createMutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.module.entity(buId)
      // Falta refetchType: 'active'
    });
    toast.success("Item criado");
  },
});
```

### Quando Invalidar Múltiplas Queries

Se uma mutação afeta múltiplas entidades, invalide todas com `refetchType: 'active'`:

```typescript
onSuccess: () => {
  // Invalidar lista principal
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.assets.inventory.all(buId), 
    refetchType: 'active' 
  });
  // Invalidar entidades relacionadas
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.assets.categories(buId), 
    refetchType: 'active' 
  });
  toast.success("Item criado");
},
```

### Checklist para PRs com Mutations

- [ ] Todas mutations usam `refetchType: 'active'` em `invalidateQueries`
- [ ] Queries relacionadas são invalidadas (não apenas a principal)
- [ ] Toast de feedback é exibido após sucesso/erro

---

## E. Wizards e Ritos de Gestão

### E.1 Regra de Ouro para Wizards

> ⚠️ **Todo wizard de check-in ou gestão DEVE incluir insights contextuais.**
> Wizards sem insights são "termômetros" — não agregam inteligência.

### E.2 Checklist Obrigatório para Novos Wizards

| # | Item | Obrigatório |
|---|------|-------------|
| 1 | Calcular e exibir estado das KRs (`calculateKrState`) | ✅ |
| 2 | Exibir insights contextuais por estado | ✅ |
| 3 | Oferecer perguntas de reflexão guiadas | ✅ |
| 4 | Integrar com agentes Vic quando aplicável | Recomendado |
| 5 | Usar `VicInsightCard` ou `KrStateInsightCard` | ✅ |
| 6 | Não usar insights para avaliação/punição | ✅ |

### E.3 Estados de KR Reconhecidos

| Estado | Condição | Insight |
|--------|----------|---------|
| `not_started` | progress = 0 | "O foco está claro?" |
| `healthy` | Progresso conforme esperado | "Manter execução" |
| `stagnant` | 14+ dias sem check-in | "O que está travando?" |
| `at_risk` | RAG yellow | "Decisão necessária?" |
| `off_track` | RAG red | "Replanejar?" |
| `achieved` | progress = 100% | "Algum aprendizado?" |
| `exceeded` | progress > 100% | "O que aprendemos?" |
| `not_achieved` | Ciclo encerrado + <100% | "Meta, plano ou execução?" |

### E.4 Anti-patterns em Wizards

| # | Anti-pattern | Alternativa |
|---|--------------|-------------|
| 1 | Wizard sem insights | Adicionar `KrStateInsightCard` |
| 2 | Insight punitivo | Reescrever com tom de aprendizado |
| 3 | Comparação entre usuários | Focar em padrões, não pessoas |
| 4 | Insights genéricos | Usar contexto específico da KR |

> 📋 **Guia Completo:** [WIZARD_DEVELOPMENT_GUIDE.md](docs/guides/WIZARD_DEVELOPMENT_GUIDE.md)
