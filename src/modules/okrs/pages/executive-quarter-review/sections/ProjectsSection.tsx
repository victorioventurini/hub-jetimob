import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { MetricCard } from '../components/MetricCard';
import { getFallback } from '../helpers';

interface Props {
  projectsInCycle: any[];
  riskProjects: any[];
}

export function ProjectsSection({ projectsInCycle, riskProjects }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Projetos estratégicos</h2>
        <Button variant="outline" asChild>
          <Link to="/projects">Ver todos os projetos</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Ativos" value={String(projectsInCycle.length)} />
        <MetricCard
          title="No prazo"
          value={String(projectsInCycle.filter((p) => p.health === 'on_track').length)}
        />
        <MetricCard
          title="Em risco"
          value={String(projectsInCycle.filter((p) => p.health === 'at_risk').length)}
        />
        <MetricCard
          title="Atrasados"
          value={String(projectsInCycle.filter((p) => p.health === 'late').length)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projetos críticos do quarter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {riskProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem projetos em risco/atrasados neste quarter.
            </p>
          ) : (
            riskProjects.map((project) => {
              const nextMilestone = (project.milestones || [])
                .filter((m: any) => m.status !== 'completed' && !m.deleted_at)
                .sort((a: any, b: any) =>
                  (a.due_date || '9999').localeCompare(b.due_date || '9999'),
                )[0];

              return (
                <div key={project.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={project.owner?.photo_url || undefined} />
                            <AvatarFallback>
                              {getFallback(project.owner?.display_name || 'Owner')}
                            </AvatarFallback>
                          </Avatar>
                          {project.owner?.display_name || 'Sem owner'}
                        </span>
                        <span>•</span>
                        <span>
                          {project.teams.map((t: any) => t.team_name).join(', ') ||
                            'Sem time'}
                        </span>
                      </div>
                    </div>
                    <ProjectHealthBadge health={project.health} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.krs.map((kr: any) => (
                      <Badge key={kr.key_result_id} variant="outline" className="text-xs">
                        {kr.kr_title}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-2">
                    <ProjectProgressBar
                      total={project.milestones_total}
                      done={project.milestones_done}
                      pct={project.completion_pct}
                      showPct
                    />
                  </div>

                  {nextMilestone ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Próximo milestone: {nextMilestone.name} ·{' '}
                      {nextMilestone.due_date
                        ? format(parseISO(nextMilestone.due_date), 'dd/MM/yyyy')
                        : 'sem data'}
                    </p>
                  ) : null}

                  {project.external_url ? (
                    <a
                      href={project.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      Link externo <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}
