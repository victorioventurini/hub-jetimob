# Relatório de Depreciação: send-magic-link

**Data:** 2026-01-08  
**Status:** ✅ DEPRECATED COM SUCESSO  
**Executor:** AI Assistant

---

## 1. Resultado da Auditoria

### 1.1 Busca no Codebase

| Busca | Resultados | Status |
|-------|-----------|--------|
| `"send-magic-link"` no frontend | 0 | ✅ |
| `"/functions/v1/send-magic-link"` | 0 | ✅ |
| `functions.invoke('send-magic-link')` | 0 | ✅ |
| Referências em `useAuth.tsx` | 0 | ✅ |

**Conclusão:** Nenhuma chamada ativa encontrada no código.

### 1.2 Função Atual de Autenticação

O fluxo de magic link usa exclusivamente `request-magic-link`:

```typescript
// src/hooks/useAuth.tsx:134
const response = await supabase.functions.invoke('request-magic-link', {
  body: { email, redirectTo: redirectUrl },
});
```

---

## 2. Instrumentação Implementada

### 2.1 Logging de Chamadas

Todas as chamadas à função deprecated são registradas em `app_error_logs`:

```sql
-- Inserção automática
INSERT INTO app_error_logs (
  module,
  action,
  error_code,
  message,
  metadata
) VALUES (
  'edge_functions',
  'deprecated_call',
  'DEPRECATED_FUNCTION',
  'send-magic-link foi chamada - esta função está deprecated',
  {
    "function_name": "send-magic-link",
    "deprecated_since": "2026-01-08",
    "replacement": "request-magic-link",
    "called_at": "...",
    "email_domain": "..."
  }
);
```

### 2.2 Response HTTP 410 Gone

A função agora retorna:

```json
{
  "error": "Esta função foi descontinuada. Use request-magic-link.",
  "deprecated": true,
  "deprecated_since": "2026-01-08",
  "replacement": "request-magic-link",
  "status": "DEPRECATED"
}
```

### 2.3 Console Warning

```
[DEPRECATED] send-magic-link chamada - use request-magic-link
```

---

## 3. Mudanças Realizadas

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-magic-link/index.ts` | Substituído por versão instrumentada |
| `supabase/config.toml` | Mantido (função ainda registrada para logging) |

### Código Instrumentado

```typescript
/**
 * @deprecated Esta função foi substituída por `request-magic-link`.
 * Mantida apenas para instrumentação e detecção de uso residual.
 * Será removida após 14 dias sem chamadas.
 */

// Loga todas as chamadas em app_error_logs
// Retorna HTTP 410 Gone
```

---

## 4. Condição de Remoção

```sql
-- Executar após 14 dias
SELECT COUNT(*) FROM app_error_logs 
WHERE error_code = 'DEPRECATED_FUNCTION' 
  AND metadata->>'function_name' = 'send-magic-link'
  AND created_at > NOW() - INTERVAL '14 days';

-- Se resultado = 0, pode remover
```

**Data mais cedo para remoção:** 2026-01-22

---

## 5. QA de Login

| Teste | Status |
|-------|--------|
| Envio de magic link | ✅ PASS (usa `request-magic-link`) |
| Email chega corretamente | ✅ PASS |
| Click no link autentica | ✅ PASS |
| Validação de domínio funciona | ✅ PASS |

---

## 6. Documentação Atualizada

| Documento | Status |
|-----------|--------|
| `docs/DEPRECATION_SEND_MAGIC_LINK.md` | ✅ Criado |
| `docs/EDGE_FUNCTIONS_AUDIT_REPORT.md` | ✅ Já marcava como LEGACY |
| `docs/CODEBASE_HYGIENE_ROADMAP.md` | ✅ Já agendava remoção |

---

## 7. Resumo Final

| Item | Status |
|------|--------|
| Auditoria de chamadas | ✅ 0 chamadas ativas |
| Instrumentação de logs | ✅ Implementada |
| Response 410 Gone | ✅ Implementado |
| Documentação | ✅ Completa |
| QA Login | ✅ PASS |
| **RESULTADO** | **✅ DEPRECATED COM SUCESSO** |

---

## 8. Próximos Passos

1. Monitorar logs por 14 dias
2. Se 0 chamadas → executar remoção (Wave 3)
3. Arquivar documentação
