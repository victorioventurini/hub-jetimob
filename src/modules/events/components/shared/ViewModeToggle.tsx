/**
 * ViewModeToggle — Toggle Sponsor View / Admin View
 */
import { Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEventsContext } from "../../context/EventsContext";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useEventsContext();

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        size="sm"
        variant={viewMode === "sponsor" ? "default" : "ghost"}
        className="h-8 text-xs gap-1.5"
        onClick={() => setViewMode("sponsor")}
      >
        <Eye className="h-3.5 w-3.5" />
        Patrocinador
      </Button>
      <Button
        size="sm"
        variant={viewMode === "admin" ? "default" : "ghost"}
        className="h-8 text-xs gap-1.5"
        onClick={() => setViewMode("admin")}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Admin
      </Button>
    </div>
  );
}
