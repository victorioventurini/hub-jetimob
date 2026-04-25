/**
 * ResourceNotFoundState - Estado para recursos que não existem mais
 * 
 * Diferente do 404 de página, este é para quando um recurso específico
 * (OKR, ticket, ativo, etc.) foi removido ou o usuário não tem acesso.
 * 
 * Oferece sempre uma saída clara e orientação para o usuário.
 * 
 * @example
 * if (!objective) {
 *   return (
 *     <ResourceNotFoundState
 *       resourceType="objetivo"
 *       resourceId={objectiveId}
 *       moduleRoot="/okrs"
 *     />
 *   );
 * }
 */

import { Ghost, ArrowLeft, List } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSafeBack } from '@/hooks/useSafeBack';
import { cn } from '@/lib/utils';

export type ResourceNotFoundVariant = 'not_found' | 'cancelled' | 'context_loading';

export interface ResourceNotFoundStateProps {
  /** Tipo do recurso em português (ex: "objetivo", "ticket", "ativo") */
  resourceType: string;
  /** ID ou código do recurso tentado (opcional, para debug) */
  resourceId?: string;
  /** Rota raiz do módulo para "Ver todos" */
  moduleRoot: string;
  /** Label customizado para botão "Ver todos" */
  viewAllLabel?: string;
  /** Mensagem customizada (sobrescreve padrão) */
  customMessage?: string;
  /** Classes adicionais */
  className?: string;
  /** Se true, mostra o ID do recurso para debug */
  showResourceId?: boolean;
  /**
   * Variante de mensagem. Default 'not_found'.
   * - 'cancelled': recurso foi explicitamente cancelado/arquivado
   * - 'context_loading': contexto (BU) ainda hidratando — sugere recarregar
   */
  variant?: ResourceNotFoundVariant;
}

export function ResourceNotFoundState({
  resourceType,
  resourceId,
  moduleRoot,
  viewAllLabel,
  customMessage,
  className,
  showResourceId = false,
  variant = 'not_found',
}: ResourceNotFoundStateProps) {
  const navigate = useNavigate();
  const goBack = useSafeBack({ moduleRoot });
  
  // Pluralizar de forma simples (português)
  const plural = resourceType.endsWith('ão') 
    ? resourceType.replace(/ão$/, 'ões')
    : resourceType + 's';
  
  const headingByVariant: Record<ResourceNotFoundVariant, string> = {
    not_found: `Este ${resourceType} não existe mais`,
    cancelled: `Este ${resourceType} foi cancelado`,
    context_loading: 'Carregando contexto...',
  };
  const defaultMessageByVariant: Record<ResourceNotFoundVariant, string> = {
    not_found: `O ${resourceType} que você tentou acessar foi removido ou você não tem permissão para visualizá-lo.`,
    cancelled: `Este ${resourceType} foi cancelado e não pode mais receber alterações.`,
    context_loading: `Estamos finalizando o carregamento da sua Business Unit. Se a tela não atualizar em alguns segundos, recarregue a página.`,
  };
  const heading = headingByVariant[variant];
  const defaultMessage = defaultMessageByVariant[variant];
  
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-4',
        className
      )}
    >
      <div className="rounded-full bg-muted flex items-center justify-center w-16 h-16 mb-4">
        <Ghost className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {heading}
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-6">
        {customMessage || defaultMessage}
      </p>
      
      {showResourceId && resourceId && (
        <p className="text-xs text-muted-foreground/60 font-mono mb-4">
          ID: {resourceId}
        </p>
      )}
      
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button asChild>
          <Link to={moduleRoot}>
            <List className="w-4 h-4 mr-2" />
            {viewAllLabel || `Ver ${plural}`}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Variante compacta para uso em cards/seções
 */
export function ResourceNotFoundCompact({
  resourceType,
  onBack,
  className,
}: {
  resourceType: string;
  onBack?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center py-8 px-4 text-center', className)}>
      <Ghost className="w-8 h-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-3">
        Este {resourceType} não está mais disponível.
      </p>
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-3 h-3 mr-1" />
          Voltar
        </Button>
      )}
    </div>
  );
}
