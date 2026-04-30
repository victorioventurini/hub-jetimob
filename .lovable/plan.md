# Onda 7 — Auditorias & cleanup seguro (CONCLUÍDA 2026-04-30)

## Resultado consolidado
- **52 → 47** ocorrências `@deprecated` (-5: campos legacy de AnalysisSuggestedAction).
- 1 entregável documental: `docs/audits/KPI_FREQUENCY_SUNSET_PLAN.md`.
- 1 correção de memory (Permissions V1 já estava sunsetado no DB).

## Frente 1 — Analysis legacy shapes (CONCLUÍDA)
Validado em produção: 0/4 registros usam shape legacy. Removidos 5 campos `@deprecated`
+ fallbacks em `AnalysisResultPage.tsx`. Teste atualizado.

## Frente 2 — Permissions V1 sunset prep (CONCLUÍDA — sem ação)
Tabelas V1 já dropadas. Zero `@deprecated` no módulo. Memory corrigido.

## Frente 3 — KPI frequency audit + plano (CONCLUÍDA — documental)
Plano faseado em 4 etapas. DB 100% migrado (31/31). Pronto para Onda 8 executar Fase 1
(refactor frontend de 8 consumidores) sem riscos como na Onda 6 Frente A revertida.

## Próxima onda recomendada (Onda 8)
- **Executar Fase 1 do KPI frequency plan**: refactor de 8 arquivos frontend para usar
  `update_frequency`/`consolidation_frequency` diretamente.
- Após 1 semana de observação → Fases 2-4 (drop DB + cleanup helpers).

## Bloqueados / próximas ondas (mantidos)
- **Onda 4 snapshots** (16 campos): observação até 2026-07-30.
- **`qbr-pre-summary.zombieCandidates`**: migração coordenada de 11 pontos.

Detalhes em `mem://standards/deprecated-cleanup-log` e `docs/audits/KPI_FREQUENCY_SUNSET_PLAN.md`.
