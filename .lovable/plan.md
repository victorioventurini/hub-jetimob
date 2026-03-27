

## Correção: Loop infinito para usuários sem BU

### Problema

No `SelectBu.tsx` (linhas 77-80), quando `userBus.length === 0`, o `useEffect` redireciona para `/`. Porém `/` usa `BuRequiredRoute` que redireciona de volta para `/select-bu` → **loop infinito**.

```text
/  →  BuRequiredRoute (sem BU)  →  /select-bu  →  useEffect (0 BUs)  →  /  →  ...
```

A página já possui o estado vazio correto (linhas 314-323) com a mensagem "Entre em contato com um administrador", mas nunca é exibido por causa do redirect.

### Confirmação via TCR

- **Modelo de autenticação (TCR §1.2):** Login via Magic Link valida domínio + perfil pré-cadastrado. Usuários sem membership em nenhuma BU são um caso válido (perfil existe mas sem `bu_user_memberships`).
- **Fluxo BU (BuContext):** `BuRequiredRoute` já trata corretamente o caso `userBus.length === 0` redirecionando para `/select-bu`. A página deve permanecer lá.

### Alteração

**Arquivo:** `src/pages/SelectBu.tsx` — linhas 70-82

Remover o bloco `else if (userBus.length === 0)` do `useEffect`:

```typescript
useEffect(() => {
  if (isLoading) return;
  if (userBus.length === 1) {
    selectBu(userBus[0].bu_id);
    navigate(returnTo, { replace: true });
  }
  // userBus.length === 0: permanece na página e exibe estado vazio
}, [isLoading, userBus, selectBu, navigate, returnTo]);
```

Nenhum outro arquivo precisa ser alterado.

### Resultado

| Cenário | Comportamento |
|---------|--------------|
| 0 BUs | Permanece em `/select-bu` com mensagem de contato |
| 1 BU | Auto-seleciona e redireciona (sem mudança) |
| N BUs | Exibe lista de seleção (sem mudança) |

