import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { useCloseOnRouteChange } from "@/hooks/useCloseOnRouteChange";
import { BuSymbol } from "./BuSymbol";

export function BuSelector() {
  const { currentBu, userBus, hasMultipleBus, switchBu } = useBu();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  
  // Fecha o dropdown ao mudar de rota
  useCloseOnRouteChange(open, setOpen);

  // Always show for admin (includes super_admin), otherwise only if user has multiple BUs
  if (!isAdmin && (!hasMultipleBus || !currentBu)) {
    return null;
  }

  // If no currentBu selected yet (super_admin case), show a placeholder
  if (!currentBu) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/select-bu">
          <Building2 className="h-4 w-4" />
          <span>Selecionar BU</span>
        </Link>
      </Button>
    );
  }

  const handleSwitchBu = (buId: string) => {
    switchBu(buId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BuSymbol
            symbolUrl={currentBu.symbol_url}
            primaryColor={currentBu.primary_color}
            name={currentBu.name}
            size="sm"
          />
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
              <BuSymbol
                symbolUrl={membership.bu_unit?.symbol_url}
                primaryColor={membership.bu_unit?.primary_color}
                name={membership.bu_unit?.name || ''}
                size="sm"
              />
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
