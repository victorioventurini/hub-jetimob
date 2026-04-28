/**
 * RitualCalendarViewToggle — Toggle entre Calendário e Lista
 *
 * Espelha o padrão visual do `ProjectViewToggle` (/projects) para garantir
 * consistência de UI no app.
 */

import { Button } from '@/components/ui/button';
import { CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RitualCalendarViewMode = 'calendar' | 'list';

interface RitualCalendarViewToggleProps {
  viewMode: RitualCalendarViewMode;
  onViewModeChange: (mode: RitualCalendarViewMode) => void;
}

const views = [
  { id: 'calendar' as const, label: 'Calendário', icon: CalendarDays },
  { id: 'list' as const, label: 'Lista', icon: List },
] as const;

export function RitualCalendarViewToggle({
  viewMode,
  onViewModeChange,
}: RitualCalendarViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-muted rounded-lg">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = viewMode === view.id;

        return (
          <Button
            key={view.id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange(view.id)}
            aria-pressed={isActive}
            className={cn(
              'h-8 px-2 sm:px-3 gap-1.5 rounded-md transition-all text-xs sm:text-sm',
              isActive
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent',
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
