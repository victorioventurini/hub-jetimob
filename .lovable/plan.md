

# Correcao: Timeout do Navigator LockManager na Autenticacao

## Status: IMPLEMENTADO

## Diagnostico Final

O erro ocorria em DOIS niveis:

### Nivel 1: Contencao entre clientes (diagnosticado inicialmente)
`globalClient` e `buScopedClient` competiam pelo mesmo Navigator Lock exclusivo `lock:sb-oiwnghihyqdsinouwmga-auth-token`.

### Nivel 2: Auto-deadlock no globalClient (causa raiz real)
No `useAuth.tsx`, `onAuthStateChange()` dispara `initialize()` que adquire o lock exclusivo.
`getSession()` e chamado logo em seguida no mesmo `useEffect`, tentando adquirir o MESMO lock.
Se `initialize()` demora (token refresh, rede lenta), `getSession()` faz timeout de 10s.

Este e um problema de reentrant locking no Navigator LockManager — locks exclusivos NAO sao reentrantes.

## Solucao Aplicada

Lock no-op em AMBOS os clientes:
- `src/integrations/supabase/globalClient.ts` — elimina auto-deadlock
- `src/integrations/supabase/buScopedClient.ts` — elimina contencao entre clientes

Multi-tab token refresh e tratado pelo auth server (revogacao de refresh tokens antigos).

## Resultado

- Timeout de 10 segundos eliminado
- Login via magic link funciona para todos os usuarios
- Sem regressao em modulos existentes
