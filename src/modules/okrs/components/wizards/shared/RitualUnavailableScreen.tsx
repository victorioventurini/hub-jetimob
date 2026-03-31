/**
 * RitualUnavailableScreen — Tela informativa exibida quando um rito está fora da janela de disponibilidade
 * 
 * Exibida dentro do layout do wizard (sem FullPageWizardShell, pois não há steps).
 * Mostra ícone, nome, mensagem contextual e botão para voltar.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarClock, CalendarX, CalendarOff, ArrowLeft, ArrowRight, Info } from 'lucide-react';
import type { RitualAvailability } from '@/modules/okrs/hooks/useRitualAvailability';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

interface RitualUnavailableScreenProps {
  wizardType: WizardPersona;
  availability: RitualAvailability;
  backUrl?: string;
}

// ============================================================
// ICON MAP
// ============================================================

const REASON_ICON = {
  not_yet: CalendarClock,
  expired: CalendarX,
  no_cycle: CalendarOff,
  no_dates: CalendarOff,
  qbr_period: Info,
  available: CalendarClock,
} as const;

const REASON_TITLE = {
  not_yet: 'Rito ainda não disponível',
  expired: 'Período encerrado',
  no_cycle: 'Nenhum ciclo ativo',
  no_dates: 'Datas não configuradas',
  qbr_period: 'Substituído pelo QBR',
  available: '',
} as const;

// ============================================================
// QBR REDIRECT MAP
// ============================================================

const QBR_REDIRECT: Partial<Record<WizardPersona, string>> = {
  'mbr-pre': '/rituals/qbr-pre',
  'mbr': '/rituals/qbr',
};

// ============================================================
// COMPONENT
// ============================================================

export function RitualUnavailableScreen({
  wizardType,
  availability,
  backUrl = '/rituals',
}: RitualUnavailableScreenProps) {
  const navigate = useNavigate();
  const Icon = REASON_ICON[availability.reason];
  const title = REASON_TITLE[availability.reason];
  const qbrUrl = availability.reason === 'qbr_period' ? QBR_REDIRECT[wizardType] : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md mx-auto text-center space-y-6 p-8">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
          availability.reason === 'qbr_period' ? 'bg-muted' : 'bg-muted'
        }`}>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {availability.message}
          </p>
        </div>

        {availability.opensAt && availability.closesAt && availability.reason !== 'no_cycle' && availability.reason !== 'qbr_period' && (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Janela de acesso:</span>{' '}
              {availability.opensAt.toLocaleDateString('pt-BR')} — {availability.closesAt.toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 items-center">
          {qbrUrl && (
            <Button
              onClick={() => navigate(qbrUrl)}
              className="gap-2"
            >
              Ir para o QBR
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate(backUrl)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
