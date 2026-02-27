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
import { 
  AlertTriangle,
  Info, 
  Target, 
  ListChecks, 
  Ticket, 
  Users, 
  Building2,
  Handshake,
  ChartLine,
  Flag,
  Route,
} from "lucide-react";
import { DependencyItem, useUserDependencies } from "@/hooks/useUserDependencies";
import { useAssetProfiles } from "@/modules/assets/hooks";
import { TransferConfig, TransferItem } from "@/hooks/useProfiles";
import { LoadingState } from "@/components/ui/loading-state";

interface UserDependenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string | null;
  profileName: string;
  onTransfer: (config: TransferConfig) => Promise<void>;
  isTransferring: boolean;
}

type MandatoryDependencyType = 
  | "kpis" 
  | "initiatives" 
  | "tickets" 
  | "teamObjectives" 
  | "teamKrs" 
  | "orgObjectives" 
  | "orgKrs"
  | "routingRules";

interface TransferState {
  kpis: Record<string, string>;
  initiatives: Record<string, string>;
  tickets: Record<string, string>;
  teamObjectives: Record<string, string>;
  teamKrs: Record<string, string>;
  orgObjectives: Record<string, string>;
  orgKrs: Record<string, string>;
  routingRules: Record<string, string>;
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
    teamObjectives: {},
    teamKrs: {},
    orgObjectives: {},
    orgKrs: {},
    routingRules: {},
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

  const handleTransferChange = (type: MandatoryDependencyType, itemId: string, newOwnerId: string) => {
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
      teamObjectives: {},
      teamKrs: {},
      orgObjectives: {},
      orgKrs: {},
      routingRules: {},
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
    deps.mandatory.teamObjectives.forEach((o) => {
      newTransfers.teamObjectives[o.id] = bulkOwner;
    });
    deps.mandatory.teamKrs.forEach((kr) => {
      newTransfers.teamKrs[kr.id] = bulkOwner;
    });
    deps.mandatory.orgObjectives.forEach((o) => {
      newTransfers.orgObjectives[o.id] = bulkOwner;
    });
    deps.mandatory.orgKrs.forEach((kr) => {
      newTransfers.orgKrs[kr.id] = bulkOwner;
    });
    deps.mandatory.routingRules.forEach((r) => {
      newTransfers.routingRules[r.id] = bulkOwner;
    });

    setTransfers(newTransfers);
  };

  // Check if all mandatory dependencies have been assigned
  const allMandatoryAssigned = useMemo(() => {
    const kpisAssigned = deps.mandatory.kpis.every((k) => !!transfers.kpis[k.id]);
    const initiativesAssigned = deps.mandatory.initiatives.every((i) => !!transfers.initiatives[i.id]);
    const ticketsAssigned = deps.mandatory.tickets.every((t) => !!transfers.tickets[t.id]);
    const teamObjectivesAssigned = deps.mandatory.teamObjectives.every((o) => !!transfers.teamObjectives[o.id]);
    const teamKrsAssigned = deps.mandatory.teamKrs.every((kr) => !!transfers.teamKrs[kr.id]);
    const orgObjectivesAssigned = deps.mandatory.orgObjectives.every((o) => !!transfers.orgObjectives[o.id]);
    const orgKrsAssigned = deps.mandatory.orgKrs.every((kr) => !!transfers.orgKrs[kr.id]);
    const routingRulesAssigned = deps.mandatory.routingRules.every((r) => !!transfers.routingRules[r.id]);
    return kpisAssigned && initiativesAssigned && ticketsAssigned && 
           teamObjectivesAssigned && teamKrsAssigned && orgObjectivesAssigned && orgKrsAssigned && routingRulesAssigned;
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
        teamObjectives: deps.mandatory.teamObjectives
          .filter((o) => transfers.teamObjectives[o.id])
          .map((o) => ({ id: o.id, newOwnerId: transfers.teamObjectives[o.id] })),
        teamKrs: deps.mandatory.teamKrs
          .filter((kr) => transfers.teamKrs[kr.id])
          .map((kr) => ({ id: kr.id, newOwnerId: transfers.teamKrs[kr.id] })),
        orgObjectives: deps.mandatory.orgObjectives
          .filter((o) => transfers.orgObjectives[o.id])
          .map((o) => ({ id: o.id, newOwnerId: transfers.orgObjectives[o.id] })),
        orgKrs: deps.mandatory.orgKrs
          .filter((kr) => transfers.orgKrs[kr.id])
          .map((kr) => ({ id: kr.id, newOwnerId: transfers.orgKrs[kr.id] })),
        routingRules: deps.mandatory.routingRules
          .filter((r) => transfers.routingRules[r.id])
          .map((r) => ({ id: r.id, newOwnerId: transfers.routingRules[r.id] })),
      },
      autoClear: {
        teamLeaderships: deps.optional.teams.map((t) => t.id),
        areaLeaderships: deps.optional.areaLeaderships.map((a) => a.id),
        areaCoLeaderships: deps.optional.areaCoLeaderships.map((a) => a.id),
        krCoResponsibilities: deps.optional.krCoResponsible.map((kr) => kr.id),
        kpiContributions: deps.optional.kpiContributions.map((c) => c.id),
      },
    };

    await onTransfer(config);
  };

  const renderDependencySection = (
    title: string,
    icon: React.ReactNode,
    items: DependencyItem[],
    type: MandatoryDependencyType
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
            <LoadingState text="Carregando dependências..." />
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
                    {/* OKRs Section */}
                    {renderDependencySection(
                      "Objetivos Organizacionais",
                      <Flag className="h-4 w-4 text-purple-500" />,
                      deps.mandatory.orgObjectives,
                      "orgObjectives"
                    )}
                    {renderDependencySection(
                      "KRs Organizacionais",
                      <Target className="h-4 w-4 text-purple-500" />,
                      deps.mandatory.orgKrs,
                      "orgKrs"
                    )}
                    {renderDependencySection(
                      "Objetivos de Time",
                      <Flag className="h-4 w-4 text-primary" />,
                      deps.mandatory.teamObjectives,
                      "teamObjectives"
                    )}
                    {renderDependencySection(
                      "Key Results de Time",
                      <Target className="h-4 w-4 text-primary" />,
                      deps.mandatory.teamKrs,
                      "teamKrs"
                    )}
                    
                    {/* Other mandatory */}
                    {renderDependencySection(
                      "KPIs",
                      <ChartLine className="h-4 w-4 text-accent" />,
                      deps.mandatory.kpis,
                      "kpis"
                    )}
                    {renderDependencySection(
                      "Iniciativas OKR",
                      <ListChecks className="h-4 w-4 text-emerald-500" />,
                      deps.mandatory.initiatives,
                      "initiatives"
                    )}
                    {renderDependencySection(
                      "Tickets",
                      <Ticket className="h-4 w-4 text-warning" />,
                      deps.mandatory.tickets,
                      "tickets"
                    )}
                    {renderDependencySection(
                      "Roteamento Interno de Tickets",
                      <Route className="h-4 w-4 text-orange-500" />,
                      deps.mandatory.routingRules,
                      "routingRules"
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
                      (vínculos removidos).
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-4">
                    {renderOptionalBadges(
                      "Times (liderança será removida)",
                      <Users className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.teams
                    )}
                    {renderOptionalBadges(
                      "Áreas (liderança será removida)",
                      <Building2 className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.areaLeaderships
                    )}
                    {renderOptionalBadges(
                      "Áreas (co-liderança será removida)",
                      <Building2 className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.areaCoLeaderships
                    )}
                    {renderOptionalBadges(
                      "Co-responsabilidades em KRs (serão removidas)",
                      <Handshake className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.krCoResponsible
                    )}
                    {renderOptionalBadges(
                      "Contribuidor de KPIs (será removido)",
                      <ChartLine className="h-4 w-4 text-muted-foreground" />,
                      deps.optional.kpiContributions
                    )}
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
            disabled={isLoading || (deps.hasMandatoryDependencies && !allMandatoryAssigned)}
            isLoading={isTransferring}
            loadingText={deps.hasMandatoryDependencies ? "Transferindo..." : "Excluindo..."}
          >
            {deps.hasMandatoryDependencies ? "Transferir e Excluir" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
