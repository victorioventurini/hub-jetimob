import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Settings, Eye, Wrench, Settings2 } from "lucide-react";
import { usePermissionTemplatesV2, useTemplateItemsV2, PermissionTemplateV2 } from "../hooks/usePermissionsV2";

const SURFACE_ICONS = {
  view: Eye,
  operate: Wrench,
  administer: Settings2,
  base: Eye,
  restricted: Eye,
};

const SURFACE_COLORS: Record<string, string> = {
  view: "bg-blue-500/10 text-blue-700",
  operate: "bg-green-500/10 text-green-700",
  administer: "bg-orange-500/10 text-orange-700",
  base: "bg-gray-500/10 text-gray-700",
  restricted: "bg-red-500/10 text-red-700",
};

export function TemplatesV2Tab() {
  const { templates, isLoading } = usePermissionTemplatesV2();
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplateV2 | null>(null);

  if (isLoading) {
    return <LoadingState text="Carregando templates v2..." />;
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={Settings}
        title="Nenhum template v2"
        description="Templates v2 serão criados via migration"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Templates v2 são organizados por módulo e surface, permitindo atribuição mais granular e semântica.
        Usuários podem ter múltiplos templates v2 atribuídos.
      </p>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Surface</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => {
              const SurfaceIcon = SURFACE_ICONS[template.surface as keyof typeof SURFACE_ICONS] || Eye;
              const surfaceColor = SURFACE_COLORS[template.surface || 'base'] || SURFACE_COLORS.base;
              
              return (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{template.name}</span>
                      <code className="block text-xs text-muted-foreground font-mono">
                        {template.slug}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.module || 'global'}</Badge>
                  </TableCell>
                  <TableCell>
                    {template.surface && (
                      <Badge className={surfaceColor}>
                        <SurfaceIcon className="h-3 w-3 mr-1" />
                        {template.surface.toUpperCase()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {template.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Template Detail Sheet */}
      <TemplateDetailSheet
        template={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      />
    </div>
  );
}

function TemplateDetailSheet({
  template,
  open,
  onOpenChange,
}: {
  template: PermissionTemplateV2 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { keys, isLoading } = useTemplateItemsV2(template?.id || null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{template?.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Badge variant="outline">{template?.module || 'global'}</Badge>
            {template?.surface && (
              <Badge className={SURFACE_COLORS[template.surface] || ''}>
                {template.surface.toUpperCase()}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {template?.description}
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Permission Keys ({keys.length})
            </h4>
            
            {isLoading ? (
              <LoadingState text="Carregando keys..." />
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma key atribuída a este template
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-1">
                {keys.map((key) => (
                  <code
                    key={key}
                    className="block text-xs bg-muted px-2 py-1 rounded font-mono"
                  >
                    {key}
                  </code>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
