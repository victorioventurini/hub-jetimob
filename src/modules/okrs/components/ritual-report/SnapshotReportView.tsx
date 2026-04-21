/**
 * SnapshotReportView - Dispatcher para renderizar relatórios visuais de rituais
 *
 * Recebe wizardType + structureVersion + data (conteúdo de reflection_data.data)
 * e renderiza o renderer específico. Fallback: mensagem genérica.
 *
 * Roteamento por versão estrutural:
 * - v1: renderers legados (snapshot imutável de pré-padronização)
 * - v2+: mesmos renderers — o shape de `reflection_data.data` é compatível
 *   pois o framework grava nos mesmos campos. Mantemos o parâmetro
 *   explicitado para futuras divergências (ex: novo layout consolidado).
 *
 * SSOT estrutural: `wizards/shared/framework/config/structureVersions.ts`.
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
  /**
   * Versão estrutural da sessão. Default `v1` para retrocompatibilidade
   * com sessões anteriores à coluna `okr_wizard_sessions.structure_version`.
   */
  structureVersion?: string;
}

const RENDERERS: Partial<Record<WizardPersona, React.ComponentType<{ data: Record<string, any> }>>> = {
  'collaborator': CollaboratorReport,
  'leader-prep': LeaderPrepReport,
  'team-checkin': TeamCheckinReport,
  'managers-checkin': ManagersCheckinReport,
  'clevel-checkin': CLevelCheckinReport,
  'mbr': MbrReport,
  'mbr-pre': MbrPreReport,
  'qbr-pre': QbrPreReport,
  'qbr-pre-clevel': QbrCLevelReport,
  'qbr-meeting': QbrMeetingReport,
  'qbr-post': QbrPostReport,
};

export function SnapshotReportView({ wizardType, data, structureVersion = 'v1' }: SnapshotReportViewProps) {
  const Renderer = RENDERERS[wizardType];

  if (!Renderer) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Visualização detalhada indisponível para este tipo de ritual.
      </p>
    );
  }

  // `structureVersion` é capturado para futuras divergências de layout (v2+).
  // Atualmente os renderers leem `reflection_data.data` em shape compatível,
  // então o roteamento por versão é transparente — ver comentário do header.
  void structureVersion;

  return <Renderer data={data} />;
}
