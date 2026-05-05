/**
 * KpiLeaderInsightsPanel — Painel somente-leitura que consolida o que cada
 * líder respondeu no Pré-MBR para um KPI específico.
 *
 * Exibe, agrupado por time:
 *   - Justificativa (impactAssessment / kpiJustifications)
 *   - Razão de ausência de dados (kpiNoDataReasons), quando aplicável
 *   - Planos de ação registrados como `decisions` com `metadata.kpi_id`
 *
 * Agnóstico de wizardType — recebe entradas já derivadas pelo hook
 * `useMbrKpiLeaderInsights`. Reutilizável em qualquer rito que precise
 * reapresentar respostas estruturadas dos líderes por KPI.
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, AlertTriangle, Lightbulb, Users } from 'lucide-react';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

export interface KpiLeaderInsightEntry {
  teamId: string;
  teamName: string;
  justification?: string;
  noDataReason?: string;
  decisions: TeamCheckinDecision[];
}

export interface KpiLeaderInsightsPanelProps {
  kpiId: string;
  entriesByTeam: KpiLeaderInsightEntry[];
  /** Mês de referência exibido no empty-state. */
  referenceMonth?: string | null;
}

function hasContent(e: KpiLeaderInsightEntry): boolean {
  return (
    (e.justification?.trim().length ?? 0) > 0 ||
    (e.noDataReason?.trim().length ?? 0) > 0 ||
    e.decisions.length > 0
  );
}

export const KpiLeaderInsightsPanel = memo(function KpiLeaderInsightsPanel({
  entriesByTeam,
  referenceMonth,
}: KpiLeaderInsightsPanelProps) {
  const filled = entriesByTeam.filter(hasContent);

  if (filled.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Users className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs">
              Nenhum líder registrou justificativa ou plano de ação para este
              KPI no Pré-MBR
              {referenceMonth ? ` de ${referenceMonth}` : ''}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-foreground">
            Resposta dos líderes no Pré-MBR
          </h4>
          <Badge variant="outline" className="text-[10px] h-5">
            {filled.length} time{filled.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="space-y-4">
          {filled.map((entry) => (
            <div
              key={entry.teamId}
              className="rounded-lg border bg-muted/20 p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  {entry.teamName}
                </span>
              </div>

              {entry.noDataReason?.trim() && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Por que está sem dados
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {entry.noDataReason}
                  </p>
                </div>
              )}

              {entry.justification?.trim() && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Justificativa
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {entry.justification}
                  </p>
                </div>
              )}

              {entry.decisions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" />
                    Plano de ação ({entry.decisions.length})
                  </p>
                  <ul className="space-y-1.5">
                    {entry.decisions.map((d) => (
                      <li
                        key={d.id}
                        className="text-sm text-foreground rounded-md border bg-background p-2 whitespace-pre-wrap"
                      >
                        {d.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
