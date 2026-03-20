import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Key, ArrowRightLeft, User, Calendar, History, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeys, useAssetPermissionsV2 } from "../../hooks";
import { KeyringMovementDialog } from "./KeyringMovementDialog";
import type { AssetKeyring, AssetKeyMovement, KeyMovementType } from "../../types";
import { KeyringHistory } from "./KeyringHistory";
import { KEYRING_STATUS_LABELS, KEY_MOVEMENT_TYPE_LABELS } from "../../types";
import { useEffect } from "react";
import { ASSET_STATUS_STYLES } from "@/lib/colors";

interface KeyringDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyring: AssetKeyring | null;
}

export function KeyringDetailDialog({ open, onOpenChange, keyring }: KeyringDetailDialogProps) {
  const { getKeyMovements, keys } = useKeys();
  const { canManageKeys, isKeysAdmin } = useAssetPermissionsV2();
  const [movements, setMovements] = useState<AssetKeyMovement[]>([]);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<KeyMovementType | undefined>();

  useEffect(() => {
    if (open && keyring) {
      getKeyMovements(keyring.id).then(setMovements);
    }
  }, [open, keyring, getKeyMovements]);

  if (!keyring) return null;

  const keyringKeys = keys.filter((k) => k.keyring_id === keyring.id);

  const handleOpenMovement = (type?: KeyMovementType) => {
    setMovementType(type);
    setMovementDialogOpen(true);
  };

  const showCheckout = keyring.status === "available";
  const showReturn = keyring.status === "loaned";
  const showTransfer = keyring.status === "available" || keyring.status === "loaned";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-muted">
                  <Key className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Chaveiro {keyring.tag_number}</DialogTitle>
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0", ASSET_STATUS_STYLES[keyring.status as keyof typeof ASSET_STATUS_STYLES]?.badge)}>
                {KEYRING_STATUS_LABELS[keyring.status]}
              </Badge>
            </div>
          </DialogHeader>

          {/* Quick Actions */}
          {canManageKeys && keyring.status !== "retired" && keyring.status !== "lost" && (
            <div className="flex flex-wrap gap-2 pb-4">
              {showCheckout && (
                <Button size="sm" onClick={() => handleOpenMovement("checkout")}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Retirar
                </Button>
              )}
              {showReturn && (
                <Button size="sm" onClick={() => handleOpenMovement("return")}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Devolver
                </Button>
              )}
              {showTransfer && (
                <Button size="sm" variant="outline" onClick={() => handleOpenMovement("transfer")}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir
                </Button>
              )}
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="keys">Chaves ({keyringKeys.length})</TabsTrigger>
              <TabsTrigger value="movements">Movimentações</TabsTrigger>
              <TabsTrigger value="history">Alterações</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Current holder */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Situação Atual</h4>
                
                {keyring.current_user && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={keyring.current_user.avatar_url || undefined} />
                      <AvatarFallback>
                        {keyring.current_user.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{keyring.current_user.full_name}</p>
                      <p className="text-sm text-muted-foreground">Em posse do colaborador</p>
                    </div>
                  </div>
                )}

                {keyring.status === "available" && keyring.claviculary && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="p-2 rounded-lg bg-muted">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{keyring.claviculary.name}</p>
                      {keyring.hook && (
                        <p className="text-sm text-muted-foreground">
                          Gancho {keyring.hook.hook_number}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes */}
              {keyring.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Observações</h4>
                  <p className="text-sm">{keyring.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="keys">
              {keyringKeys.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma chave cadastrada neste chaveiro
                </p>
              ) : (
                <div className="space-y-2">
                  {keyringKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{key.tag_number}</p>
                        {key.description && (
                          <p className="text-sm text-muted-foreground">{key.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{key.access_type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="movements">
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {KEY_MOVEMENT_TYPE_LABELS[movement.movement_type]}
                          </span>
                          {movement.user && (
                            <span className="text-sm text-muted-foreground">
                              → {movement.user.full_name}
                            </span>
                          )}
                          {movement.to_claviculary && (
                            <span className="text-sm text-muted-foreground">
                              → {movement.to_claviculary.name}
                            </span>
                          )}
                        </div>
                        {movement.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{movement.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(movement.occurred_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                          {movement.performed_by && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {movement.performed_by.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <KeyringHistory keyringId={keyring.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      {keyring && (
        <KeyringMovementDialog
          open={movementDialogOpen}
          onOpenChange={setMovementDialogOpen}
          keyring={keyring}
          initialType={movementType}
        />
      )}
    </>
  );
}
