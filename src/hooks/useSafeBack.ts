/**
 * useSafeBack - Hook para navegação "voltar" com fallback hierárquico
 * 
 * Evita "becos sem saída" quando history.back() não é seguro.
 * Implementa fallback hierárquico:
 * 1. Tentar history.back() se há histórico interno
 * 2. Fallback para raiz do módulo
 * 3. Fallback para home (com ou sem BU)
 * 
 * @example
 * const goBack = useSafeBack({ moduleRoot: '/okrs' });
 * <Button onClick={goBack}>Voltar</Button>
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBu } from '@/contexts/BuContext';

export interface UseSafeBackOptions {
  /** Rota raiz do módulo atual (ex: '/okrs', '/tickets') */
  moduleRoot?: string;
  /** Rota de fallback final (padrão: '/' ou '/select-bu') */
  fallback?: string;
  /** Se true, sempre usa moduleRoot ao invés de tentar history.back() */
  alwaysUseModuleRoot?: boolean;
}

export function useSafeBack(options?: UseSafeBackOptions) {
  const navigate = useNavigate();
  const { buSelected } = useBu();
  
  return useCallback(() => {
    // Se sempre usar moduleRoot foi especificado
    if (options?.alwaysUseModuleRoot && options?.moduleRoot) {
      navigate(options.moduleRoot);
      return;
    }
    
    // 1. Tentar history.back() se há histórico interno
    // Verificamos se:
    // - Há mais de 2 entradas no histórico (página atual + pelo menos 1 anterior)
    // - O referrer é do mesmo domínio (não veio de link externo)
    const hasInternalHistory = window.history.length > 2;
    const isFromSameOrigin = document.referrer && 
      document.referrer.includes(window.location.origin);
    
    if (hasInternalHistory && isFromSameOrigin) {
      navigate(-1);
      return;
    }
    
    // 2. Fallback para raiz do módulo
    if (options?.moduleRoot) {
      navigate(options.moduleRoot);
      return;
    }
    
    // 3. Fallback para home (com ou sem BU)
    const defaultFallback = buSelected ? '/' : '/select-bu';
    navigate(options?.fallback ?? defaultFallback);
  }, [navigate, buSelected, options?.moduleRoot, options?.fallback, options?.alwaysUseModuleRoot]);
}

/**
 * Hook simplificado para módulos com rota raiz conhecida
 */
export function useModuleBack(moduleRoot: string) {
  return useSafeBack({ moduleRoot });
}
