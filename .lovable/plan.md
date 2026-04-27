# Wave Hardening — Notificações Cross-BU

## Diagnóstico

**Bug confirmado:** Estando na BU **Jetimob**, o usuário recebe no sino notificações de tickets criados na BU **Victorio Venturini** (ex.: "Carro para PCD").

**Causa raiz:** As queries da tabela `notifications` filtram apenas por `user_id`, sem `bu_id`:

- `src/components/notifications/NotificationCenter.tsx` (l.116-121) — sino do header.
- `src/pages/me/NotificationsPage.tsx` (l.145-150 listagem; l.205-208 markAsRead; l.220-224 markAllRead) — página completa.

**Banco:**
- `public.notifications.bu_id uuid` existe, todas as 767 linhas atuais já têm `bu_id` preenchido (zero nulos).
- RLS atual (`notifications_own_v2`, `notifications_select_own_v2`, etc.) usa apenas `user_id = auth.uid()` — **não enforça `bu_id`**. O cliente BU-scoped envia o header `x-current-bu-id`, mas as policies não o validam, então o Postgres retorna linhas de qualquer BU do usuário.
- RPCs `mark_notification_read` e `mark_all_notifications_read` precisam ser auditados (provavelmente também ignoram BU).

**Realtime:** o canal usa filtro `user_id=eq.${user.id}` no client global — também sem filtro de BU. Resultado: badge pisca em qualquer BU ao receber qualquer notificação.

## Plano (4 camadas — padrão `cross-bu-isolation-pattern`)

### Camada 1 — Frontend filter (queries)
- `NotificationCenter.tsx`: adicionar `.eq('bu_id', currentBuId)` na query do sino.
- `NotificationsPage.tsx`:
  - Listagem paginada: `.eq('bu_id', currentBuId)`.
  - `markAllAsRead`: `.eq('bu_id', currentBuId)` além do `user_id`.
  - `markAsRead` por id: confiar na RLS endurecida (camada 4) — id já é único.

### Camada 2 — Query keys com `buId`
- Atualizar `src/lib/queryKeys/notifications.ts` (criar se ausente) para incluir `buId` na chave `all` e em `paginated`:
  ```ts
  all: (userId?: string, buId?: string | null) =>
    ['notifications', 'all', userId ?? null, buId ?? null] as const,
  allPrefix: (userId?: string) => ['notifications', 'all', userId ?? null] as const,
  ```
- Atualizar `NotificationCenter.tsx` e `NotificationsPage.tsx` para passar `currentBuId` na chave.
- Invalidations passam a usar `allPrefix(user.id)` para limpar todas as variantes de BU em paralelo (mesmo padrão de Tickets).

### Camada 3 — Realtime BU-aware
- Mudar o canal realtime para incluir `bu_id` no filtro. O Postgres realtime só aceita um `eq`; usar dois filtros via `or` não é suportado de forma estável. Solução: assinar com `user_id=eq.X` e, dentro do callback, descartar payloads cujo `new.bu_id !== currentBuId` antes de invalidar.

### Camada 4 — RLS hardening (migration)
Substituir as policies de SELECT/UPDATE/DELETE da `notifications` para exigir match de BU além de ownership:

```sql
-- Drop policies antigas
DROP POLICY IF EXISTS notifications_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_select_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_own_v2 ON public.notifications;

-- SELECT: dono + BU ativa (com bypass para platform admin via política existente notifications_admin_select_v2)
CREATE POLICY notifications_select_own_bu_v3 ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()
    AND (bu_id IS NULL OR is_current_bu(bu_id))
  );

CREATE POLICY notifications_update_own_bu_v3 ON public.notifications
  FOR UPDATE USING (
    user_id = auth.uid() AND (bu_id IS NULL OR is_current_bu(bu_id))
  ) WITH CHECK (
    user_id = auth.uid() AND (bu_id IS NULL OR is_current_bu(bu_id))
  );

CREATE POLICY notifications_delete_own_bu_v3 ON public.notifications
  FOR DELETE USING (
    user_id = auth.uid() AND (bu_id IS NULL OR is_current_bu(bu_id))
  );

CREATE POLICY notifications_insert_own_bu_v3 ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (bu_id IS NULL OR is_current_bu(bu_id))
  );
```

Auditar as functions `mark_notification_read(p_notification_id)` e `mark_all_notifications_read()` — se forem `SECURITY DEFINER`, adicionar guard `is_current_bu(bu_id)` antes do update (e em mark_all, filtrar por `bu_id = current_bu_id()`).

### Camada 5 — UX guard (defense-in-depth)
Quando a notificação é clicada e tem `context_url`, navegar é seguro (RLS da entidade alvo já bloqueia conteúdo de outra BU). Não precisa de `VicErrorState` no sino — o filtro server-side + cache key BU-scoped já evita exibição cruzada.

## Memória / Documentação
Atualizar `mem://standards/cross-bu-isolation-pattern` adicionando notificações ao inventário de módulos cobertos e criar `mem://features/notifications/cross-bu-isolation` resumindo as 4 camadas aplicadas aqui.

## Arquivos impactados

**Frontend**
- `src/lib/queryKeys/notifications.ts` (criar/atualizar) + teste
- `src/lib/queryKeys/index.ts` (export)
- `src/components/notifications/NotificationCenter.tsx`
- `src/pages/me/NotificationsPage.tsx`

**Backend**
- Nova migration: `..._notifications_bu_isolation_rls.sql`
- Auditoria/ajuste das RPCs `mark_notification_read` e `mark_all_notifications_read` (mesma migration)

**Memória**
- `mem://features/notifications/cross-bu-isolation` (novo)
- `mem://standards/cross-bu-isolation-pattern` (append)

## Resultado esperado
- Estando na BU Jetimob, o sino e a página `/me/notifications` mostram **somente** notificações com `bu_id = Jetimob`.
- Realtime continua funcionando, mas só atualiza badge/cache da BU ativa.
- Ao trocar de BU, cache é separado por chave (sem race) e a lista correta aparece imediatamente.
- Mesmo se o frontend falhar, RLS bloqueia leitura cruzada no banco.
