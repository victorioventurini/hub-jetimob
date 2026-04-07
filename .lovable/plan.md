

## Plano: Auto-expiração do bypass DEV_FORCE_QBR_AVAILABLE

### Abordagem
Em vez de depender de um lembrete manual ou job externo, transformar a flag hardcoded em uma **verificação por data** diretamente no código. Isso é simples, confiável e auto-contido.

### Mudança

| Arquivo | O que muda |
|---------|-----------|
| `src/modules/okrs/hooks/useRitualAvailability.ts` | Substituir `const DEV_FORCE_QBR_AVAILABLE = true` por `const DEV_FORCE_QBR_AVAILABLE = new Date() < new Date('2026-04-15')` |

A flag se desativa automaticamente em 15/abr/2026 sem necessidade de deploy ou intervenção manual. Após essa data, o comportamento padrão de janelas temporais é restaurado.

