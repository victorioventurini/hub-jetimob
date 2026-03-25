/**
 * QbrCLevelStrategicStep - Step 2: Análise Estratégica
 * 
 * Três campos de reflexão exclusiva do C-Level:
 * 1. Alinhamento com estratégia
 * 2. Sinais que os times não viram
 * 3. O que não deve ser feito
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Compass, CheckCircle2, Eye, Ban } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type { QbrCLevelSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrCLevelStrategicStepProps {
  strategicAnalysis: QbrCLevelSnapshot['strategicAnalysis'];
  onStrategicAnalysisChange: (analysis: QbrCLevelSnapshot['strategicAnalysis']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrCLevelStrategicStep({
  strategicAnalysis,
  onStrategicAnalysisChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrCLevelStrategicStepProps) {
  const updateField = (field: keyof QbrCLevelSnapshot['strategicAnalysis'], value: string) => {
    onStrategicAnalysisChange({ ...strategicAnalysis, [field]: value });
  };

  const hasContent =
    strategicAnalysis.alignmentAssessment.trim() ||
    strategicAnalysis.signalsTeamsMissed.trim() ||
    strategicAnalysis.whatNotToDo.trim();

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Compass}
          title="Análise Estratégica"
          description="Reflexão exclusiva do C-Level sobre direção e prioridades"
          variant="purple"
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-clevel-strategic"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!hasContent}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Alignment */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Alinhamento com a Estratégia
          </Label>
          <p className="text-xs text-muted-foreground">
            Os OKRs do ciclo e os propostos levam a empresa para onde precisa?
          </p>
          <Textarea
            value={strategicAnalysis.alignmentAssessment}
            onChange={(e) => updateField('alignmentAssessment', e.target.value)}
            placeholder="Avalie se as prioridades dos times estão alinhadas com a visão estratégica..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Signals teams missed */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4 text-status-amber" />
            Sinais que os Times Não Viram
          </Label>
          <p className="text-xs text-muted-foreground">
            Correlações e padrões que emergem da visão consolidada mas não são visíveis time a time.
          </p>
          <Textarea
            value={strategicAnalysis.signalsTeamsMissed}
            onChange={(e) => updateField('signalsTeamsMissed', e.target.value)}
            placeholder="Tendências de mercado, riscos sistêmicos, oportunidades não exploradas..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* What NOT to do */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Ban className="h-4 w-4 text-status-red" />
            O que NÃO Fazer
          </Label>
          <p className="text-xs text-muted-foreground">
            Explicitamente: o que não entra no próximo ciclo, mesmo que pareça importante.
          </p>
          <Textarea
            value={strategicAnalysis.whatNotToDo}
            onChange={(e) => updateField('whatNotToDo', e.target.value)}
            placeholder="Projetos, iniciativas ou direções que não são prioridade agora..."
            className="min-h-[100px] text-sm"
          />
        </div>
      </div>
    </WizardStepScaffold>
  );
}
