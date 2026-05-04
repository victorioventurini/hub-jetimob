import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useKrInitiatives } from '@/modules/okrs/hooks';
import { useProjectsForKr } from '@/modules/projects/hooks';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';

export const TeamKrLinkedDetails = memo(function TeamKrLinkedDetails({
  krId,
}: {
  krId: string;
}) {
  const { data: initiatives } = useKrInitiatives(krId);
  const { data: projects } = useProjectsForKr(krId);

  if ((!initiatives || initiatives.length === 0) && (!projects || projects.length === 0))
    return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-2">
      {initiatives && initiatives.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Iniciativas vinculadas</p>
          <div className="flex flex-wrap gap-1.5">
            {initiatives.slice(0, 4).map((initiative) => (
              <Badge key={initiative.id} variant="outline" className="text-xs">
                {initiative.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {projects && projects.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Projetos vinculados</p>
          <div className="space-y-1.5">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate">{project.name}</span>
                <ProjectHealthBadge health={project.health} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});
