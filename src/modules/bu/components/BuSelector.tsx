import { Building2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBu } from "@/contexts/BuContext";

export function BuSelector() {
  const { currentBu, userBus, hasMultipleBus, switchBu } = useBu();

  // Don't render if user only has access to one BU
  if (!hasMultipleBus || !currentBu) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{currentBu.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {userBus.map((membership) => (
          <DropdownMenuItem
            key={membership.bu_id}
            onClick={() => switchBu(membership.bu_id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{membership.bu_unit?.name}</span>
            {membership.bu_id === currentBu.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
