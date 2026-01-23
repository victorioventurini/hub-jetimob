import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Minus, 
  AlertTriangle, 
  Shield, 
  Loader2,
  CheckCircle2
} from "lucide-react";
import type { PermissionDiff } from "../hooks";

interface PermissionDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  additions: PermissionDiff[];
  removals: PermissionDiff[];
  onConfirm: (reason: string) => Promise<void>;
  isPending?: boolean;
}

export function PermissionDiffDialog({
  open,
  onOpenChange,
  userName,
  additions,
  removals,
  onConfirm,
  isPending = false,
}: PermissionDiffDialogProps) {
  const [reason, setReason] = useState("");

  const hasHighRiskChanges = removals.length > 5 || additions.some(a => 
    a.permission_key.includes("admin") || a.permission_key.includes("delete")
  );

  const riskLevel = hasHighRiskChanges ? "high" : removals.length > 0 ? "medium" : "low";

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
    setReason("");
    onOpenChange(false);
  };

  const noChanges = additions.length === 0 && removals.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Confirmar Alterações de Permissão
          </DialogTitle>
          <DialogDescription>
            Revise as mudanças antes de aplicar para <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        {noChanges ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma alteração detectada. As permissões já estão configuradas conforme selecionado.
            </p>
          </div>
        ) : (
          <>
            {riskLevel !== "low" && (
              <Alert variant={riskLevel === "high" ? "destructive" : "default"} className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {riskLevel === "high" 
                    ? "⚠️ Alteração de alto risco: inclui permissões administrativas ou remoção significativa de acessos."
                    : "Atenção: algumas permissões serão removidas."
                  }
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Risk Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Nível de risco:</span>
                <Badge 
                  variant={riskLevel === "high" ? "destructive" : riskLevel === "medium" ? "default" : "secondary"}
                  className={riskLevel === "medium" ? "bg-amber-500/20 text-amber-700 border-amber-500/30" : ""}
                >
                  {riskLevel === "high" ? "Alto" : riskLevel === "medium" ? "Médio" : "Baixo"}
                </Badge>
              </div>

              {/* Additions */}
              {additions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      Permissões a adicionar ({additions.length})
                    </span>
                  </div>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {additions.map((diff, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <code className="bg-success-muted text-success px-1.5 py-0.5 rounded font-mono">
                            {diff.permission_key}
                          </code>
                          <span className="text-muted-foreground">{diff.source_name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Removals */}
              {removals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Minus className="h-4 w-4 text-danger" />
                    <span className="text-sm font-medium text-danger">
                      Permissões a remover ({removals.length})
                    </span>
                  </div>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {removals.map((diff, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <code className="bg-status-red-muted text-status-red px-1.5 py-0.5 rounded font-mono line-through">
                            {diff.permission_key}
                          </code>
                          <span className="text-muted-foreground">{diff.source_name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Reason (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Motivo da alteração
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Ex: Promoção para líder de equipe, necessita acesso a relatórios de OKRs..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Este motivo será registrado no log de auditoria.
                </p>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          {!noChanges && (
            <Button 
              onClick={handleConfirm} 
              disabled={isPending}
              variant={riskLevel === "high" ? "destructive" : "default"}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                "Confirmar Alterações"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
