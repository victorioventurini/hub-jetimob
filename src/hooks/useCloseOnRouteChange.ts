import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook que fecha um popover/dialog quando a rota muda.
 * Resolve o problema de overlays/portals que ficam abertos após navegação,
 * bloqueando interações com outros elementos da UI.
 * 
 * @param open - Estado atual de abertura do componente
 * @param setOpen - Função para alterar o estado de abertura
 */
export function useCloseOnRouteChange(
  open: boolean,
  setOpen: (open: boolean) => void
): void {
  const location = useLocation();
  
  useEffect(() => {
    if (open) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
