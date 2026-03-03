

## Plano: Correções e Testes E2E para E-mails Pós-Wizard

### Pre-checklist Concluído

Documentos analisados: TCR v3.9.0, IDENTITY_CONVENTION v2.2.0, PERMISSIONS_AND_RBAC_MODEL v1.5.0, DATA_MODEL_REGISTRY, SCHEMA_QUICK_REFERENCE. Todas as 4 Edge Functions e os 2 triggers frontend foram inspecionados.

---

### Problemas Encontrados

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| 1 | **CRÍTICO** | `clevel-checkin-summary` consulta tabela `user_bu_roles` que **NÃO EXISTE**. A tabela correta é `bu_user_memberships` com `role_in_bu = 'admin'` | `clevel-checkin-summary/index.ts:181` |
| 2 | **CRÍTICO** | `clevel-checkin-summary` e `collaborator-checkin-summary` **não estão no `config.toml`** — falharão com 401 (JWT) | `supabase/config.toml` |
| 3 | **MÉDIO** | `clevel-checkin-summary` assume `user_bu_roles.user_id = auth.users.id`, mas per IDENTITY_CONVENTION, `bu_user_memberships.user_id` armazena `auth.users.id` — isso está correto, mas o nome da tabela está errado | `clevel-checkin-summary/index.ts:210` |
| 4 | **BAIXO** | C-Level trigger no frontend faz `await` na invocação APÓS `navigate('/okrs')` — a navegação pode cancelar o fetch | `CLevelCheckinPage.tsx:170-186` |

---

### Tarefas

**1. Corrigir `config.toml`**
Adicionar:
```toml
[functions.clevel-checkin-summary]
verify_jwt = false

[functions.collaborator-checkin-summary]
verify_jwt = false
```

**2. Corrigir tabela inexistente no C-Level**
Em `clevel-checkin-summary/index.ts`, substituir:
```typescript
// ERRADO
serviceClient.from('user_bu_roles').select('user_id').eq('bu_id', buId).eq('role', 'admin')

// CORRETO (per DATA_MODEL_REGISTRY + IDENTITY_CONVENTION)
serviceClient.from('bu_user_memberships').select('user_id').eq('bu_id', buId).eq('role_in_bu', 'admin')
```

**3. Corrigir ordem de navegação no C-Level**
Mover `navigate('/okrs')` para DEPOIS do `await` da Edge Function (ou tornar fire-and-forget sem `await`):
```typescript
const handleComplete = useCallback(async () => {
  const completedSessionId = await clearDraft();
  toast.success('Check-in estratégico concluído!');
  // Fire-and-forget ANTES de navegar
  if (completedSessionId && quarterlyCycle?.id && currentBu?.id) {
    buSupabase.functions.invoke('clevel-checkin-summary', { ... }).catch(console.warn);
  }
  navigate('/okrs');
}, [...]);
```
Aplicar o mesmo padrão ao `CollaboratorCheckinPage.tsx`.

**4. Criar testes E2E para as 3 funções sem cobertura**
Seguindo o padrão do `mbr-summary/index.test.ts`:

| Arquivo | Cenários |
|---------|----------|
| `clevel-checkin-summary/index.test.ts` | missing fields → 400, non-existent session → skipped, idempotency → already_sent |
| `collaborator-checkin-summary/index.test.ts` | missing sessionId → 400, non-existent session → skipped, idempotency → already_sent |
| `team-checkin-summary/index.test.ts` | missing fields → 400, non-existent session → skipped, idempotency → already_sent |

**5. Executar testes E2E**
Rodar os 4 arquivos de teste (`mbr-summary`, `clevel-checkin-summary`, `collaborator-checkin-summary`, `team-checkin-summary`) via `test-edge-functions` para validar: campo obrigatório, idempotência, e orquestração de agentes IA (se houver sessão real).

**6. Atualizar memory de ritual-history-intent**
Registrar a correção da tabela e os resultados dos testes.

