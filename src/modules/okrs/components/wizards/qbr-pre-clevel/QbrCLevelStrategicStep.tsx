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
    (strategicAnalysis.alignmentPastQuarter?.trim()) ||
    (strategicAnalysis.alignmentNextQuarter?.trim()) ||
    strategicAnalysis.signalsTeamsMissed.trim() ||
    strategicAnalysis.whatNotToDo.trim();

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Compass}
          title="Sua análise — o que só você vê daqui"
          tooltip="qbr-clevel-strategic"
          description="Registre o que a visão consolidada revelou. Esses insights pautam a reunião."
          variant="purple"
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
            Alinhamento estratégico
          </Label>

          {/* Past quarter */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Sobre o quarter que encerrou</p>
            <p className="text-xs text-muted-foreground">
              Os OKRs executados moveram a empresa na direção certa? O que ficou desalinhado com a estratégia?
            </p>
          </div>
          <Textarea
            value={strategicAnalysis.alignmentPastQuarter}
            onChange={(e) => updateField('alignmentPastQuarter', e.target.value)}
            placeholder="O que foi na direção certa e o que ficou desalinhado..."
            className="min-h-[100px] text-sm"
          />

          {/* Next quarter */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Sobre o próximo quarter</p>
            <p className="text-xs text-muted-foreground">
              As propostas dos times cobrem as prioridades estratégicas da empresa? Existe alguma prioridade sem time responsável?
            </p>
          </div>
          <Textarea
            value={strategicAnalysis.alignmentNextQuarter}
            onChange={(e) => updateField('alignmentNextQuarter', e.target.value)}
            placeholder="Avalie se as prioridades dos times estão alinhadas com a visão estratégica..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Signals teams missed */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4 text-status-amber" />
            O que você está vendo que os times não veem
          </Label>
          <p className="text-xs text-muted-foreground">
            Que movimentos de mercado, padrões entre áreas ou riscos sistêmicos você está enxergando de cima que os times não conseguem ver de dentro?
          </p>
          <Textarea
            value={strategicAnalysis.signalsTeamsMissed}
            onChange={(e) => updateField('signalsTeamsMissed', e.target.value)}
            placeholder="Movimentos de mercado, padrões entre áreas, riscos que só se veem de cima..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* What NOT to do */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Ban className="h-4 w-4 text-status-red" />
            Vetos estratégicos
          </Label>
          <p className="text-xs text-muted-foreground">
            O que a empresa não deve fazer no próximo ciclo, mesmo que pareça importante ou urgente? Seja explícito — vetos não ditos viram trabalho desperdiçado.
          </p>
          <Textarea
            value={strategicAnalysis.whatNotToDo}
            onChange={(e) => updateField('whatNotToDo', e.target.value)}
            placeholder="Iniciativas, direções ou investimentos que não são prioridade agora..."
            className="min-h-[100px] text-sm"
          />
        </div>
      </div>
    </WizardStepScaffold>
  );
}
