## Problema

Toast genérico **"Erro ao remover milestone: erro desconhecido"** mascara o erro real. Tanto super_admin (`victorio@jetimob.com`) quanto BU admin (`uriel.canfield@jetimob.com` — dono do projeto e do milestone) deveriam ter permissão pela matriz canônica e pelo trigger `enforce_milestone_soft_delete_authority`, mas a falha real não chega à UI.

## Causa raiz

Em `useSoftDeleteMilestone` (`src/modules/projects/hooks/useMilestoneMutations.ts`):
- `PostgrestError` não é `instanceof Error` → `onError` cai no fallback `'erro desconhecido'` e perde `message/details/hint/code`.
- A mutação atual depende de RLS UPDATE + trigger BEFORE — exatamente o cenário fragilizado por drift de BU contextual / impersonação que motivou Projects v1.8 a migrar para RPCs `SECURITY DEFINER`.

## Solução (alinhada ao padrão v1.8 de Projects)

### 1. Migração — RPC `archive_milestone_v2` (`SECURITY DEFINER`)

Replica literalmente a matriz canônica do trigger atual:

```
platform_admin OR project owner OR bu_admin OR leader_of_owner OR has_permission(projects.milestone.delete:bu)
```

Retorna `jsonb { ok, code, project_id? }` com códigos: `ARCHIVED | ALREADY_ARCHIVED | NOT_FOUND | FORBIDDEN | UNAUTHENTICATED`. Idempotente. `GRANT EXECUTE TO authenticated`. RLS e trigger permanecem como defesa em profundidade.

### 2. Refator do hook `useSoftDeleteMilestone`

Trocar UPDATE direto por `supabase.rpc('archive_milestone_v2', { p_milestone_id })`. Mapear `code` → mensagens amigáveis. **Crucial:** extrair `error.message || error.details || error.hint || error.code` antes de re-lançar como `Error`, eliminando o "erro desconhecido" para qualquer falha futura.

### 3. Atualização de memória

`mem://features/projects/milestone-permissions-row-aware` registra `archive_milestone_v2` como caminho canônico de remoção (alinhado ao padrão v1.8).

## Arquivos afetados

- nova migração: `archive_milestone_v2` + GRANT
- `src/modules/projects/hooks/useMilestoneMutations.ts` — refator do `useSoftDeleteMilestone`
- `.lovable/memory/features/projects/milestone-permissions-row-aware.md` — anotar RPC canônica

## Resultado esperado

- Uriel e Victorio conseguem remover o milestone "Teste 3".
- Erros de banco passam a mostrar a mensagem real do PostgreSQL.
- Quando legitimamente bloqueado, toast mostra exatamente o motivo (FORBIDDEN amigável).