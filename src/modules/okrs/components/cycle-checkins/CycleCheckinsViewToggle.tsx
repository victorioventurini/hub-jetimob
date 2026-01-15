/**
 * CycleCheckinsViewToggle - Toggle entre visualização Cards, Tabela e Evolução
 */

import { Button } from '@/components/ui/button';
import { LayoutGrid, Table2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckinsViewMode = 'cards' | 'table' | 'evolution';

interface CycleCheckinsViewToggleProps {
  viewMode: CheckinsViewMode;
  onViewModeChange: (mode: CheckinsViewMode) => void;
}

const views = [
  { id: 'cards' as const, label: 'Cards', icon: LayoutGrid },
  { id: 'table' as const, label: 'Tabela', icon: Table2 },
  { id: 'evolution' as const, label: 'Evolução', icon: TrendingUp },
] as const;

export function CycleCheckinsViewToggle({ 
  viewMode, 
  onViewModeChange 
}: CycleCheckinsViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-muted rounded-lg">
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
