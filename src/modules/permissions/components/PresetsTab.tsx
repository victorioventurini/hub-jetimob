import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Eye, 
  Wrench, 
  Settings2, 
  Shield,
  FileStack,
  ChevronRight
} from "lucide-react";
import { usePermissionPresets, usePresetItems, type PermissionPreset } from "../hooks/usePermissionGovernance";

const SURFACE_ICONS = {
  view: Eye,
  operate: Wrench,
  administer: Settings2,
} as const;

const SURFACE_COLORS: Record<string, string> = {
  view: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  operate: "bg-green-500/10 text-green-700 border-green-500/30",
  administer: "bg-orange-500/10 text-orange-700 border-orange-500/30",
};

export function PresetsTab() {
  const { presets, presetsByModule, isLoading } = usePermissionPresets();
  const [selectedPreset, setSelectedPreset] = useState<PermissionPreset | null>(null);

  if (isLoading) {
    return <LoadingState text="Carregando presets..." />;
  }

  if (presets.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nenhum preset configurado"
        description="Presets são conjuntos pré-definidos de templates para aplicação rápida."
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Presets são conjuntos de templates pré-configurados para aplicação rápida.
        Cada preset agrupa templates relacionados a uma função específica.
      </p>

      {/* Presets by Module */}
      {Object.entries(presetsByModule).map(([module, modulePresets]) => (
        <div key={module} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {module}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulePresets.map((preset) => {
              const SurfaceIcon = SURFACE_ICONS[preset.surface as keyof typeof SURFACE_ICONS] || Shield;
              const surfaceColor = SURFACE_COLORS[preset.surface || ""] || "bg-gray-500/10 text-gray-700";

              return (
                <Card 
                  key={preset.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedPreset(preset)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={surfaceColor}>
                        <SurfaceIcon className="h-3 w-3 mr-1" />
                        {preset.surface?.toUpperCase() || "BASE"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{preset.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {preset.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <code className="text-xs text-muted-foreground font-mono">
                      {preset.slug}
                    </code>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Preset Detail Sheet */}
      <PresetDetailSheet
        preset={selectedPreset}
        open={!!selectedPreset}
        onOpenChange={(open) => !open && setSelectedPreset(null)}
      />
    </div>
  );
}

function PresetDetailSheet({
  preset,
  open,
  onOpenChange,
}: {
  preset: PermissionPreset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { items, isLoading } = usePresetItems(preset?.id || null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {preset?.name}
          </SheetTitle>
          <SheetDescription>
            {preset?.description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{preset?.module || "global"}</Badge>
            {preset?.surface && (
              <Badge className={SURFACE_COLORS[preset.surface] || ""}>
                {preset.surface.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              Templates incluídos ({items.length})
            </h4>

            {isLoading ? (
              <LoadingState text="Carregando templates..." />
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum template configurado neste preset.
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {items.map((item) => {
                    const template = (item as unknown as { permission_templates_v2?: { name: string; slug: string; surface?: string; module?: string } }).permission_templates_v2;
                    if (!template) return null;

                    return (
                      <div
                        key={item.id}
                        className="border rounded-md p-3"
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        <code className="text-xs text-muted-foreground font-mono">
                          {template.slug}
                        </code>
                        <div className="flex gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {template.module || "global"}
                          </Badge>
                          {template.surface && (
                            <Badge variant="secondary" className="text-xs">
                              {template.surface}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
