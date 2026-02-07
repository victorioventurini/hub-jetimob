import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  AlertTriangle, 
  Info, 
  Users
} from "lucide-react";
import { useAreaDependencies } from "@/hooks/useAreaDependencies";
import type { DependencyItem } from "@/hooks/useUserDependencies";

interface AreaDependenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: string | null;
  areaName: string;
  action: "delete" | "deactivate";
  onConfirm?: () => void;
  isProcessing?: boolean;
}

/**
 * Dialog that shows area dependencies before deletion/deactivation.
 * Blocks the action if teams are still linked to this area.
 */
export function AreaDependenciesDialog({
  open,
  onOpenChange,
  areaId,
  areaName,
  action,
  onConfirm,
  isProcessing = false,
}: AreaDependenciesDialogProps) {
  const deps = useAreaDependencies(areaId);

  const actionText = action === "delete" ? "excluir" : "desativar";
  const actionTextCapitalized = action === "delete" ? "Excluir" : "Desativar";

  const renderMandatorySection = (
    title: string,
    icon: React.ReactNode,
    items: DependencyItem[]
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="destructive" className="ml-auto">
            {items.length}
          </Badge>
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-sm"
            >
              <span className="truncate" title={item.name}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const canProceed = !deps.hasMandatoryDependencies;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {deps.hasMandatoryDependencies 
              ? `Não é possível ${actionText} a área`
              : `${actionTextCapitalized} área`
            }
          </DialogTitle>
          <DialogDescription>
            {deps.hasMandatoryDependencies 
              ? `A área "${areaName}" possui times vinculados que precisam ser movidos primeiro.`
              : `Confirme a ação para ${actionText} a área "${areaName}".`
            }
          </DialogDescription>
        </DialogHeader>

        {deps.isLoading ? (
          <LoadingState text="Verificando dependências..." />
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Mandatory Dependencies - Block action */}
              {deps.hasMandatoryDependencies && (
                <>
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{deps.totalMandatory}</strong> times estão vinculados a esta área.
                      Mova-os para outra área antes de continuar.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    {renderMandatorySection(
                      "Times vinculados",
                      <Users className="h-4 w-4 text-primary" />,
                      deps.mandatory.teams
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      <strong>Como resolver:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>Edite cada time e mova-o para outra área</li>
                      <li>Ou remova a vinculação de área dos times</li>
                    </ul>
                  </div>
                </>
              )}

              {/* No dependencies */}
              {!deps.hasMandatoryDependencies && (
                <Alert className="border-primary/50 bg-primary/10">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Nenhum time vinculado. Você pode {actionText} a área com segurança.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deps.isLoading || !canProceed}
            isLoading={isProcessing}
            loadingText={action === "delete" ? "Excluindo..." : "Desativando..."}
          >
            {canProceed ? actionTextCapitalized : "Resolver dependências"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
