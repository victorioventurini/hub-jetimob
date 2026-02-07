import { useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  AlertTriangle, 
  Info, 
  Target, 
  Flag,
  Users,
  GitBranch,
  Layers
} from "lucide-react";
import { useTeamDependencies } from "@/hooks/useTeamDependencies";
import type { DependencyItem } from "@/hooks/useUserDependencies";

interface TeamDependenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  teamName: string;
  action: "delete" | "deactivate";
  onConfirm?: () => void;
  isProcessing?: boolean;
}

/**
 * Dialog that shows team dependencies before deletion/deactivation.
 * Blocks the action if mandatory dependencies exist.
 */
export function TeamDependenciesDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  action,
  onConfirm,
  isProcessing = false,
}: TeamDependenciesDialogProps) {
  const deps = useTeamDependencies(teamId);

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

  const renderOptionalBadges = (title: string, icon: React.ReactNode, items: DependencyItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="outline" className="ml-auto">
            {items.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item.id} variant="secondary">
              {item.name}
            </Badge>
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
              ? `Não é possível ${actionText} o time`
              : `${actionTextCapitalized} time`
            }
          </DialogTitle>
          <DialogDescription>
            {deps.hasMandatoryDependencies 
              ? `O time "${teamName}" possui dependências que precisam ser resolvidas primeiro.`
              : `Confirme a ação para ${actionText} o time "${teamName}".`
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
                      <strong>{deps.totalMandatory}</strong> dependências bloqueiam esta ação.
                      Resolva-as antes de continuar.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    {renderMandatorySection(
                      "Objetivos de Time ativos",
                      <Flag className="h-4 w-4 text-primary" />,
                      deps.mandatory.teamObjectives
                    )}
                    {renderMandatorySection(
                      "Key Results ativos",
                      <Target className="h-4 w-4 text-primary" />,
                      deps.mandatory.teamKrs
                    )}
                    {renderMandatorySection(
                      "Sub-times vinculados",
                      <GitBranch className="h-4 w-4 text-orange-500" />,
                      deps.mandatory.subteams
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      <strong>Como resolver:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      {deps.mandatory.teamObjectives.length > 0 && (
                        <li>Cancele ou conclua os objetivos do time</li>
                      )}
                      {deps.mandatory.teamKrs.length > 0 && (
                        <li>Cancele ou conclua os Key Results</li>
                      )}
                      {deps.mandatory.subteams.length > 0 && (
                        <li>Mova os sub-times para outro time pai ou exclua-os</li>
                      )}
                    </ul>
                  </div>
                </>
              )}

              {/* Optional Dependencies - Auto-cleared */}
              {deps.totalOptional > 0 && (
                <>
                  {deps.hasMandatoryDependencies && <Separator />}
                  <Alert className="border-warning/50 bg-warning/10">
                    <Info className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      <strong>{deps.totalOptional}</strong> itens serão atualizados automaticamente
                      {action === "delete" && " (membros desvinculados, squads removidos)"}.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-4">
                    {renderOptionalBadges(
                      "Membros (serão desvinculados)",
                      <Users className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.members
                    )}
                    {renderOptionalBadges(
                      "Squads (serão removidos)",
                      <Layers className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.squads
                    )}
                  </div>
                </>
              )}

              {/* No dependencies */}
              {!deps.hasMandatoryDependencies && deps.totalOptional === 0 && (
                <Alert className="border-primary/50 bg-primary/10">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Nenhuma dependência encontrada. Você pode {actionText} o time com segurança.
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
