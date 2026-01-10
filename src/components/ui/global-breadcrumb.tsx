/**
 * GlobalBreadcrumb - Breadcrumb padronizado para toda a plataforma
 * 
 * Padrão hierárquico: Hub → [Módulo] → [Página] → [Detalhe]
 * 
 * Cada módulo deve definir seus itens de breadcrumb, e este componente
 * garante consistência visual e de navegação.
 * 
 * @example
 * <GlobalBreadcrumb
 *   items={[
 *     { label: 'Tickets', href: '/tickets' },
 *     { label: 'Suporte #123' }
 *   ]}
 * />
 */

import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

export interface BreadcrumbItemConfig {
  /** Texto do item */
  label: string;
  /** Link (se omitido, é o item atual/final) */
  href?: string;
  /** Ícone opcional (componente Lucide) */
  icon?: React.ComponentType<{ className?: string }>;
}

export interface GlobalBreadcrumbProps {
  /** Itens do breadcrumb (sem incluir Home) */
  items: BreadcrumbItemConfig[];
  /** Se true, mostra ícone Home no início */
  showHome?: boolean;
  /** Classes adicionais */
  className?: string;
  /** Se true, usa estilo mais compacto */
  compact?: boolean;
}

export function GlobalBreadcrumb({
  items,
  showHome = true,
  className,
  compact = false,
}: GlobalBreadcrumbProps) {
  // Construir lista com Home no início (opcional)
  const allItems: BreadcrumbItemConfig[] = showHome
    ? [{ label: 'Hub', href: '/', icon: Home }, ...items]
    : items;

  return (
    <Breadcrumb className={cn(compact ? 'mb-2' : 'mb-4', className)}>
      <BreadcrumbList>
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Icon = item.icon;

          return (
            <BreadcrumbItem key={index}>
              {index > 0 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="w-3.5 h-3.5" />
                </BreadcrumbSeparator>
              )}
              
              {isLast ? (
                <BreadcrumbPage 
                  className={cn(
                    'flex items-center gap-1.5',
                    compact && 'text-xs'
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span className="truncate max-w-[200px]">{item.label}</span>
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    to={item.href || '#'} 
                    className={cn(
                      'flex items-center gap-1.5',
                      compact && 'text-xs'
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span className="truncate max-w-[150px]">{item.label}</span>
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Presets para módulos comuns
 */

export function TicketsBreadcrumb({ 
  ticketCode,
  ticketTitle,
}: { 
  ticketCode?: string;
  ticketTitle?: string;
}) {
  const items: BreadcrumbItemConfig[] = [
    { label: 'Tickets', href: '/tickets' },
  ];
  
  if (ticketCode) {
    items.push({ 
      label: ticketTitle ? `#${ticketCode} - ${ticketTitle}` : `#${ticketCode}` 
    });
  }
  
  return <GlobalBreadcrumb items={items} />;
}

export function AssetsBreadcrumb({ 
  assetCode,
  assetName,
}: { 
  assetCode?: string;
  assetName?: string;
}) {
  const items: BreadcrumbItemConfig[] = [
    { label: 'Ativos', href: '/assets' },
  ];
  
  if (assetCode) {
    items.push({ 
      label: assetName ? `#${assetCode} - ${assetName}` : `#${assetCode}` 
    });
  }
  
  return <GlobalBreadcrumb items={items} />;
}

export function UsersBreadcrumb({ 
  userName,
}: { 
  userName?: string;
}) {
  const items: BreadcrumbItemConfig[] = [
    { label: 'Pessoas', href: '/users' },
  ];
  
  if (userName) {
    items.push({ label: userName });
  }
  
  return <GlobalBreadcrumb items={items} />;
}

export function TeamsBreadcrumb({ 
  teamName,
}: { 
  teamName?: string;
}) {
  const items: BreadcrumbItemConfig[] = [
    { label: 'Times', href: '/teams' },
  ];
  
  if (teamName) {
    items.push({ label: teamName });
  }
  
  return <GlobalBreadcrumb items={items} />;
}

export function KpisBreadcrumb({ 
  kpiName,
}: { 
  kpiName?: string;
}) {
  const items: BreadcrumbItemConfig[] = [
    { label: 'KPIs', href: '/kpis' },
  ];
  
  if (kpiName) {
    items.push({ label: kpiName });
  }
  
  return <GlobalBreadcrumb items={items} />;
}

export function SettingsBreadcrumb({ 
  section,
}: { 
  section?: string;
}) {
  const items: BreadcrumbItemConfig[] = [
    { label: 'Configurações', href: '/settings' },
  ];
  
  if (section) {
    items.push({ label: section });
  }
  
  return <GlobalBreadcrumb items={items} />;
}
