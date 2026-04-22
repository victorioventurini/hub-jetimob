/**
 * RitualAttendance — Wrapper de conveniência para o `AttendanceStep`
 *
 * Composição reutilizada nos 5 ritos coletivos (Onda C — Step 1):
 *   <RitualPreparationStatus ... />
 *   <RitualAttendance ... />
 *
 * Comportamento:
 * - Lê `attendanceConfig` por `persona`. Se `enabled === false`, não renderiza nada
 *   (componente único; toda variação vive na config — nenhum rito tem lógica própria).
 * - Enquanto `sessionId` for `null` (rito ainda não materializado em
 *   `okr_wizard_sessions`), renderiza placeholder discreto. Assim que o
 *   draft é salvo (`saveDraft()`), `sessionId` aparece e a presença passa a
 *   ser editável/persistida em `ritual_session_attendance`.
 *
 * Mantém pages 100% declarativas — não conhecem detalhes do framework de presença.
 */
import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceStep } from '@/modules/okrs/components/wizards/shared/framework/components/AttendanceStep';
import {
  isAttendanceEnabled,
} from '@/modules/okrs/components/wizards/shared/framework/config/attendanceConfig';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface RitualAttendanceProps {
  /** Persona do wizard atual (= wizardType). */
  persona: WizardPersona;
  /** ID da sessão em `okr_wizard_sessions`; null antes do primeiro saveDraft. */
  sessionId: string | null;
  /** BU da sessão (sempre disponível via `useBu().currentBu.id`). */
  buId: string | null | undefined;
  /** Necessário para resolver `team-members` (Check-in do Time). */
  teamId?: string | null;
  /** Necessário para resolver `teams-with-active-okrs` (MBR/QBR). */
  cycleId?: string | null;
  /** Necessário para resolver `qbr-participants` (Pós-QBR). */
  previousQbrSessionId?: string | null;
  /** Quando true, força modo read-only (ex.: sessão completed). */
  readOnly?: boolean;
}

function RitualAttendanceImpl({
  persona,
  sessionId,
  buId,
  teamId,
  cycleId,
  previousQbrSessionId,
  readOnly,
}: RitualAttendanceProps) {
  // Persona não tem presença → não renderiza nada.
  if (!isAttendanceEnabled(persona)) return null;
  if (!buId) return null;

  // Sessão ainda não materializada no banco — mostramos placeholder
  // discreto explicando o gating sem bloquear o fluxo.
  if (!sessionId) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Presença</CardTitle>
          <CardDescription>
            O registro de presença será habilitado assim que o rascunho desta
            reunião for salvo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Salve o rascunho para começar a marcar quem está presente.
        </CardContent>
      </Card>
    );
  }

  return (
    <AttendanceStep
      persona={persona}
      sessionId={sessionId}
      buId={buId}
      teamId={teamId ?? null}
      cycleId={cycleId ?? null}
      previousQbrSessionId={previousQbrSessionId ?? null}
      readOnly={readOnly}
    />
  );
}

export const RitualAttendance = memo(RitualAttendanceImpl);
