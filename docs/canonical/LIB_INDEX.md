# Frontend — `src/lib/` Reorganization

> Implementação de FRONTEND_ARCHITECTURE.md sem mover arquivos físicos (preserva todos os imports existentes).

## Estrutura

```
src/lib/
├── domain/index.ts   ← regras de negócio (parser de IA, identidade, links)
├── ui/index.ts       ← apresentação (cores semânticas, dialogs, mentions)
├── pure/index.ts     ← utilitários puros (logger, retry, fetch guard)
├── queryKeys/        ← já era módulo isolado
├── analytics/        ← já era módulo isolado
└── *.ts              ← arquivos físicos preservados (compatibilidade)
```

## Convenção para novos imports

| Em vez de... | Use... |
|--------------|--------|
| `@/lib/aiResponseParser` | `@/lib/domain` |
| `@/lib/colors` | `@/lib/ui` |
| `@/lib/logger` | `@/lib/pure` |

Imports legados (`@/lib/<arquivo>`) continuam funcionando — não há breaking change.

## Por que `pure/` e não `utils/`?

`@/lib/utils` resolve para o arquivo `src/lib/utils.ts` (cn, clsx). Renomear para `pure/` evita ambiguidade.

## Próxima onda (futura, opcional)

Mover fisicamente os arquivos para suas pastas e remover os re-exports. Demanda atualizar centenas de imports em massa.
