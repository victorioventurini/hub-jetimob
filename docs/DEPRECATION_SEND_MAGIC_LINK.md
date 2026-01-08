# Deprecação: send-magic-link Edge Function

**Data de Depreciação:** 2026-01-08  
**Status:** 🟡 DEPRECATED (Instrumentada)  
**Função Substituta:** `request-magic-link`

---

## 1. Motivo da Depreciação

A função `send-magic-link` foi substituída por `request-magic-link` que possui:

1. **Geração segura do magic link** via Supabase Admin API
2. **Validação de domínio de email** integrada
3. **Melhor estrutura de logs** e tratamento de erros
4. **Template de email atualizado** com displayName

A função antiga recebia o `magicLink` já pronto no payload (possível vulnerabilidade), enquanto a nova gera o link internamente.

---

## 2. Função Substituta Oficial

### `request-magic-link`

**Localização:** `supabase/functions/request-magic-link/index.ts`

**Chamador:** `src/hooks/useAuth.tsx:134`

```typescript
const response = await supabase.functions.invoke('request-magic-link', {
  body: { email, redirectTo: redirectUrl },
});
```

**Diferenças:**

| Aspecto | `send-magic-link` (OLD) | `request-magic-link` (NEW) |
|---------|-------------------------|----------------------------|
| Magic Link | Recebido via payload | Gerado internamente |
| Segurança | Menor | Maior |
| Admin API | Não usa | Usa `auth.admin.generateLink` |
| Status | DEPRECATED | ACTIVE |

---

## 3. Como Verificar Se Ainda Há Uso

### 3.1 Logs de Depreciação

A função instrumentada registra todas as chamadas em `app_error_logs`:

```sql
SELECT * FROM app_error_logs 
WHERE error_code = 'DEPRECATED_FUNCTION' 
  AND metadata->>'function_name' = 'send-magic-link'
ORDER BY created_at DESC;
```

### 3.2 Busca no Codebase

```bash
# Buscar por chamadas
grep -r "send-magic-link" src/ supabase/
grep -r "functions.invoke.*send-magic-link" src/
```

### 3.3 Edge Function Logs

Acessar os logs da Edge Function no Supabase Dashboard:
- Filtrar por `send-magic-link`
- Verificar se há chamadas nos últimos 14 dias

---

## 4. Comportamento Atual da Função

A função `send-magic-link` foi modificada para:

1. **Logar todas as chamadas** em `app_error_logs`
2. **Retornar HTTP 410 Gone** com mensagem clara
3. **Não executar a lógica original** (envio de email)

```json
// Response atual
{
  "error": "Esta função foi descontinuada. Use request-magic-link.",
  "deprecated": true,
  "deprecated_since": "2026-01-08",
  "replacement": "request-magic-link",
  "status": "DEPRECATED"
}
```

---

## 5. Quando Remover (Condição Objetiva)

A função pode ser **removida definitivamente** quando:

✅ **14 dias consecutivos** sem registros em:
```sql
SELECT COUNT(*) FROM app_error_logs 
WHERE error_code = 'DEPRECATED_FUNCTION' 
  AND metadata->>'function_name' = 'send-magic-link'
  AND created_at > NOW() - INTERVAL '14 days';
-- Resultado deve ser 0
```

✅ **QA de login** funcionando normalmente

✅ **Nenhuma referência** no codebase

---

## 6. Checklist de Remoção (Wave 3)

Quando as condições acima forem atendidas:

- [ ] Re-auditar codebase: `grep -r "send-magic-link" .`
- [ ] Confirmar 0 logs de depreciação nos últimos 14 dias
- [ ] Remover de `supabase/config.toml`
- [ ] Deletar `supabase/functions/send-magic-link/`
- [ ] Atualizar `docs/EDGE_FUNCTIONS_AUDIT_REPORT.md`
- [ ] Rodar QA completo de login
- [ ] Arquivar este documento

---

## 7. Referências

- [EDGE_FUNCTIONS_AUDIT_REPORT.md](./EDGE_FUNCTIONS_AUDIT_REPORT.md)
- [CODEBASE_HYGIENE_ROADMAP.md](./CODEBASE_HYGIENE_ROADMAP.md)
- [TECHNICAL_CONTEXT_REGISTRY.md](./TECHNICAL_CONTEXT_REGISTRY.md#8-edge-functions)
