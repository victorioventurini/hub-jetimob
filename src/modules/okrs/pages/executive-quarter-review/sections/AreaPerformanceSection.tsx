import { parseISO } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { LastCheckinBadge } from '@/modules/okrs/components/wizards/shared/LastCheckinBadge';
import { KrStateInline } from '@/modules/okrs/components/insights';
import { calculateKrState } from '@/modules/okrs/hooks';
import { calculateProgress } from '@/modules/okrs/types';
import { TeamKrLinkedDetails } from '../components/TeamKrLinkedDetails';
import { TeamUnlinkedProjects } from '../components/TeamUnlinkedProjects';
import type { AreaGroup, QuarterCycle } from '../types';

interface Props {
  groupedAreaData: AreaGroup[];
  selectedCycle: QuarterCycle;
}

export function AreaPerformanceSection({ groupedAreaData, selectedCycle }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Desempenho por área</h2>
      <Accordion type="multiple" className="w-full">
        {groupedAreaData.map((area) => (
          <AccordionItem key={area.areaName} value={area.areaName}>
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span>{area.areaName}</span>
                <Badge variant="outline">Score {area.healthScoreAvg}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {area.teams.map((team) => {
                  const allKrIds = team.objectives.flatMap((o) =>
                    o.krs.map((kr) => kr.id),
                  );

                  return (
                    <Card key={team.teamId}>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{team.teamName}</CardTitle>
                            <CardDescription>
                              Progresso médio das KRs: {team.avgProgress}%
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{team.healthStatus}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {team.objectives.map((objectiveStat) => (
                          <div
                            key={objectiveStat.objective.id}
                            className="rounded-lg border p-3 space-y-2"
                          >
                            <p className="font-medium">{objectiveStat.objective.title}</p>
                            {objectiveStat.krs.map((kr) => {
                              const progress = calculateProgress(
                                Number(kr.baseline) || 0,
                                Number(kr.current_value) || 0,
                                Number(kr.target) || 0,
                                (kr.direction || 'up') as 'up' | 'down',
                              );
                              const daysSinceCheckin = kr.last_checkin_at
                                ? Math.max(
                                    0,
                                    Math.floor(
                                      (Date.now() -
                                        parseISO(kr.last_checkin_at).getTime()) /
                                        (1000 * 60 * 60 * 24),
                                    ),
                                  )
                                : 999;
                              const state = calculateKrState({
                                progress,
                                status: kr.status,
                                daysSinceCheckin,
                                cycleEnded: selectedCycle.status === 'closed',
                              });

                              return (
                                <div
                                  key={kr.id}
                                  className="rounded-md border bg-muted/20 p-3"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-sm font-medium truncate">
                                      {kr.title}
                                    </p>
                                    <KrStateInline state={state} />
                                  </div>
                                  <OkrProgressBar
                                    baseline={Number(kr.baseline) || 0}
                                    current={Number(kr.current_value) || 0}
                                    target={Number(kr.target) || 0}
                                    direction={(kr.direction || 'up') as 'up' | 'down'}
                                    status={(kr.status || 'not_started') as any}
                                    unit={kr.unit || '%'}
                                  />
                                  <div className="mt-2">
                                    <LastCheckinBadge
                                      lastCompletedAt={kr.last_checkin_at}
                                    />
                                  </div>
                                  <TeamKrLinkedDetails krId={kr.id} />
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        <TeamUnlinkedProjects teamId={team.teamId} krIds={allKrIds} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
