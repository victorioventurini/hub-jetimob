/**
 * BuSymbol - Componente para exibir o símbolo/ícone de uma BU
 * 
 * Renderiza o SVG com a cor primária da BU quando está em fundo claro,
 * evitando o problema de ícone branco em fundo branco.
 */

import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuSymbolProps {
  symbolUrl?: string | null;
  primaryColor?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** 
   * Quando true, usa a cor primária da BU para colorir o ícone.
   * Útil quando o fundo é claro e o SVG pode ser branco.
   */
  useColorFilter?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function BuSymbol({
  symbolUrl,
  primaryColor,
  name,
  size = 'sm',
  className,
  useColorFilter = true,
}: BuSymbolProps) {
  const sizeClass = sizeClasses[size];

  if (!symbolUrl) {
    return (
      <Building2 
        className={cn(sizeClass, 'text-muted-foreground', className)} 
      />
    );
  }

  // Se tiver cor primária e useColorFilter, aplicar como background com mask
  // Isso funciona para SVGs brancos/monocromáticos
  if (useColorFilter && primaryColor) {
    return (
      <div
        className={cn(sizeClass, 'shrink-0', className)}
        style={{
          backgroundColor: primaryColor,
          WebkitMaskImage: `url(${symbolUrl})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url(${symbolUrl})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
        role="img"
        aria-label={name}
      />
    );
  }

  // Fallback: renderizar como imagem normal
  return (
    <img
      src={symbolUrl}
      alt={name}
      className={cn(sizeClass, 'object-contain', className)}
    />
  );
}
