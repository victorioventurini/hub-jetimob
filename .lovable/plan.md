

## Plano: Bypass temporário de janelas QBR para teste

### Problema
As janelas QBR são sequenciais e mutuamente exclusivas:
- **qbr-pre / qbr-pre-clevel**: planning_date → retro_date - 2 dias (31/mar → 04/abr) — **EXPIRADO**
- **qbr-meeting**: retro_date → +2du (06/abr → 08/abr) — **ABERTO**
- **qbr-post**: retro_date → +5du (06/abr → 13/abr) — **ABERTO**

Não é possível abrir todos simultaneamente via datas do ciclo.

### Solução
Adicionar flag de bypass temporário no `useRitualAvailability` que força `isAvailable = true` para todos os ritos QBR quando ativado.

### Arquivo impactado

| Arquivo | Mudança |
|---------|---------|
| `src/modules/okrs/hooks/useRitualAvailability.ts` | Adicionar constante `DEV_FORCE_QBR_AVAILABLE = true` no topo do arquivo. No início do `useMemo`, se a flag estiver ativa e o wizardType for um dos QBR types (`qbr-pre`, `qbr-pre-clevel`, `qbr-meeting`, `qbr-post`), retornar imediatamente `{ isAvailable: true, reason: 'available' }` |

### Nota
- Flag hardcoded — sem variável de ambiente (Vite não recarrega .env sem rebuild)
- Remover o bypass após os testes (posso lembrar na próxima interação)
- Também inclui fix dos build errors do `MbrPage.tsx` (mover `scorecardMetrics` e `orgObjView` para o escopo correto do componente)

