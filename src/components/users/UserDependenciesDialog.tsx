import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle, Info, Target, ListChecks, Ticket, Users } from "lucide-react";
import { DependencyItem, useUserDependencies } from "@/hooks/useUserDependencies";
import { useAssetProfiles } from "@/modules/assets/hooks/useProfiles";
import { TransferConfig, TransferItem } from "@/hooks/useProfiles";

interface UserDependenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string | null;
  profileName: string;
  onTransfer: (config: TransferConfig) => Promise<void>;
  isTransferring: boolean;
}

type DependencyType = "kpis" | "initiatives" | "tickets";

interface TransferState {
  kpis: Record<string, string>;
  initiatives: Record<string, string>;
  tickets: Record<string, string>;
}

export function UserDependenciesDialog({
  open,
  onOpenChange,
  profileId,
  profileName,
  onTransfer,
  isTransferring,
}: UserDependenciesDialogProps) {
  const deps = useUserDependencies(profileId);
  const { profiles, isLoading: profilesLoading } = useAssetProfiles();

  // State for transfers - maps item ID to new owner ID
  const [transfers, setTransfers] = useState<TransferState>({
    kpis: {},
    initiatives: {},
    tickets: {},
  });

  // Bulk transfer state
  const [bulkOwner, setBulkOwner] = useState<string>("");

  // Filter out the user being deleted from available profiles
  const availableProfiles = useMemo(
    () => profiles.filter((p) => p.id !== profileId),
    [profiles, profileId]
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleTransferChange = (type: DependencyType, itemId: string, newOwnerId: string) => {
    setTransfers((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [itemId]: newOwnerId,
      },
    }));
  };

  const handleBulkTransfer = () => {
    if (!bulkOwner) return;

    const newTransfers: TransferState = {
      kpis: {},
      initiatives: {},
      tickets: {},
    };

    deps.mandatory.kpis.forEach((k) => {
      newTransfers.kpis[k.id] = bulkOwner;
    });
    deps.mandatory.initiatives.forEach((i) => {
      newTransfers.initiatives[i.id] = bulkOwner;
    });
    deps.mandatory.tickets.forEach((t) => {
      newTransfers.tickets[t.id] = bulkOwner;
    });

    setTransfers(newTransfers);
  };

  // Check if all mandatory dependencies have been assigned
  const allMandatoryAssigned = useMemo(() => {
    const kpisAssigned = deps.mandatory.kpis.every((k) => !!transfers.kpis[k.id]);
    const initiativesAssigned = deps.mandatory.initiatives.every((i) => !!transfers.initiatives[i.id]);
    const ticketsAssigned = deps.mandatory.tickets.every((t) => !!transfers.tickets[t.id]);
    return kpisAssigned && initiativesAssigned && ticketsAssigned;
  }, [deps.mandatory, transfers]);

  const handleConfirm = async () => {
    if (!profileId) return;

    const config: TransferConfig = {
      profileId,
      transfers: {
        kpis: deps.mandatory.kpis
          .filter((k) => transfers.kpis[k.id])
          .map((k) => ({ id: k.id, newOwnerId: transfers.kpis[k.id] })),
        initiatives: deps.mandatory.initiatives
          .filter((i) => transfers.initiatives[i.id])
          .map((i) => ({ id: i.id, newOwnerId: transfers.initiatives[i.id] })),
        tickets: deps.mandatory.tickets
          .filter((t) => transfers.tickets[t.id])
          .map((t) => ({ id: t.id, newOwnerId: transfers.tickets[t.id] })),
      },
    };

    await onTransfer(config);
  };

  const renderDependencySection = (
    title: string,
    icon: React.ReactNode,
    items: DependencyItem[],
    type: DependencyType
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            {items.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50"
            >
              <span className="text-sm truncate flex-1" title={item.name}>
                {item.name}
              </span>
              <Select
                value={transfers[type][item.id] || ""}
                onValueChange={(v) => handleTransferChange(type, item.id, v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Novo responsável" />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={p.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(p.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{p.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isLoading = deps.isLoading || profilesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transferir Responsabilidades</DialogTitle>
          <DialogDescription>
            <strong>{profileName}</strong> possui itens sob sua responsabilidade.
            Transfira-os antes de prosseguir com a exclusão.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Mandatory Dependencies */}
              {deps.hasMandatoryDependencies && (
                <>
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{deps.totalMandatory}</strong> itens precisam de um novo responsável
                      antes da exclusão.
                    </AlertDescription>
                  </Alert>

                  {/* Bulk transfer */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm text-muted-foreground">
                      Transferir todos para:
                    </span>
                    <Select value={bulkOwner} onValueChange={setBulkOwner}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={p.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(p.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{p.full_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleBulkTransfer}
                      disabled={!bulkOwner}
                    >
                      Aplicar
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {renderDependencySection(
                      "KPIs",
                      <Target className="h-4 w-4 text-accent" />,
                      deps.mandatory.kpis,
                      "kpis"
                    )}
                    {renderDependencySection(
                      "Iniciativas OKR",
                      <ListChecks className="h-4 w-4 text-primary" />,
                      deps.mandatory.initiatives,
                      "initiatives"
                    )}
                    {renderDependencySection(
                      "Tickets",
                      <Ticket className="h-4 w-4 text-warning" />,
                      deps.mandatory.tickets,
                      "tickets"
                    )}
                  </div>
                </>
              )}

              {/* Optional Dependencies */}
              {deps.totalOptional > 0 && (
                <>
                  {deps.hasMandatoryDependencies && <Separator />}
                  <Alert className="border-warning/50 bg-warning/10">
                    <Info className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      <strong>{deps.totalOptional}</strong> itens serão atualizados automaticamente
                      (liderança removida).
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Times (liderança será removida)</span>
                      <Badge variant="outline" className="ml-auto">
                        {deps.optional.teams.length}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {deps.optional.teams.map((t) => (
                        <Badge key={t.id} variant="secondary">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTransferring}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || (deps.hasMandatoryDependencies && !allMandatoryAssigned) || isTransferring}
          >
            {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deps.hasMandatoryDependencies ? "Transferir e Excluir" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
