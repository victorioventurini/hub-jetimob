import { Building2, ChevronDown, Check, ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";

export function BuSelector() {
  const navigate = useNavigate();
  const { currentBu, userBus, hasMultipleBus, switchBu, clearBuSelection } = useBu();
  const { role } = useAuth();

  const isSuperAdmin = role === "super_admin";

  // Always show for super_admin, otherwise only if user has multiple BUs
  if (!isSuperAdmin && (!hasMultipleBus || !currentBu)) {
    return null;
  }

  // If no currentBu selected yet (super_admin case), show a placeholder
  if (!currentBu) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/select-bu")}>
        <Building2 className="h-4 w-4" />
        <span>Selecionar BU</span>
      </Button>
    );
  }

  const handleSwitchBu = (buId: string) => {
    switchBu(buId);
  };

  const handleViewAllBus = () => {
    clearBuSelection();
    navigate("/select-bu");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentBu.symbol_url ? (
            <img 
              src={currentBu.symbol_url} 
              alt={currentBu.name} 
              className="h-4 w-4 object-contain"
            />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          <span className="max-w-[150px] truncate">{currentBu.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        {userBus.map((membership) => (
          <DropdownMenuItem
            key={membership.bu_id}
            onClick={() => handleSwitchBu(membership.bu_id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {membership.bu_unit?.symbol_url ? (
                <img 
                  src={membership.bu_unit.symbol_url} 
                  alt={membership.bu_unit.name} 
                  className="h-4 w-4 object-contain"
                />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{membership.bu_unit?.name}</span>
            </div>
            {membership.bu_id === currentBu.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
