/**
 * ProjectsAndInitiativesStep — Step genérico parametrizado.
 */

import { memo } from 'react';
import { FolderKanban } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { ProjectsAndInitiativesStepConfig } from '../types';
import type { ProjectItem, InitiativeItem } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface ProjectsAndInitiativesStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: ProjectsAndInitiativesStepConfig;
  data: { projects: ProjectItem[]; initiatives: InitiativeItem[] };
  onDataChange: (next: { projects: ProjectItem[]; initiatives: InitiativeItem[] }) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

export const ProjectsAndInitiativesStep = memo(function ProjectsAndInitiativesStep({
  persona,
  version,
  stepId,
  config,
  data,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: ProjectsAndInitiativesStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const projects = config.scope === 'cross-team' && config.minTeamsForCrossTeam
    ? data.projects.filter((p) => (p.teamCount ?? 0) >= (config.minTeamsForCrossTeam ?? 2))
    : data.projects;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={FolderKanban}
          title={label.title}
          description={label.subtitle}
          variant="primary"
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        {config.showProjects && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Projetos</h3>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum projeto neste escopo.</p>
            ) : (
              projects.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.ownerName && <p className="text-xs text-muted-foreground">{p.ownerName}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{p.status}</Badge>
                  </div>
                </Card>
              ))
            )}
          </section>
        )}
        {config.showInitiatives && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Iniciativas</h3>
            {data.initiatives.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma iniciativa neste escopo.</p>
            ) : (
              data.initiatives.map((i) => (
                <Card key={i.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{i.title}</p>
                      {i.linkedKrTitle && (
                        <p className="text-xs text-muted-foreground truncate">↳ {i.linkedKrTitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{i.status}</Badge>
                  </div>
                </Card>
              ))
            )}
          </section>
        )}
      </div>
    </WizardStepScaffold>
  );
});
