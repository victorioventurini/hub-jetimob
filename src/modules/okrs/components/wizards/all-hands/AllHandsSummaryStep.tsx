/**
 * AllHandsSummaryStep — Step 1 do All Hands.
 *
 * READ-ONLY: apresenta o sumário executivo do MBR fechado do mês de
 * referência (resumo, decisões, KPIs críticos) para servir de roteiro
 * de comunicação na reunião All Hands.
 *
 * NÃO duplica componentes do MBR — consome o snapshot do MBR e exibe
 * em formato condensado próprio para o público amplo da BU.
 */

import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ListChecks, AlertTriangle, FileText, Calendar, Megaphone } from 'lucide-react';
import { WizardStepFooter, WizardStepScaffold, WizardStepHeader, ReferenceMonthPicker } from '@/modules/okrs/components/wizards/shared';
import type { MbrDraftData } from '@/modules/okrs/types/wizard';

export interface AllHandsSummaryStepProps {
  referenceMonth: string;
  onReferenceMonthChange: (next: string) => void;
  mbrPayload: MbrDraftData | null;
  mbrCompletedAt: string | null;
  onContinue: () => void;
}

function formatMonthLabel(referenceMonth: string): string {
  try {
    const [y, m] = referenceMonth.split('-').map(Number);
    return format(new Date(y, (m ?? 1) - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return referenceMonth;
  }
}

const AllHandsSummaryStepInner = ({
  referenceMonth,
  onReferenceMonthChange,
  mbrPayload,
  mbrCompletedAt,
  onContinue,
}: AllHandsSummaryStepProps) => {
  const summary = mbrPayload?.panoramaCuration?.summary?.trim() ?? '';
  const decisions = mbrPayload?.decisions ?? [];
  const kpiCritical = (mbrPayload?.kpiSnapshots ?? []).filter(
    (k) => k.ragStatus === 'red' || k.ragStatus === 'critical' || k.ragStatus === 'amber' || k.ragStatus === 'attention',
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Megaphone}
          title="Sumário do mês"
          description="Panorama, decisões e destaques"
          variant="primary"
        />
      }
      footer={
        <WizardStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar para KPI Gate"
          primaryDisabled={!mbrPayload}
          showBack={false}
        />
      }
    >
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border/60 bg-card p-3">
          <label className="text-sm font-medium text-foreground">Mês de referência</label>
          <ReferenceMonthPicker value={referenceMonth} onChange={onReferenceMonthChange} className="w-[220px]" />
          <span className="text-xs text-muted-foreground">
            O All Hands consome o último MBR concluído deste mês.
          </span>
        </div>

        {!mbrPayload && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                MBR não encontrado para {formatMonthLabel(referenceMonth)}
              </CardTitle>
              <CardDescription>
                Para conduzir o All Hands, primeiro finalize o MBR do mês de referência. O conteúdo dos
                steps (KPI Gate, OKRs Org) é hidratado a partir desse MBR.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {mbrPayload && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  MBR de {formatMonthLabel(referenceMonth)}
                </CardTitle>
                <CardDescription>
                  {mbrCompletedAt
                    ? `Concluído em ${format(new Date(mbrCompletedAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}`
                    : 'Snapshot do MBR fechado'}
                </CardDescription>
              </CardHeader>
              {summary && (
                <CardContent>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      <FileText className="h-3.5 w-3.5" /> Resumo executivo
                    </div>
                    <p className="text-sm whitespace-pre-line leading-relaxed">{summary}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            {decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    Decisões do mês
                    <Badge variant="secondary" className="ml-1">{decisions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {decisions.map((d) => (
                      <li key={d.id} className="rounded border bg-card p-2.5 text-sm">
                        <div className="font-medium break-words">{d.text}</div>
                        {d.category && (
                          <div className="text-xs text-muted-foreground mt-0.5">{d.category}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {kpiCritical.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    KPIs em alerta
                    <Badge variant="secondary" className="ml-1">{kpiCritical.length}</Badge>
                  </CardTitle>
                  <CardDescription>Indicadores que merecem comunicação clara à BU.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-3" />
                  <ul className="space-y-1.5">
                    {kpiCritical.map((k) => (
                      <li key={k.kpiId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{k.name ?? k.kpiId}</span>
                        <Badge variant={k.ragStatus === 'red' || k.ragStatus === 'critical' ? 'destructive' : 'secondary'}>
                          {k.ragStatus}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </WizardStepScaffold>
  );
};

export const AllHandsSummaryStep = memo(AllHandsSummaryStepInner);
