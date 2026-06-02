/**
 * AnalyzedTeamsHeader
 *
 * Bloco de transparência: lista os times cujos snapshots (MBR-pré / QBR-pré)
 * alimentaram o Relatório Executivo. Evita divergências silenciosas entre
 * a lista de "Concluídos" exibida no rito e o conjunto efetivamente analisado.
 */
import { Users, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface AnalyzedTeamItem {
  teamId: string;
  teamName: string;
  leaderName: string | null;
  completedAt: string | null;
}

interface AnalyzedTeamsHeaderProps {
  teams: AnalyzedTeamItem[];
  ritual: 'MBR' | 'QBR';
}

export function AnalyzedTeamsHeader({ teams, ritual }: AnalyzedTeamsHeaderProps) {
  if (!teams?.length) return null;
  const sourceLabel = ritual === 'MBR' ? 'MBR-pré' : 'QBR-pré';
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Times analisados neste relatório ({teams.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Apenas times com {sourceLabel} concluído dentro da janela do rito são considerados.
        </p>
        <ul className="space-y-1.5">
          {teams.map((t) => (
            <li key={t.teamId || t.teamName} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <Badge variant="secondary" className="text-xs">{t.teamName}</Badge>
              {t.leaderName && (
                <span className="text-muted-foreground">· {t.leaderName}</span>
              )}
              {t.completedAt && (
                <span className="text-muted-foreground text-xs">
                  · concluído em {format(parseISO(t.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
