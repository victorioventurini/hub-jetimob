/**
 * TeamOkrCreationRoute
 *
 * Route guard para o rito "Criação de OKRs do Time" (/okrs/create).
 * Libera acesso quando:
 * - Usuário é admin (isWildcard); OU
 * - Existe ao menos um ciclo trimestral em status `planning` na BU ativa.
 *
 * Caso contrário, exibe RitualUnavailableScreen.
 */

import { usePermissions } from '@/hooks/usePermissions';
import { useTeamOkrCreationWindow } from '@/modules/okrs/hooks/useTeamOkrCreationWindow';
import { LoadingState } from '@/components/ui/loading-state';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';

interface TeamOkrCreationRouteProps {
  children: React.ReactNode;
}

export function TeamOkrCreationRoute({ children }: TeamOkrCreationRouteProps) {
  const { isWildcard, isLoading: permLoading } = usePermissions();
  const { isOpen, isLoading: windowLoading } = useTeamOkrCreationWindow();

  if (permLoading || (!isWildcard && windowLoading)) {
    return <LoadingState fullPage />;
  }

  if (isWildcard || isOpen) {
    return <>{children}</>;
  }

  return (
    <RitualUnavailableScreen
      wizardType="team-okr-creation"
      availability={{
        isAvailable: false,
        opensAt: null,
        closesAt: null,
        reason: 'not_yet',
        message:
          'A Criação de OKRs do Time abre quando um novo quarter entra em planejamento (ao final do Pós-QBR). Você receberá uma notificação quando estiver disponível.',
      }}
    />
  );
}
