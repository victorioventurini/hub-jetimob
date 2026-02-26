/**
 * VisualIdentityTab — Logotipo e manual de identidade visual do patrocinador
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Image, FileText, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VisualIdentityTab() {
  return (
    <div className="space-y-6">
      {/* Logotipo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            Logotipo do Patrocinador
            <HelpTooltip content="Logo principal exibido nos materiais do evento, dashboards e relatórios. Formato recomendado: SVG ou PNG com fundo transparente." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-center justify-center w-48 h-24">
              <img
                src="/images/sponsors/porto-seguro-logo.svg"
                alt="Logo Porto Seguro"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Porto Seguro</p>
              <p className="text-xs text-muted-foreground">porto-seguro-logo.svg · SVG · 4.2 KB</p>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Ativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual de Identidade Visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Manual de Identidade Visual
            <HelpTooltip content="Documento PDF com as diretrizes de uso da marca do patrocinador: cores, tipografia, aplicações permitidas e proibidas." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Manual_ID_Visual_Porto_Seguro_2026.pdf</p>
                <p className="text-xs text-muted-foreground">PDF · 2.8 MB · Enviado em 15/01/2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Aprovado
              </Badge>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Baixar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
