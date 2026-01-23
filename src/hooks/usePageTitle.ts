import { useEffect, useContext } from "react";
import { BuContext } from "@/contexts/BuContext";

type PageType = 
  | "login"
  | "select-bu"
  | "global-settings"
  | "dashboard"
  | "internal"
  | "subpage";

interface UsePageTitleOptions {
  skipBu?: boolean;
  hubOnly?: boolean;
  pageType?: PageType;
  customDescription?: string;
}

/**
 * Hook para definir o meta title e meta description da página dinamicamente.
 * 
 * Formato do Title:
 * - Com BU: "<Título> | Hub <Nome da BU>"
 * - Sem BU: "<Título> | Hub"
 * - Só Hub (select-bu): "Hub"
 * 
 * NOTE: Uses optional BuContext access to work on public routes (e.g., /auth)
 * where BuProvider is not available.
 * 
 * @param title - Título da página (ex: "Home", "OKRs", "Configurações")
 * @param options - Opções adicionais
 */
export function usePageTitle(
  title: string,
  options?: UsePageTitleOptions
) {
  // Use optional context access to avoid throwing when outside BuProvider
  const buContext = useContext(BuContext);
  const currentBu = buContext?.currentBu ?? null;
  const buSelected = buContext?.buSelected ?? false;

  useEffect(() => {
    let pageTitle: string;
    let metaDescription: string;

    const buName = currentBu?.name || "";

    if (options?.hubOnly) {
      // Tela de seleção de BU
      pageTitle = "Hub";
      metaDescription = "Escolha a unidade de negócio para acessar o Hub e gerenciar times, metas e operações.";
    } else if (buSelected && currentBu && !options?.skipBu) {
      // Com BU selecionada
      pageTitle = `${title} | Hub ${buName}`;
      metaDescription = getDescriptionForPage(title, buName, options?.pageType, options?.customDescription);
    } else {
      // Sem BU (telas globais ou antes da seleção)
      pageTitle = `${title} | Hub`;
      metaDescription = getGlobalDescription(title, options?.pageType, options?.customDescription);
    }

    // Atualizar title
    document.title = pageTitle;

    // Atualizar ou criar meta description
    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (!metaDescriptionTag) {
      metaDescriptionTag = document.createElement("meta");
      metaDescriptionTag.setAttribute("name", "description");
      document.head.appendChild(metaDescriptionTag);
    }
    metaDescriptionTag.setAttribute("content", metaDescription);

    // Cleanup
    return () => {
      document.title = "Hub";
    };
  }, [title, currentBu, buSelected, options?.skipBu, options?.hubOnly, options?.pageType, options?.customDescription]);
}

function getDescriptionForPage(title: string, buName: string, pageType?: PageType, customDescription?: string): string {
  if (customDescription) return customDescription;

  // Descrições específicas por página com BU
  const descriptions: Record<string, string> = {
    "Home": `Visão geral da ${buName} no Hub, com acesso rápido a cultura, OKRs, KPIs e informações do time.`,
    "OKRs": `Gerencie os OKRs da ${buName} e acompanhe o progresso das metas no Hub.`,
    "Dashboard OKRs": `Acompanhe o progresso dos OKRs da ${buName} com visão consolidada no Hub.`,
    "Dashboard Executivo": `Visão executiva dos OKRs e resultados da ${buName} no Hub.`,
    "KPIs": `Gerencie os KPIs da ${buName} e acompanhe indicadores estratégicos no Hub.`,
    "Times": `Gerencie os times da ${buName} e a estrutura organizacional no Hub.`,
    "Pessoas": `Gerencie as pessoas da ${buName} e informações do time no Hub.`,
    "Configurações": `Gerencie as configurações da ${buName} no Hub.`,
    "Perfil": `Visualize e edite seu perfil no Hub ${buName}.`,
    "Integrações": `Gerencie as integrações da ${buName} no Hub.`,
    "Agentes IA": `Configure e gerencie agentes de IA da ${buName} no Hub.`,
    "Módulos": `Visualize os módulos disponíveis para a ${buName} no Hub.`,
  };

  return descriptions[title] || `Gerencie ${title.toLowerCase()} da ${buName} no Hub.`;
}

function getGlobalDescription(title: string, pageType?: PageType, customDescription?: string): string {
  if (customDescription) return customDescription;

  // Descrições para telas globais (sem BU)
  const globalDescriptions: Record<string, string> = {
    "Login": "Acesse o Hub para gerenciar pessoas, times, OKRs, KPIs e a operação da Jet.",
    "Configurações": "Gerencie as configurações globais do Hub, integrações, usuários e permissões.",
    "Integrações": "Gerencie as integrações globais do Hub.",
    "Usuários": "Gerencie os usuários e permissões do Hub.",
    "Unidades de Negócio": "Gerencie as unidades de negócio cadastradas no Hub.",
    "Página não encontrada": "Esta página não existe ou mudou de lugar. Volte para a Home do Hub e acesse seus módulos e atalhos.",
  };

  return globalDescriptions[title] || `Gerencie ${title.toLowerCase()} no Hub.`;
}
