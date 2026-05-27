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
  /**
   * Permite indexação por mecanismos de busca.
   * Default: false (Hub é uma aplicação privada autenticada).
   */
  indexable?: boolean;
}

/**
 * Domínio canônico oficial do Next.
 * Garante que previews (id-preview--*.lovable.app) e o domínio publicado
 * (hub-jetimob.lovable.app) não sejam tratados como conteúdo duplicado.
 */
const CANONICAL_ORIGIN = "https://next.jetimob.com";

/**
 * Hook para definir o meta title e meta description da página dinamicamente.
 * 
 * Formato do Title:
 * - Com BU: "<Título> | Next <Nome da BU>"
 * - Sem BU: "<Título> | Hub"
 * - Só Hub (select-bu): "Next"
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
      pageTitle = "Next";
      metaDescription = "Escolha a unidade de negócio para acessar o Next e gerenciar times, metas e operações.";
    } else if (buSelected && currentBu && !options?.skipBu) {
      // Com BU selecionada
      pageTitle = `${title} | Next ${buName}`;
      metaDescription = getDescriptionForPage(title, buName, options?.pageType, options?.customDescription);
    } else {
      // Sem BU (telas globais ou antes da seleção)
      pageTitle = `${title} | Next`;
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

    // Canonical: sempre apontar para o domínio oficial, sem query/hash,
    // para evitar duplicidade entre preview, lovable.app e next.jetimob.com.
    const canonicalHref = `${CANONICAL_ORIGIN}${window.location.pathname}`;
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", canonicalHref);

    // Robots: Hub é privado; só permitir indexação se explicitamente marcado.
    const robotsContent = options?.indexable ? "index,follow" : "noindex,nofollow";
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute("content", robotsContent);

    // Cleanup
    return () => {
      document.title = "Next";
    };
  }, [title, currentBu, buSelected, options?.skipBu, options?.hubOnly, options?.pageType, options?.customDescription, options?.indexable]);
}

function getDescriptionForPage(title: string, buName: string, pageType?: PageType, customDescription?: string): string {
  if (customDescription) return customDescription;

  // Descrições específicas por página com BU
  const descriptions: Record<string, string> = {
    "Home": `Visão geral da ${buName} no Next, com acesso rápido a cultura, OKRs, KPIs e informações do time.`,
    "OKRs": `Gerencie os OKRs da ${buName} e acompanhe o progresso das metas no Next.`,
    "Dashboard OKRs": `Acompanhe o progresso dos OKRs da ${buName} com visão consolidada no Next.`,
    "Dashboard Executivo": `Visão executiva dos OKRs e resultados da ${buName} no Next.`,
    "KPIs": `Gerencie os KPIs da ${buName} e acompanhe indicadores estratégicos no Next.`,
    "Times": `Gerencie os times da ${buName} e a estrutura organizacional no Next.`,
    "Pessoas": `Gerencie as pessoas da ${buName} e informações do time no Next.`,
    "Configurações": `Gerencie as configurações da ${buName} no Next.`,
    "Perfil": `Visualize e edite seu perfil no Next ${buName}.`,
    "Integrações": `Gerencie as integrações da ${buName} no Next.`,
    "Agentes IA": `Configure e gerencie agentes de IA da ${buName} no Next.`,
    "Módulos": `Visualize os módulos disponíveis para a ${buName} no Next.`,
    // Assets
    "Ativos": `Gerencie inventário, chaveiros e brindes corporativos da ${buName} no Next.`,
    "Inventário": `Gerencie equipamentos e itens do inventário da ${buName} no Next.`,
    "Chaveiros": `Gerencie chaveiros e controle de acessos físicos da ${buName} no Next.`,
    "Brindes": `Gerencie brindes corporativos e controle de estoque da ${buName} no Next.`,
    "Relatórios de Ativos": `Acompanhe métricas de inventário, chaveiros e brindes da ${buName} no Next.`,
    "Configurações de Ativos": `Configure categorias, inventário e claviculários de ativos da ${buName}.`,
    // Projects
    "Projetos": `Gerencie projetos estratégicos e acompanhe milestones da ${buName} no Next.`,
    // Tickets
    "Tickets": `Gerencie tickets internos e externos, acompanhe status, prazos e mensagens da ${buName} no Next.`,
    "Configurações de Tickets": `Configure empresas parceiras, categorias e regras de roteamento de tickets da ${buName}.`,
  };

  return descriptions[title] || `Gerencie ${title.toLowerCase()} da ${buName} no Next.`;
}

function getGlobalDescription(title: string, pageType?: PageType, customDescription?: string): string {
  if (customDescription) return customDescription;

  // Descrições para telas globais (sem BU)
  const globalDescriptions: Record<string, string> = {
    "Login": "Acesse o Hub para gerenciar pessoas, times, OKRs, KPIs e a operação da Jet.",
    "Configurações": "Gerencie as configurações globais do Next, integrações, usuários e permissões.",
    "Integrações": "Gerencie as integrações globais do Next.",
    "Usuários": "Gerencie os usuários e permissões do Next.",
    "Unidades de Negócio": "Gerencie as unidades de negócio cadastradas no Next.",
    "Página não encontrada": "Esta página não existe ou mudou de lugar. Volte para a Home do Next e acesse seus módulos e atalhos.",
  };

  return globalDescriptions[title] || `Gerencie ${title.toLowerCase()} no Next.`;
}
