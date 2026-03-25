/**
 * QbrLearningsStep - Step 3: Aprendizados do Ciclo
 * 
 * Três campos estruturados de reflexão:
 * 1. O que funcionou e deve continuar
 * 2. O que não funcionou e deve parar
 * 3. O que ficou como dívida
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  ReflectionQuestions,
} from '../shared';
import type { QbrPreDraftData, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { ReflectionQuestion } from '../shared/ReflectionQuestions';

// ============================================================
// CONSTANTS
// ============================================================

const QBR_LEARNINGS_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'qbr-learn-1',
    question: 'Qual foi a maior entrega do time neste ciclo?',
    hint: 'Pense no impacto, não apenas na conclusão.',
    source: 'system',
  },
  {
    id: 'qbr-learn-2',
    question: 'O que impediria o time de repetir os bons resultados?',
    hint: 'Identifique dependências e riscos.',
    source: 'system',
  },
  {
    id: 'qbr-learn-3',
    question: 'Existe algo que o time evitou discutir neste ciclo?',
    hint: 'Às vezes o não-dito é o mais importante.',
    source: 'system',
  },
];

// ============================================================
// TYPES
// ============================================================

export interface QbrLearningsStepProps {
  learnings: QbrPreDraftData['learnings'];
  onLearningsChange: (learnings: QbrPreDraftData['learnings']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrLearningsStep({
  learnings,
  onLearningsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrLearningsStepProps) {
  const updateField = (field: keyof QbrPreDraftData['learnings'], value: string) => {
    onLearningsChange({ ...learnings, [field]: value });
  };

  const hasContent = learnings.whatWorked.trim() || learnings.whatDidntWork.trim() || learnings.debts.trim();

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={BookOpen}
          title="Aprendizados do Ciclo"
          description="Reflexão estruturada sobre o que levar e o que deixar"
          variant="purple"
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-learnings"
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
        <ReflectionQuestions questions={QBR_LEARNINGS_QUESTIONS} collapsed />

        {/* What worked */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-status-green" />
            O que funcionou e deve continuar
          </Label>
          <Textarea
            value={learnings.whatWorked}
            onChange={(e) => updateField('whatWorked', e.target.value)}
            placeholder="Processos, práticas ou decisões que geraram resultado..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* What didn't work */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <XCircle className="h-4 w-4 text-status-red" />
            O que não funcionou e deve parar
          </Label>
          <Textarea
            value={learnings.whatDidntWork}
            onChange={(e) => updateField('whatDidntWork', e.target.value)}
            placeholder="O que consumiu energia sem gerar resultado proporcional..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Debts */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-status-amber" />
            Dívidas (técnica, processo, pessoas)
          </Label>
          <Textarea
            value={learnings.debts}
            onChange={(e) => updateField('debts', e.target.value)}
            placeholder="O que ficou pendente e precisa ser endereçado no próximo ciclo..."
            className="min-h-[100px] text-sm"
          />
        </div>
      </div>
    </WizardStepScaffold>
  );
}
