#!/usr/bin/env bash
# scripts/check-no-kpi-frequency.sh
#
# CI guard — Onda 8 / KPI v3.0.0
# Bloqueia novos usos de `kpi.frequency` (legacy) em código de aplicação.
#
# Permitidos (allowlist):
#   - src/modules/kpis/utils/frequency.ts          (helpers de migração)
#   - src/modules/kpis/types.ts                    (tipo @deprecated)
#   - src/modules/kpis/components/KpiActionsMenu.tsx (mapping para KpiMetric NOT NULL)
#   - src/modules/teams/hooks/useTeamKpisGrouped.ts  (pass-through KpiMetric)
#   - **/__tests__/**                              (testes legacy)
#   - scripts/**                                   (auditoria)
#   - supabase/**                                  (DB / triggers)
#
# Uso: bash scripts/check-no-kpi-frequency.sh
set -euo pipefail

PATTERN='kpi\.frequency|kpi\?\.frequency'
ALLOW=(
  'src/modules/kpis/utils/frequency.ts'
  'src/modules/kpis/types.ts'
  'src/modules/kpis/components/KpiActionsMenu.tsx'
  'src/modules/teams/hooks/useTeamKpisGrouped.ts'
)

FOUND=$(rg -n "$PATTERN" src/ \
  --type ts --type tsx \
  -g '!**/__tests__/**' \
  -g '!**/*.test.ts' \
  -g '!**/*.test.tsx' \
  | rg -v 'consolidation_frequency|update_frequency|valueFrequencyToLegacy|frequency_migration' || true)

# Filtrar allowlist
for path in "${ALLOW[@]}"; do
  FOUND=$(echo "$FOUND" | rg -v "^$path:" || true)
done

if [ -n "$FOUND" ]; then
  echo "❌ Uso proibido de kpi.frequency (legacy v2). Use update_frequency ou consolidation_frequency."
  echo ""
  echo "$FOUND"
  echo ""
  echo "Ver: docs/audits/KPI_FREQUENCY_SUNSET_PLAN.md"
  exit 1
fi

echo "✅ Nenhum uso novo de kpi.frequency detectado."
