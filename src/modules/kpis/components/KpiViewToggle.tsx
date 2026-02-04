/**
 * KpiViewToggle - Toggle entre visualização Cards e Tabela
 * v2.86.0: Componente para alternar modo de exibição no KPI Dashboard
 * 
 * Segue o padrão do CycleCheckinsViewToggle
 */

import { Button } from '@/components/ui/button';
import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiViewMode = 'cards' | 'table';

interface KpiViewToggleProps {
  viewMode: KpiViewMode;
  onViewModeChange: (mode: KpiViewMode) => void;
  className?: string;
}

const views = [
  { id: 'cards' as const, label: 'Cards', icon: LayoutGrid },
  { id: 'table' as const, label: 'Tabela', icon: Table2 },
] as const;

export function KpiViewToggle({ 
  viewMode, 
  onViewModeChange,
  className,
}: KpiViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-0.5 p-1 bg-muted rounded-lg", className)}>
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = viewMode === view.id;
        
        return (
          <Button
            key={view.id}
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange(view.id)}
            className={cn(
              "h-8 px-2 sm:px-3 gap-1.5 rounded-md transition-all text-xs sm:text-sm",
              isActive 
                ? "bg-background shadow-sm text-foreground font-medium" 
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
