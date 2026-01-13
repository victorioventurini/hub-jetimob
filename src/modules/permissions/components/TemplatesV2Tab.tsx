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
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Settings, Eye, Wrench, Settings2, Lock, Pencil } from "lucide-react";
import { usePermissionTemplatesV2, PermissionTemplateV2 } from "../hooks/usePermissionsV2";
import { TemplateEditorSheet } from "./TemplateEditorSheet";
import { SURFACE_COLORS, type PermissionSurface } from "@/lib/colors";

const SURFACE_ICONS = {
  view: Eye,
  operate: Wrench,
  administer: Settings2,
  base: Eye,
  restricted: Lock,
};

const getSurfaceColor = (surface: string): string => {
  return SURFACE_COLORS[surface as PermissionSurface]?.badge || SURFACE_COLORS.base.badge;
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
        Clique em "Editar" para configurar as permissões de cada template.
      </p>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Surface</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => {
              const SurfaceIcon = SURFACE_ICONS[template.surface as keyof typeof SURFACE_ICONS] || Eye;
              const surfaceColor = getSurfaceColor(template.surface || 'base');
              
              return (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="font-medium">{template.name}</span>
                        <code className="block text-xs text-muted-foreground font-mono">
                          {template.slug}
                        </code>
                      </div>
                      {template.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Sistema
                        </Badge>
                      )}
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
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Template Editor Sheet */}
      <TemplateEditorSheet
        template={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      />
    </div>
  );
}
