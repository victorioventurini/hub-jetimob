import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { extractLearnings } from '../helpers';
import type { RitualSessionRow } from '../types';

interface Props {
  teams: Array<{ id: string; name: string }> | undefined;
  ritualByTeam: { qbr: Map<string, RitualSessionRow>; mbr: Map<string, RitualSessionRow> };
}

export function RitualSummariesSection({ teams, ritualByTeam }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">O que os times disseram este quarter</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {(teams || []).map((team) => {
          const qbrSession = ritualByTeam.qbr.get(team.id);
          const mbrSession = ritualByTeam.mbr.get(team.id);
          const baseSession = qbrSession || mbrSession || null;

          if (!baseSession) {
            return (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <Badge variant="secondary">Sem preparação enviada</Badge>
                </CardHeader>
              </Card>
            );
          }

          const learnings = extractLearnings(baseSession.reflection_data);
          const decisions = (baseSession.decisions || [])
            .map((d) => d.text || d.title || '')
            .filter(Boolean);
          const hasAddendum =
            Array.isArray(baseSession.addendums) && baseSession.addendums.length > 0;

          return (
            <Card
              key={team.id}
              className={hasAddendum ? 'border-status-yellow/50' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <CardDescription>
                      Enviado em{' '}
                      {baseSession.completed_at
                        ? format(parseISO(baseSession.completed_at), 'dd/MM/yyyy HH:mm')
                        : '—'}
                    </CardDescription>
                  </div>
                  {hasAddendum ? (
                    <Badge className="bg-status-yellow-muted text-status-yellow">
                      Adendo
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">Keep</p>
                  <p className="text-muted-foreground line-clamp-2">
                    {learnings.keep.join(' • ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Stop</p>
                  <p className="text-muted-foreground line-clamp-2">
                    {learnings.stop.join(' • ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Débitos</p>
                  <p className="text-muted-foreground line-clamp-2">
                    {learnings.debts.join(' • ') || '—'}
                  </p>
                </div>

                {decisions.length > 0 ? (
                  <div>
                    <p className="font-medium">Itens que precisam de decisão</p>
                    <p className="text-muted-foreground line-clamp-2">
                      {decisions.join(' • ')}
                    </p>
                  </div>
                ) : null}

                <Link
                  to={`/rituals/history?session=${baseSession.id}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  Ver relatório completo <FolderKanban className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
