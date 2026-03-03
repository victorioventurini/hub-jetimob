/**
 * WizardStepScaffold - Layout canônico para steps de wizard
 *
 * Resolve definitivamente o bug de footer inacessível garantindo:
 * - Root com `h-full min-h-0 overflow-hidden` (não cresce além do shell)
 * - Áreas fixas (header, summary, decisions, footer) com `shrink-0`
 * - Área de conteúdo rolável em `flex-1 min-h-0` com ScrollArea
 *
 * USO:
 * <WizardStepScaffold
 *   header={<WizardStepHeader ... />}
 *   topFixed={<SummaryBar />}       // opcional
 *   bottomFixed={<DecisionInput />}  // opcional
 *   footer={<WizardStepFooter ... />}
 * >
 *   {/* conteúdo longo rolável * /}
 * </WizardStepScaffold>
 */

import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface WizardStepScaffoldProps {
  /** Fixed header (WizardStepHeader) */
  header: ReactNode;
  /** Optional fixed content below header (summary bars, progress) */
  topFixed?: ReactNode;
  /** Scrollable main content */
  children: ReactNode;
  /** Optional fixed content above footer (decisions input) */
  bottomFixed?: ReactNode;
  /** Fixed footer (WizardStepFooter) */
  footer: ReactNode;
  /** Extra classes on root */
  className?: string;
}

export function WizardStepScaffold({
  header,
  topFixed,
  children,
  bottomFixed,
  footer,
  className,
}: WizardStepScaffoldProps) {
  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      {/* Fixed header */}
      <div className="shrink-0">{header}</div>

      {/* Optional fixed top area */}
      {topFixed && <div className="shrink-0">{topFixed}</div>}

      {/* Scrollable content — the ONLY region that grows */}
      <ScrollArea className="flex-1 min-h-0">
        {children}
      </ScrollArea>

      {/* Optional fixed bottom area */}
      {bottomFixed && <div className="shrink-0">{bottomFixed}</div>}

      {/* Fixed footer */}
      <div className="shrink-0">{footer}</div>
    </div>
  );
}
