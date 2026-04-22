/**
 * AttendanceStep — componente único de presença no Step 1 dos ritos coletivos.
 *
 * Composição: orquestra hook `useSessionAttendance` + UI atomic.
 * Não conhece `wizardType` para alterar comportamento — toda variação vem
 * de `attendanceConfig.ts` (SSOT declarativa).
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSessionAttendance,
  type UseSessionAttendanceArgs,
} from '../../hooks/useSessionAttendance';
import { AttendanceCheckboxList } from './attendance/AttendanceCheckboxList';
import { AttendanceCounter } from './attendance/AttendanceCounter';
import { AttendanceSummary } from './attendance/AttendanceSummary';

export interface AttendanceStepProps extends UseSessionAttendanceArgs {
  /** Quando true, força modo read-only (ex.: sessão completed) */
  readOnly?: boolean;
}

export function AttendanceStep(props: AttendanceStepProps) {
  const {
    enabled,
    config,
    participants,
    presentCount,
    totalCount,
    isConfirmed,
    canMark,
    isLoading,
    togglePresence,
    confirm,
    edit,
  } = useSessionAttendance(props);

  if (!enabled) return null;

  const readOnly = props.readOnly || !canMark;
  const requireConfirm = config.requireConfirmation === true;
  const editable = config.editableAfterConfirmation !== false;
  const showConfirmedView = !readOnly && requireConfirm && isConfirmed;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Presença</CardTitle>
          {!readOnly && !isConfirmed && (
            <Badge variant="outline" className="text-xs">Editando</Badge>
          )}
        </div>
        <CardDescription>
          {config.defaultPresence === 'all'
            ? 'Todos marcados por padrão. Desmarque quem não está presente.'
            : 'Marque quem está presente nesta reunião.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : readOnly ? (
          <AttendanceSummary
            participants={participants}
            presentCount={presentCount}
            totalCount={totalCount}
          />
        ) : showConfirmedView ? (
          <>
            <AttendanceSummary
              participants={participants}
              presentCount={presentCount}
              totalCount={totalCount}
            />
            {editable && (
              <Button variant="outline" size="sm" onClick={edit}>
                Editar presença
              </Button>
            )}
          </>
        ) : (
          <>
            <AttendanceCheckboxList
              participants={participants}
              onToggle={togglePresence}
            />
            <div className="flex items-center justify-between border-t pt-3">
              <AttendanceCounter presentCount={presentCount} totalCount={totalCount} />
              {requireConfirm && (
                <Button size="sm" onClick={confirm} disabled={totalCount === 0}>
                  Confirmar presença
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
