/**
 * QbrCLevelOkrValidationStep - Step 3: Validação de OKRs propostos
 * 
 * Revisão das propostas de todos os times com flags de calibração:
 * - too_conservative / too_aggressive / gap / overlap
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardCheck, Flag, Plus, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import type {
  QbrCLevelSnapshot,
  QbrCalibrationFlag,
  TeamOkrCreationWizardState,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrProposal {
  teamId: string;
  teamName: string;
  proposedOkrs: Partial<TeamOkrCreationWizardState>;
  hasSubmission: boolean;
}

export interface QbrCLevelOkrValidationStepProps {
  teamProposals: TeamOkrProposal[];
  calibrationFlags: QbrCLevelSnapshot['okrCalibrationFlags'];
  onCalibrationFlagsChange: (flags: QbrCLevelSnapshot['okrCalibrationFlags']) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const FLAG_CONFIG: Record<QbrCalibrationFlag, { label: string; color: string; emoji: string }> = {
  too_conservative: { label: 'Muito conservador', color: 'text-status-amber', emoji: '🐢' },
  too_aggressive: { label: 'Muito agressivo', color: 'text-status-red', emoji: '🔥' },
  gap: { label: 'Gap estratégico', color: 'text-primary', emoji: '🕳️' },
  overlap: { label: 'Sobreposição', color: 'text-muted-foreground', emoji: '🔄' },
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrCLevelOkrValidationStep({
  teamProposals,
  calibrationFlags,
  onCalibrationFlagsChange,
  onContinue,
  onBack,
}: QbrCLevelOkrValidationStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newFlagType, setNewFlagType] = useState<QbrCalibrationFlag>('gap');
  const [newFlagNote, setNewFlagNote] = useState('');

  const current = teamProposals[currentIndex];
  const teamFlags = calibrationFlags.filter(f => f.teamId === current?.teamId);

  const handleAddFlag = () => {
    if (!current || !newFlagNote.trim()) return;
    onCalibrationFlagsChange([
      ...calibrationFlags,
      { teamId: current.teamId, flag: newFlagType, note: newFlagNote.trim() },
    ]);
    setNewFlagNote('');
  };

  const handleRemoveFlag = (index: number) => {
    const globalIdx = calibrationFlags.findIndex(
      (f, i) => f.teamId === current?.teamId && calibrationFlags.slice(0, i + 1).filter(ff => ff.teamId === current?.teamId).length === index + 1
    );
    if (globalIdx >= 0) {
      onCalibrationFlagsChange(calibrationFlags.filter((_, i) => i !== globalIdx));
    }
  };

  const goToTeam = (idx: number) => {
    if (idx >= 0 && idx < teamProposals.length) setCurrentIndex(idx);
  };

  if (!current) {
    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={ClipboardCheck}
            title="Validação de OKRs"
            description="Nenhuma proposta de OKR encontrada"
            variant="amber"
          />
        }
        footer={<WizardStepFooter onBack={onBack} onPrimary={onContinue} />}
      >
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">Nenhum time submeteu propostas de OKRs.</p>
        </div>
      </WizardStepScaffold>
    );
  }

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ClipboardCheck}
          title="Validação de OKRs"
          description={`Time ${currentIndex + 1} de ${teamProposals.length}`}
          variant="amber"
          badge={`${calibrationFlags.length} flags`}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Team navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToTeam(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <h4 className="text-sm font-semibold">{current.teamName}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToTeam(currentIndex + 1)}
            disabled={currentIndex >= teamProposals.length - 1}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Proposed OKR */}
        {current.hasSubmission && current.proposedOkrs?.objective?.title ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Objetivo proposto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{current.proposedOkrs.objective.title}</p>
              {current.proposedOkrs.objective.description && (
                <p className="text-xs text-muted-foreground">{current.proposedOkrs.objective.description}</p>
              )}
              {current.proposedOkrs.draftKrs && current.proposedOkrs.draftKrs.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-medium text-muted-foreground">Key Results:</p>
                  {current.proposedOkrs.draftKrs.map((kr, i) => (
                    <div key={kr.id || i} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{kr.type}</Badge>
                      <span className="truncate">{kr.title}</span>
                      <span className="text-muted-foreground shrink-0">
                        {kr.baseline} → {kr.target} {kr.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {current.hasSubmission ? 'Nenhum OKR proposto' : 'Pré-QBR não submetido'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Existing flags for this team */}
        {teamFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Flags para {current.teamName}:</p>
            {teamFlags.map((f, i) => {
              const config = FLAG_CONFIG[f.flag];
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <span className="text-sm">{config.emoji}</span>
                  <Badge variant="outline" className={cn('text-xs', config.color)}>{config.label}</Badge>
                  <span className="text-xs flex-1 truncate">{f.note}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveFlag(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new flag */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Adicionar flag de calibração</span>
            </div>
            <div className="flex gap-2">
              <Select value={newFlagType} onValueChange={(v) => setNewFlagType(v as QbrCalibrationFlag)}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(FLAG_CONFIG) as [QbrCalibrationFlag, typeof FLAG_CONFIG[QbrCalibrationFlag]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.emoji} {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newFlagNote}
                onChange={(e) => setNewFlagNote(e.target.value)}
                placeholder="Nota..."
                className="text-xs flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddFlag(); }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddFlag}
                disabled={!newFlagNote.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team indicators */}
        <div className="flex items-center gap-1 flex-wrap">
          {teamProposals.map((tp, i) => {
            const hasFlags = calibrationFlags.some(f => f.teamId === tp.teamId);
            return (
              <button
                key={tp.teamId}
                onClick={() => goToTeam(i)}
                className={cn(
                  'w-8 h-8 rounded text-xs font-medium transition-colors',
                  i === currentIndex ? 'bg-primary text-primary-foreground' :
                  hasFlags ? 'bg-status-amber-muted text-status-amber' :
                  'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                title={tp.teamName}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </WizardStepScaffold>
  );
}
