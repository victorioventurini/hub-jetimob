

## Diagnóstico — Histórico de Rituais vazio

### Pre-Checklist Concluído

| Documento | Versão | Consultado |
|-----------|--------|------------|
| TCR | v3.9.0 | Sim (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`) |
| IDENTITY_CONVENTION | v2.2.0 | Sim (`docs/canonical/IDENTITY_CONVENTION.md`) |
| PERMISSIONS_AND_RBAC_MODEL | v1.5.0 | Sim (`docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`) |
| DATA_MODEL_REGISTRY | v1.2.2 | Sim (`docs/canonical/DATA_MODEL_REGISTRY.md`) |
| BU_SCOPED_SUPABASE_RULES | v4.1.0 | Sim (contexto adicional) |
| DEVELOPMENT_STANDARDS | — | Sim (via TCR links) |
| Schema `profiles` (types.ts) | — | Sim — **confirmado: não existe coluna `full_name`** |

### Causa Raiz

**Arquivo:** `src/modules/okrs/hooks/useRitualHistory.ts`, linha 71

A query `HISTORY_FIELDS` referencia `profiles.full_name`, mas essa coluna **não existe** na tabela `profiles`. As colunas disponíveis são `display_name`, `first_name` e `last_name` (confirmado via `src/integrations/supabase/types.ts` linhas 6624-6629).

O PostgREST retorna erro 400 na tentativa de selecionar coluna inexistente. O `throw error` (linha 116) faz o React Query tratar como falha, resultando em lista vazia na UI.

### Correção

**Um único arquivo:** `src/modules/okrs/hooks/useRitualHistory.ts`

1. **Linha 71** — Trocar `full_name` por `display_name, first_name, last_name`:
```
profiles!okr_wizard_sessions_started_by_fkey ( display_name, first_name, last_name )
```

2. **Linhas 126, 162** — Atualizar mapeamento (2 ocorrências):
```typescript
// De:
startedByName: row.profiles?.full_name ?? null,

// Para:
startedByName: row.profiles?.display_name
  || [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ')
  || null,
```

### Conformidade

| Regra | Status |
|-------|--------|
| Proibido `select('*')` | OK — campos explícitos |
| BU-scoped client (`useOptionalBuScopedSupabase`) | OK |
| `.eq('bu_id', currentBu.id)` | OK |
| `enabled: !!currentBu?.id` | OK |
| Query keys centralizadas | OK |
| Identity convention (`started_by` = `profiles.id`) | OK |
| Nenhum componente duplicado | OK — correção in-place |
| Sem import de `@/integrations/supabase/client` | OK |

