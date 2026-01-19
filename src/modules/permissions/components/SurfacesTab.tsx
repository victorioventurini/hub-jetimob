import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Eye, Wrench, Settings2, Lock } from "lucide-react";
import { usePermissionTemplatesV2 } from "@/modules/permissions/hooks";
import { SURFACE_COLORS, type PermissionSurface } from "@/lib/colors";

const SURFACE_CONFIG = {
  view: { icon: Eye, label: "VIEW", color: SURFACE_COLORS.view.full },
  operate: { icon: Wrench, label: "OPERATE", color: SURFACE_COLORS.operate.full },
  administer: { icon: Settings2, label: "ADMINISTER", color: SURFACE_COLORS.administer.full },
  base: { icon: Eye, label: "BASE", color: SURFACE_COLORS.base.full },
  restricted: { icon: Lock, label: "RESTRICTED", color: SURFACE_COLORS.restricted.full },
};

const MODULES = [
  { key: 'okrs', label: 'OKRs' },
  { key: 'kpis', label: 'KPIs' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'assets', label: 'Assets' },
  { key: 'teams', label: 'Times' },
  { key: 'users', label: 'Usuários' },
];

export function SurfacesTab() {
  const { templates, templatesByModule, isLoading } = usePermissionTemplatesV2();

  if (isLoading) {
    return <LoadingState text="Carregando surfaces..." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Permission Surfaces</h3>
        <p className="text-sm text-muted-foreground">
          Surfaces agrupam permissões por intenção de uso, simplificando a atribuição.
          Cada módulo pode ter até 3 surfaces: VIEW (leitura), OPERATE (ações do dia-a-dia) e ADMINISTER (configurações).
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(SURFACE_CONFIG).slice(0, 3).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-2">
              <Badge variant="outline" className={config.color}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {key === 'view' && 'Leitura e navegação'}
                {key === 'operate' && 'Ações operacionais'}
                {key === 'administer' && 'Configurações e gestão'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modules Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const moduleTemplates = templatesByModule[mod.key] || [];
          
          return (
            <Card key={mod.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{mod.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {moduleTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum template v2</p>
                ) : (
                  moduleTemplates.map((t) => {
                    const surfaceConfig = SURFACE_CONFIG[t.surface as keyof typeof SURFACE_CONFIG] || SURFACE_CONFIG.base;
                    const Icon = surfaceConfig.icon;
                    
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={surfaceConfig.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {surfaceConfig.label}
                          </Badge>
                          <span className="text-sm">{t.name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Global Templates */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Templates Globais (sem módulo específico)</h4>
        <div className="flex gap-2 flex-wrap">
          {(templatesByModule['global'] || []).map((t) => (
            <Badge key={t.id} variant="secondary">
              {t.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
