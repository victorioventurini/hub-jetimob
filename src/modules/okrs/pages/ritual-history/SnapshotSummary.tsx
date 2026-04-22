/**
 * SnapshotSummary — renderiza o relatório formatado do ritual + acesso ao JSON cru.
 * Extraído de `RitualHistoryPage.tsx` em P3.2.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SnapshotReportView } from '../../components/ritual-report';
import type { RitualHistoryItem } from '../../hooks/useRitualHistory';

export function SnapshotSummary({ ritual }: { ritual: RitualHistoryItem }) {
  const [showRawSnapshot, setShowRawSnapshot] = useState(false);
  const rd = ritual.reflectionData;

  if (!rd) return null;

  const data = (rd as any)?.data;

  return (
    <div className="space-y-4">
      <Separator />

      {data && (
        <SnapshotReportView
          wizardType={ritual.wizardType}
          data={data}
          structureVersion={ritual.structureVersion}
        />
      )}

      <Collapsible open={showRawSnapshot} onOpenChange={setShowRawSnapshot}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            {showRawSnapshot ? 'Ocultar dados brutos' : 'Ver dados brutos'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showRawSnapshot && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[300px] mt-2">
            <pre className="text-[11px] bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(rd, null, 2)}
            </pre>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
