/**
 * ProjectViewToggle — Toggle entre visualização Lista e Gantt
 */

import { Button } from '@/components/ui/button';
import { LayoutGrid, GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProjectViewMode = 'list' | 'gantt';

interface ProjectViewToggleProps {
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
}

const views = [
  { id: 'list' as const, label: 'Lista', icon: LayoutGrid },
  { id: 'gantt' as const, label: 'Gantt', icon: GanttChart },
] as const;

export function ProjectViewToggle({ viewMode, onViewModeChange }: ProjectViewToggleProps) {
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
