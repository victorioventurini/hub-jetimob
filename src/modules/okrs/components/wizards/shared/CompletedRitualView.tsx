/**
 * CompletedRitualView - Read-only view for already-submitted rituals
 * 
 * Shows the snapshot report + addendum section.
 * Used by QbrPrePage and MbrPrePage when a completed session exists.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SnapshotReportView } from '@/modules/okrs/components/ritual-report';
import { AddendumSection } from './AddendumSection';
import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { CompletedSessionData } from '@/modules/okrs/hooks/useCompletedSessionForCycle';
import { RITUAL_LABELS } from '@/modules/okrs/constants/ritualLabels';

interface CompletedRitualViewProps {
  title: string;
  teamName?: string;
  wizardType: WizardPersona;
  session: CompletedSessionData;
  backUrl: string;
  canReopen?: boolean;
  onReopen?: () => Promise<void>;
}

export function CompletedRitualView({
  title,
  teamName,
  wizardType,
  session,
  backUrl,
  canReopen = false,
  onReopen,
}: CompletedRitualViewProps) {
  const navigate = useNavigate();
  const [isReopening, setIsReopening] = useState(false);
  const ritualLabel = RITUAL_LABELS[wizardType] ?? title;

  const handleReopen = async () => {
    if (!onReopen) return;
    setIsReopening(true);
    try {
      await onReopen();
    } finally {
      setIsReopening(false);
    }
  };
  const rd = session.reflection_data;
  const snapshotData = (rd as any)?.data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground -ml-2"
            onClick={() => navigate(backUrl)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{ritualLabel}</h1>
            {teamName && (
              <span className="text-sm text-muted-foreground">— {teamName}</span>
            )}
            {session.completed_at && (
              <Badge variant="outline" className="text-status-green border-status-green/30 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Enviado em {format(new Date(session.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
              </Badge>
            )}

            {/* Reopen button (admin only) */}
            {canReopen && onReopen && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 ml-auto"
                    disabled={isReopening}
                  >
                    {isReopening ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Reabrir para edição
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reabrir rito para edição?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O rito será reaberto para edição. Uma cópia de segurança dos dados atuais
                      será mantida automaticamente. Você poderá editar e re-submeter quando finalizar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReopen} disabled={isReopening}>
                      {isReopening ? 'Reabrindo...' : 'Reabrir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Snapshot report */}
        {snapshotData && (
          <SnapshotReportView wizardType={wizardType} data={snapshotData} />
        )}

        <Separator />

        {/* Addendum section */}
        <AddendumSection
          sessionId={session.id}
          addendums={session.addendums}
        />
      </div>
    </div>
  );
}
