/**
 * QbrPostMinutesStep - Step 5: Ata executiva e encerramento
 * 
 * Campo de texto para ata + checklist de governança.
 * Transiciona qbr_status → 'done'.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ShieldCheck } from 'lucide-react';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrPostGovernanceChecklist } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrPostMinutesStepProps {
  executiveMinutes: string;
  onExecutiveMinutesChange: (minutes: string) => void;
  checklist: QbrPostGovernanceChecklist;
  onChecklistChange: (checklist: QbrPostGovernanceChecklist) => void;
  isCompleting?: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================

const CHECKLIST_ITEMS: { key: keyof QbrPostGovernanceChecklist; label: string }[] = [
  { key: 'strategicFocusClear', label: 'Foco estratégico do próximo ciclo está claro?' },
  { key: 'decisionsHaveOwners', label: 'Todas as decisões têm dono e prazo?' },
  { key: 'dependenciesFormalized', label: 'Dependências cross-área formalizadas?' },
  { key: 'nextCycleOkrsActive', label: 'OKRs do próximo ciclo estão ativos?' },
];

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostMinutesStep({
  executiveMinutes,
  onExecutiveMinutesChange,
  checklist,
  onChecklistChange,
  isCompleting,
  onComplete,
  onBack,
}: QbrPostMinutesStepProps) {
  const allChecked = CHECKLIST_ITEMS.every(item => checklist[item.key]);

  const handleToggle = (key: keyof QbrPostGovernanceChecklist) => {
    onChecklistChange({ ...checklist, [key]: !checklist[key] });
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={FileText}
          title="Ata Executiva"
          description="Registre a síntese e encerre o ciclo QBR"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryDisabled={!allChecked || !executiveMinutes.trim()}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Executive minutes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ata Executiva
          </Label>
          <p className="text-xs text-muted-foreground">
            Síntese das decisões, compromissos e direcionamentos aprovados no QBR.
          </p>
          <Textarea
            value={executiveMinutes}
            onChange={(e) => onExecutiveMinutesChange(e.target.value)}
            placeholder="Resumo executivo do QBR...

• Decisões-chave tomadas
• OKRs aprovados e ajustados
• Compromissos cross-área formalizados
• Próximos passos e cadência de acompanhamento"
            className="min-h-[200px] text-sm"
          />
        </div>

        {/* Governance checklist */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Checklist de Governança</span>
            </div>
            {CHECKLIST_ITEMS.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <Checkbox
                  id={item.key}
                  checked={checklist[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
                <Label htmlFor={item.key} className="text-sm cursor-pointer flex-1">
                  {item.label}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
