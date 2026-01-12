import { Button } from '@/components/ui/button';
import { Building2, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBu } from '@/contexts/BuContext';

export type OkrView = 'company' | 'team' | 'my';

interface OkrViewSelectorProps {
  activeView: OkrView;
  onViewChange: (view: OkrView) => void;
  showMyOkrs?: boolean;
}

export function OkrViewSelector({ activeView, onViewChange, showMyOkrs = true }: OkrViewSelectorProps) {
  const { currentBu } = useBu();
  
  const views = [
    { id: 'company' as const, label: `OKRs ${currentBu?.name || 'da Empresa'}`, icon: Building2 },
    { id: 'team' as const, label: 'OKRs do Time', icon: Users },
    { id: 'my' as const, label: 'Meus OKRs', icon: User },
  ];
  
  const filteredViews = showMyOkrs ? views : views.filter(v => v.id !== 'my');
  
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-muted rounded-lg shrink-0">
      {filteredViews.map((view) => {
        const Icon = view.icon;
        const isActive = activeView === view.id;
        
        // Shorter labels for mobile
        const mobileLabel = view.id === 'company' ? 'Org' : view.id === 'team' ? 'Time' : 'Meus';
        
        return (
          <Button
            key={view.id}
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(view.id)}
            className={cn(
              "h-8 sm:h-9 px-2 sm:px-3 gap-1.5 sm:gap-2 rounded-md transition-all text-xs sm:text-sm",
              isActive 
                ? "bg-background shadow-sm text-foreground font-medium" 
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden xs:inline sm:hidden">{mobileLabel}</span>
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
