/**
 * SnapshotReportView - Dispatcher para renderizar relatórios visuais de rituais
 * 
 * Recebe wizardType + data (conteúdo de reflection_data.data) e renderiza
 * o renderer específico. Fallback: mensagem genérica.
 */

import type { WizardPersona } from '../../types/wizard';
import { CollaboratorReport } from './renderers/CollaboratorReport';
import { LeaderPrepReport } from './renderers/LeaderPrepReport';
import { TeamCheckinReport } from './renderers/TeamCheckinReport';
import { ManagersCheckinReport } from './renderers/ManagersCheckinReport';
import { CLevelCheckinReport } from './renderers/CLevelCheckinReport';
import { MbrReport } from './renderers/MbrReport';
import { MbrPreReport } from './renderers/MbrPreReport';
import { QbrPreReport } from './renderers/QbrPreReport';
import { QbrCLevelReport } from './renderers/QbrCLevelReport';
import { QbrMeetingReport } from './renderers/QbrMeetingReport';
import { QbrPostReport } from './renderers/QbrPostReport';

interface SnapshotReportViewProps {
  wizardType: WizardPersona;
  data: Record<string, any>;
}

const RENDERERS: Partial<Record<WizardPersona, React.ComponentType<{ data: Record<string, any> }>>> = {
  'collaborator': CollaboratorReport,
  'leader-prep': LeaderPrepReport,
  'team-checkin': TeamCheckinReport,
  'managers-checkin': ManagersCheckinReport,
  'clevel-checkin': CLevelCheckinReport,
  'mbr': MbrReport,
  'qbr-pre': QbrPreReport,
  'qbr-pre-clevel': QbrCLevelReport,
  'qbr-meeting': QbrMeetingReport,
  'qbr-post': QbrPostReport,
};

export function SnapshotReportView({ wizardType, data }: SnapshotReportViewProps) {
  const Renderer = RENDERERS[wizardType];

  if (!Renderer) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Visualização detalhada indisponível para este tipo de ritual.
      </p>
    );
  }

  return <Renderer data={data} />;
}
