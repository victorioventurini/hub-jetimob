import { useRef, useEffect } from 'react';

/**
 * Hook para resetar estado de formulários em dialogs apenas quando o dialog abre,
 * não quando os dados mudam (evita perda de edições ao trocar de aba do navegador).
 * 
 * @param open - Estado de abertura do dialog
 * @param onOpen - Callback executado apenas quando o dialog transiciona de fechado para aberto
 */
export function useDialogFormReset(open: boolean, onOpen: () => void) {
  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Só executa o callback quando transiciona de fechado para aberto
    if (open && !prevOpenRef.current) {
      onOpen();
    }
    prevOpenRef.current = open;
  }, [open, onOpen]);
}
