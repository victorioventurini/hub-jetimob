# Correção — Perda de sessão no desktop

## Diagnóstico (já confirmado no pré-checklist)

1. **Causa raiz (cross-tab):** `globalClient.ts` substitui o lock nativo do GoTrue por um no-op. Em desktop com múltiplas abas, refresh tokens disparam concorrentemente — a primeira aba consome o refresh token, as demais recebem `invalid_grant` → `SIGNED_OUT` silencioso. Mobile não sofre porque normalmente há 1 só aba ativa.
2. **Causa secundária (cold start / wake):** `useAuth` chama `supabase.auth.getSession()` em paralelo ao listener `onAuthStateChange` que já dispara `INITIAL_SESSION`. O safety timeout de 10s força `isLoading=false` ainda sem sessão hidratada quando o laptop volta de sleep e a rede está lenta → UI renderiza como "deslogado".
3. **Causa terciária (idle):** `useIdleTimeout` (8h) não escuta `visibilitychange`. Ao voltar de uma aba dormente após 8h+, o usuário leva sign-out mesmo tendo "voltado a interagir".

## Plano de implementação

### Fase 1 — `src/integrations/supabase/globalClient.ts`
- Remover o `lock: async (..) => fn()` (no-op).
- Manter `detectSessionInUrl: false`, `persistSession: true`, `autoRefreshToken: true`.
- Comentário explicando que o lock nativo (Navigator LockManager) volta a coordenar refresh entre abas.

### Fase 2 — `src/hooks/useAuth.tsx`
- **Remover** o bloco `supabase.auth.getSession().then(...)` redundante (linhas ~104-134). O listener `onAuthStateChange` dispara `INITIAL_SESSION` no mount com a sessão hidratada, eliminando o deadlock que motivou o lock no-op.
- **Aumentar** safety timeout de 10s → 20s (cobre wake de laptop em redes lentas).
- **Adicionar** listener `visibilitychange` que, ao voltar `visible`, chama `supabase.auth.getSession()` (silencioso) para revalidar/atualizar a sessão local sem bloquear a UI. Se voltar `null` e antes havia sessão, registra warn e deixa o GoTrue emitir `SIGNED_OUT` naturalmente.
- Garantir que `setIsLoading(false)` também ocorra no caminho `INITIAL_SESSION` quando não há usuário (já está, mas validar).

### Fase 3 — `src/hooks/useIdleTimeout.ts`
- Adicionar `visibilitychange` (apenas quando `document.visibilityState === 'visible'`) à lista de eventos que chamam `touch()`.
- Manter timeout de 8h e checagem por `localStorage` (cross-tab já funciona).

### Fase 4 — Documentação
- Criar `docs/qa/QA_AUTH_DESKTOP_SESSION.md` com:
  - Descrição do incidente (sessão perdendo no desktop, persistente no mobile)
  - Diagnóstico raiz (lock no-op + cross-tab refresh race)
  - Mudanças aplicadas
  - Cenários de validação manual: (a) 2 abas abertas por 1h+ não derrubam sessão; (b) wake de laptop após sleep mantém sessão; (c) idle real de 8h+ ainda desloga.
- Atualizar `mem://architecture/auth/supabase-client-sync-standard` adicionando: "Lock nativo do GoTrue obrigatório no globalClient; proibido lock no-op."

## Arquivos

**Editados:**
- `src/integrations/supabase/globalClient.ts`
- `src/hooks/useAuth.tsx`
- `src/hooks/useIdleTimeout.ts`
- `.lovable/memory/architecture/auth/supabase-client-sync-standard.md` (criar/atualizar)

**Criados:**
- `docs/qa/QA_AUTH_DESKTOP_SESSION.md`

## Critério de aceite

- [ ] Sessão persiste em ≥2 abas abertas por horas (sem `SIGNED_OUT` espúrio)
- [ ] Voltar de sleep com rede lenta não desloga (safety timeout 20s + INITIAL_SESSION)
- [ ] `useIdleTimeout` registra atividade ao tornar a aba visível
- [ ] Sem warning "Multiple GoTrueClient instances"
- [ ] QA doc + memória atualizados

## Riscos

- **Baixo**: o lock nativo já é o default upstream do Supabase JS; o no-op foi um workaround para o deadlock interno do useAuth, que estamos eliminando na Fase 2. Sem o `getSession()` manual concorrente, não há cenário de auto-deadlock.
- **Mitigação**: safety timeout de 20s garante UI nunca trava em loading mesmo se algo der errado.
