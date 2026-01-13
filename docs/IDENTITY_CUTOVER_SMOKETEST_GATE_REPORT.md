# Identity Cutover v3.0 — Smoke Test Gate Report

**Data**: _______________  
**Executor**: _______________  
**Status**: ⬜ PENDING | ✅ GO | ❌ NO-GO

---

## Pré-Requisitos

Antes de executar os smoke tests, confirme:

- [x] Migration Phase 0.5 aplicada (storage policy, 2 funções profile-first, 5 canary, 2 views)
- [ ] Build frontend sem erros
- [ ] Edge functions deployadas

---

## Verificações Técnicas

### 1. Storage Policy migrada

```sql
SELECT polname, polcmd, pg_get_expr(polwithcheck, polrelid) AS with_check,
       pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy 
WHERE polrelid = 'storage.objects'::regclass
  AND polname LIKE '%ticket%';
```

**Resultado esperado**: Policy usa `my_profile_id()` e `deleted_at IS NULL`

**Resultado obtido**: _______________

---

### 2. Funções profile-first criadas

```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('profile_has_bu_access', 'get_profile_default_bu')
  AND pronamespace = 'public'::regnamespace;
```

**Resultado esperado**: 2 linhas

**Resultado obtido**: _______________

---

### 3. Canary flag existe e é boolean false

```sql
SELECT key, value, jsonb_typeof(value) 
FROM system_settings 
WHERE key = 'identity_cutover_strict';
```

**Resultado esperado**: `identity_cutover_strict | false | boolean`

**Resultado obtido**: _______________

---

### 4. Zero policies com bu_user_memberships.user_id (exceto storage migrado)

```sql
SELECT COUNT(*) AS legacy_policies
FROM pg_policies 
WHERE qual::text LIKE '%bu_user_memberships%' 
  AND qual::text LIKE '%user_id%'
  AND qual::text NOT LIKE '%profile_id%'
  AND qual::text NOT LIKE '%my_profile_id%';
```

**Resultado esperado**: 0

**Resultado obtido**: _______________

---

### 5. Zero views com bu_user_memberships.user_id

```sql
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition LIKE '%bu_user_memberships%' 
  AND definition LIKE '%.user_id%'
  AND definition NOT LIKE '%profile_id%';
```

**Resultado esperado**: 0 linhas

**Resultado obtido**: _______________

---

## Testes Funcionais (Smoke Tests)

Execute cada teste e marque o resultado:

| # | Teste | Passos | Esperado | ✅/❌ | Observação |
|---|-------|--------|----------|-------|------------|
| 1 | **Login** | Acessar /auth, inserir email, receber OTP Code | Login bem-sucedido | ⬜ | |
| 2 | **Seleção de BU** | Após login, selecionar uma BU | Redireciona para dashboard | ⬜ | |
| 3 | **Trocar BU** | No menu, trocar para outra BU | Troca sem erros | ⬜ | |
| 4 | **OKRs - Criar Objetivo** | OKRs > Novo Objetivo | Objetivo criado | ⬜ | |
| 5 | **OKRs - Criar KR** | Adicionar KR ao objetivo | KR criado | ⬜ | |
| 6 | **OKRs - Check-in** | Fazer check-in em KR | Check-in registrado | ⬜ | |
| 7 | **Tickets - Criar** | Central > Novo Ticket | Ticket criado | ⬜ | |
| 8 | **Tickets - Anexar arquivo** | Anexar arquivo ao ticket | Upload bem-sucedido | ⬜ | |
| 9 | **Tickets - Deletar anexo** | Deletar o anexo enviado | Anexo removido sem erro 403 | ⬜ | |
| 10 | **Assets - Criar item** | Ativos > Novo Item | Item criado | ⬜ | |
| 11 | **Permissions - Ver página** | Configurações > Permissões | Página carrega | ⬜ | |
| 12 | **Permissions - Aplicar template** | Aplicar template a usuário | Template aplicado | ⬜ | |

---

## Verificação de Erros

### Console do navegador

```
[ ] Nenhum erro RLS/403
[ ] Nenhum erro de função deprecated [CUTOVER]
[ ] Nenhum erro de TypeScript runtime
```

**Erros encontrados** (se houver):
```
(copie aqui os erros)
```

---

## Resumo

| Categoria | Total | Pass | Fail |
|-----------|-------|------|------|
| Verificações Técnicas | 5 | __ | __ |
| Smoke Tests Funcionais | 12 | __ | __ |
| Erros de Console | - | ⬜ Zero | ⬜ Encontrados |

---

## Decisão GO/NO-GO

### Critérios para GO

- [ ] 5/5 verificações técnicas passaram
- [ ] 12/12 smoke tests passaram
- [ ] 0 erros de console relacionados a RLS/identity

### Decisão Final

| Decisão | Data/Hora | Assinatura |
|---------|-----------|------------|
| ⬜ **GO** - Prosseguir para Fase 1 (ativar canary flag) | | |
| ⬜ **NO-GO** - Corrigir issues antes de prosseguir | | |

---

## Próximos Passos (se GO)

1. **Ativar canary flag**:
   ```sql
   UPDATE system_settings 
   SET value = 'true'::jsonb 
   WHERE key = 'identity_cutover_strict';
   ```

2. **Executar gate script**:
   ```bash
   ./scripts/gate-drop-user-id.sh
   ```

3. **Se gate pass**: Prosseguir para DROP COLUMN bu_user_memberships.user_id

---

## Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-01-09 | Criação inicial (substituindo período 48h por smoke test gate) |
