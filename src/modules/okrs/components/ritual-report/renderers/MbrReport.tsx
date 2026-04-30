/**
 * MbrReport — Onda 4 Fase 2: nomes (Time/Objetivo/KPI/Profile) via
 * useEntityLookup com fallback ao snapshot legado.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Target, Users, CheckCircle2, CalendarDays } from 'lucide-react';
import { ReportSection, RagBadge, formatValue } from './shared';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';
import { cn } from '@/lib/utils';

export function MbrReport({ data }: { data: Record<string, any> }) {
  const referenceMonth = data.referenceMonth || '';
  const kpiSnapshots = Array.isArray(data.kpiSnapshots) ? data.kpiSnapshots : [];
  const teamOkrSnapshots = Array.isArray(data.teamOkrSnapshots) ? data.teamOkrSnapshots : [];
  const orgOkrSnapshots = Array.isArray(data.orgOkrSnapshots) ? data.orgOkrSnapshots : [];
  const checklist = data.checklist || {};
  const qbrFollowUpItems = Array.isArray(data.qbrFollowUpItems) ? data.qbrFollowUpItems : [];

  const teamIds: string[] = teamOkrSnapshots.map((t: any) => t?.teamId).filter(Boolean);
  const teamObjIds: string[] = teamOkrSnapshots
    .flatMap((t: any) => (Array.isArray(t?.objectives) ? t.objectives.map((o: any) => o?.objectiveId) : []))
    .filter(Boolean);
  const orgObjIds: string[] = orgOkrSnapshots.map((o: any) => o?.objectiveId).filter(Boolean);
  const kpiIds: string[] = kpiSnapshots.map((k: any) => k?.kpiId).filter(Boolean);
  const profileIds: string[] = qbrFollowUpItems.map((it: any) => it?.owner?.id).filter(Boolean);

  const lookups = useEntityLookup({
    teamIds,
    teamObjectiveIds: teamObjIds,
    orgObjectiveIds: orgObjIds,
    kpiIds,
    profileIds,
  });

  return (
    <div className="space-y-4">
      {/* Reference Month */}
      {referenceMonth && (
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Mês de referência:</span>
          <span className="font-medium">{referenceMonth}</span>
        </div>
      )}

      {/* KPI Snapshots */}
      {kpiSnapshots.length > 0 && (
        <ReportSection title={`KPIs (${kpiSnapshots.length})`} icon={<BarChart3 className="h-4 w-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead className="w-24 text-right">Valor</TableHead>
                <TableHead className="w-24 text-right">Meta</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-16">Escopo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSnapshots.map((kpi: any, i: number) => (
                <TableRow key={kpi.kpiId || i}>
                  <TableCell className="text-sm">{resolveName(lookups.kpis, kpi.kpiId, kpi.name)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatValue(kpi.currentValue, kpi.unit)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatValue(kpi.target, kpi.unit)}
                  </TableCell>
                  <TableCell><RagBadge status={kpi.ragStatus} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{kpi.scope || '—'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>
      )}

      {/* Team OKR Snapshots */}
      {teamOkrSnapshots.length > 0 && (
        <ReportSection title={`Times revisados (${teamOkrSnapshots.length})`} icon={<Users className="h-4 w-4" />}>
          <div className="space-y-3">
            {teamOkrSnapshots.map((team: any, i: number) => (
              <div key={team.teamId || i} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{resolveName(lookups.teams, team.teamId, team.teamName)}</span>
                  <Badge variant="outline" className={cn('text-[10px]',
                    team.healthStatus === 'healthy' ? 'bg-status-green-muted text-status-green' :
                    team.healthStatus === 'attention' ? 'bg-status-amber-muted text-status-amber' :
                    'bg-destructive/10 text-destructive'
                  )}>
                    {team.healthStatus === 'healthy' ? 'Saudável' :
                     team.healthStatus === 'attention' ? 'Atenção' : 'Risco'}
                  </Badge>
                </div>
                {Array.isArray(team.objectives) && team.objectives.map((obj: any, j: number) => (
                  <div key={obj.objectiveId || j} className="pl-3 border-l-2 border-muted space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{resolveName(lookups.teamObjectives, obj.objectiveId, obj.title)}</span>
                      <span className="text-xs font-medium">{Math.round(obj.progress ?? 0)}%</span>
                    </div>
                    <Progress value={Math.min(obj.progress ?? 0, 100)} className="h-1.5" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Org OKR Snapshots */}
      {orgOkrSnapshots.length > 0 && (
        <ReportSection title={`OKRs Organizacionais (${orgOkrSnapshots.length})`} icon={<Target className="h-4 w-4" />}>
          <div className="space-y-2">
            {orgOkrSnapshots.map((obj: any, i: number) => (
              <div key={obj.objectiveId || i} className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium flex-1 truncate">{resolveName(lookups.orgObjectives, obj.objectiveId, obj.title)}</span>
                  <span className="text-xs font-medium">{Math.round(obj.progress ?? 0)}%</span>
                  <RagBadge status={obj.status} />
                </div>
                <Progress value={Math.min(obj.progress ?? 0, 100)} className="h-1.5" />
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Governance Checklist */}
      {Object.keys(checklist).length > 0 && (
        <ReportSection title="Checklist de governança" icon={<CheckCircle2 className="h-4 w-4" />}>
          <GovernanceChecklist checklist={checklist} />
        </ReportSection>
      )}

      {/* QBR Follow-up */}
      {qbrFollowUpItems.length > 0 && (
        <ReportSection title={`Follow-up QBR (${qbrFollowUpItems.length})`}>
          <div className="space-y-1.5">
            {qbrFollowUpItems.map((item: any) => {
              const ownerName = item.owner?.id
                ? resolveName(lookups.profiles, item.owner.id, item.owner.name, '')
                : (item.owner?.name ?? '');
              return (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <div className={cn('h-2 w-2 rounded-full shrink-0', item.resolved ? 'bg-status-green' : 'bg-status-amber')} />
                  <span className="flex-1">{item.text}</span>
                  {ownerName && (
                    <span className="text-xs text-muted-foreground">{ownerName}</span>
                  )}
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}
    </div>
  );
}

function GovernanceChecklist({ checklist }: { checklist: Record<string, boolean> }) {
  const items = [
    { key: 'strategicFocusClear', label: 'Foco estratégico claro' },
    { key: 'nextStepsHaveOwners', label: 'Próximos passos têm responsáveis' },
    { key: 'nonPrioritiesClear', label: 'Não-prioridades claras' },
    { key: 'communicateInAllHands', label: 'Comunicar em All-Hands' },
  ];

  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-2 text-sm">
          <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${checklist[item.key] ? 'bg-status-green text-white' : 'bg-muted'}`}>
            {checklist[item.key] && <CheckCircle2 className="h-3 w-3" />}
          </div>
          <span className={checklist[item.key] ? '' : 'text-muted-foreground'}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
