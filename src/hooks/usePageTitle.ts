import { useEffect } from "react";
import { useBu } from "@/contexts/BuContext";

/**
 * Hook para definir o meta title da página dinamicamente.
 * 
 * Formato:
 * - Com BU: "<Título> | Hub <Nome da BU>"
 * - Sem BU: "<Título> | Hub"
 * - Só Hub (select-bu): "Hub"
 * 
 * @param title - Título da página (ex: "Home", "OKRs", "Configurações")
 * @param options - Opções adicionais
 * @param options.skipBu - Se true, não inclui o nome da BU mesmo se disponível
 * @param options.hubOnly - Se true, exibe apenas "Hub" (usado na tela de seleção de BU)
 */
export function usePageTitle(
  title: string,
  options?: { skipBu?: boolean; hubOnly?: boolean }
) {
  const { currentBu, buSelected } = useBu();

  useEffect(() => {
    let pageTitle: string;

    if (options?.hubOnly) {
      // Tela de seleção de BU - apenas "Hub"
      pageTitle = "Hub";
    } else if (buSelected && currentBu && !options?.skipBu) {
      // Com BU selecionada
      pageTitle = `${title} | Hub ${currentBu.name}`;
    } else {
      // Sem BU (telas globais ou antes da seleção)
      pageTitle = `${title} | Hub`;
    }

    document.title = pageTitle;

    // Cleanup - restaurar título padrão quando componente desmontar
    return () => {
      document.title = "Hub";
    };
  }, [title, currentBu, buSelected, options?.skipBu, options?.hubOnly]);
}
