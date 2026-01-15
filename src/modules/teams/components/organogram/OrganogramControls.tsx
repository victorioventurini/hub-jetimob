/**
 * OrganogramControls - Controles de zoom, filtros e orientação
 */
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrganogramFilters, OrganogramControlsState } from "../../types/organogram";

interface OrganogramControlsProps {
  filters: OrganogramFilters;
  onFiltersChange: (filters: OrganogramFilters) => void;
  controls: OrganogramControlsState;
  onControlsChange: (controls: OrganogramControlsState) => void;
  onFitToScreen: () => void;
  onOpenFullscreen: () => void;
}

export function OrganogramControls({
  filters,
  onFiltersChange,
  controls,
  onControlsChange,
  onFitToScreen,
  onOpenFullscreen,
}: OrganogramControlsProps) {
  const handleZoomIn = () => {
    onControlsChange({
      ...controls,
      zoom: Math.min(controls.zoom + 10, 150),
    });
  };

  const handleZoomOut = () => {
    onControlsChange({
      ...controls,
      zoom: Math.max(controls.zoom - 10, 50),
    });
  };

  const handleResetZoom = () => {
    onControlsChange({
      ...controls,
      zoom: 100,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg shadow-sm">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          className="pl-10"
        />
      </div>

      <Separator orientation="vertical" className="h-8 hidden sm:block" />

      {/* Toggles */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="show-members"
            checked={filters.showMembers}
            onCheckedChange={(checked) => 
              onFiltersChange({ ...filters, showMembers: checked })
            }
          />
          <Label htmlFor="show-members" className="text-sm cursor-pointer">
            Membros
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-squads"
            checked={filters.showSquads}
            onCheckedChange={(checked) => 
              onFiltersChange({ ...filters, showSquads: checked })
            }
          />
          <Label htmlFor="show-squads" className="text-sm cursor-pointer">
            Squads
          </Label>
        </div>
      </div>

      <Separator orientation="vertical" className="h-8 hidden sm:block" />

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={controls.zoom <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Diminuir zoom</TooltipContent>
        </Tooltip>

        <div className="w-24 flex items-center gap-2">
          <Slider
            value={[controls.zoom]}
            onValueChange={([value]) => 
              onControlsChange({ ...controls, zoom: value })
            }
            min={50}
            max={150}
            step={10}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {controls.zoom}%
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={controls.zoom >= 150}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aumentar zoom</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleResetZoom}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resetar zoom</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-8 hidden sm:block" />

      {/* View controls */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onFitToScreen}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ajustar à tela</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenFullscreen}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir em nova aba</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
