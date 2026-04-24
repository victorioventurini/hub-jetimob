# QA — Estabilidade de Sessão no Desktop

**Data:** 2026-04-24
**Escopo:** `globalClient.ts`, `useAuth.tsx`, `useIdleTimeout.ts`
**Incidente reportado:** Sessão no desktop expira mais cedo que o esperado, enquanto no celular nunca cai (relato de `victorio@jetimob.com`).

---

## Diagnóstico

### Causa raiz — Cross-tab refresh race
O `globalClient.ts` substituía o lock nativo do GoTrue por um **no-op**:
```ts
lock: async (_n, _t, fn) => fn()
```
Esse workaround foi introduzido para evitar um deadlock interno do `useAuth`
(que chamava `getSession()` em paralelo ao listener `onAuthStateChange`,
disputando o mesmo Navigator Lock e estourando 10s de timeout).

Efeito colateral: **sem coordenação cross-tab**, quando 2+ abas no desktop
disparavam refresh do token simultaneamente, a primeira aba consumia o
refresh token e o servidor rejeitava as demais com `invalid_grant` →
`SIGNED_OUT` silencioso → usuário voltava à tela de login.

Mobile não sofria porque tipicamente roda 1 aba ativa por vez.

### Causa secundária — Cold start / wake de sleep
O safety timeout de 10s em `useAuth` forçava `isLoading=false` antes do
`INITIAL_SESSION` chegar quando o laptop voltava de sleep com rede lenta
(VPN reconectando, 3G fraco), fazendo a UI renderizar como deslogado.

### Causa terciária — Idle timeout sem visibilitychange
`useIdleTimeout` (8h) não escutava `visibilitychange`. Abas em background
por 8h+ levavam sign-out mesmo quando o usuário voltava a focar na aba.

---

## Mudanças aplicadas

### 1. `src/integrations/supabase/globalClient.ts`
- **Removido** o `lock` no-op. GoTrue volta a usar Navigator LockManager nativo,
  garantindo que apenas uma aba por vez execute refresh do token.
- `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`
  permanecem inalterados (esses já estavam corretos).

### 2. `src/hooks/useAuth.tsx`
- **Removida** a chamada redundante `supabase.auth.getSession().then(...)`.
  Confiamos exclusivamente no evento `INITIAL_SESSION` que o
  `onAuthStateChange` emite no mount com a sessão já hidratada do storage.
  Isso elimina o deadlock que motivou o lock no-op.
- **Adicionado** listener `visibilitychange`: ao voltar para a aba,
  chama `getSession()` (silencioso, não-bloqueante) para revalidar.
- **Safety timeout** elevado de 10s → 20s (cobre wake de laptop em redes lentas).

### 3. `src/hooks/useIdleTimeout.ts`
- **Adicionado** `visibilitychange` à lista de eventos de atividade.
  Apenas reseta o timer quando `document.visibilityState === 'visible'`.

---

## Cenários de validação manual

### Cenário 1 — Cross-tab persistence
1. Login no desktop (Chrome).
2. Abrir o app em **2 abas distintas** (mesmo navegador).
3. Deixar ambas abertas por 1h+ (tempo > 1 ciclo de refresh do token).
4. **Esperado:** ambas as abas continuam logadas. Nenhum `SIGNED_OUT`
   espúrio nos consoles. Nenhum `invalid_grant` na network.

### Cenário 2 — Wake de sleep
1. Login no desktop.
2. Fechar a tampa do laptop por 30+ min.
3. Abrir e voltar à aba do app.
4. **Esperado:** a aba revalida silenciosamente via `visibilitychange`,
   permanece logada. Sem flash de tela de login.

### Cenário 3 — Idle real
1. Login no desktop.
2. Não interagir (mouse/teclado/scroll/foco) por **8h ininterruptas**.
3. **Esperado:** sign-out automático (comportamento intencional preservado).

### Cenário 4 — Aba dormente, retorno antes de 8h
1. Login no desktop.
2. Trocar para outra janela/app por 7h, ocasionalmente voltando à aba do app
   (mesmo que rapidamente).
3. **Esperado:** cada retorno à aba reseta o timer; usuário continua logado.

### Cenário 5 — Sem warnings de cliente múltiplo
1. Login + navegar pelo app.
2. **Esperado:** nenhum warning `Multiple GoTrueClient instances detected`
   no console.

---

## Regressões a observar

- **Magic link**: o fluxo de `AuthCallback` continua chamando `getSession()`
  explicitamente (ele detém o `detectSessionInUrl=false`). Validar que
  login via magic link ainda funciona.
- **BU-scoped client**: `clearBuClientCache()` continua sendo chamado em
  `SIGNED_IN`/`SIGNED_OUT`/`TOKEN_REFRESHED` — sem mudança.
- **External users**: o redirect de `useExternalProfileRedirect` consome
  `useAuth` e deve permanecer estável.

---

## Cobertura automatizada

Não há suite Vitest cobrindo o ciclo de auth (depende de Navigator Lock real
e GoTrue server). Validação é **manual via cenários acima**. Caso o problema
reapareça, adicionar logs estruturados em `onAuthStateChange` para
correlacionar `event` + `session?.expires_at` cross-tab.
