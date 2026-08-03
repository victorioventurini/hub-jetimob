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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Package,
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
  | "routingRules"
  | "assetRecommendations";

type LeadershipDependencyType =
  | "teamLeaderships"
  | "areaLeaderships"
  | "areaCoLeaderships";

type DependencyType = MandatoryDependencyType | LeadershipDependencyType;

/** Sentinel used in the select to explicitly leave the leadership vacant */
const NONE_VALUE = "__none__";

type TransferState = Record<DependencyType, Record<string, string>>;

const EMPTY_TRANSFERS: TransferState = {
  kpis: {},
  initiatives: {},
  tickets: {},
  teamObjectives: {},
  teamKrs: {},
  orgObjectives: {},
  orgKrs: {},
  routingRules: {},
  assetRecommendations: {},
  teamLeaderships: {},
  areaLeaderships: {},
  areaCoLeaderships: {},
};

const MANDATORY_TYPES: MandatoryDependencyType[] = [
  "kpis",
  "initiatives",
  "tickets",
  "teamObjectives",
  "teamKrs",
  "orgObjectives",
  "orgKrs",
  "routingRules",
  "assetRecommendations",
];

interface SectionDef {
  title: string;
  icon: React.ReactNode;
  items: DependencyItem[];
  type: DependencyType;
  allowNone?: boolean;
  placeholder?: string;
  noneLabel?: string;
}

interface ModuleDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Label of the module-level bulk selector */
  bulkLabel: string;
  /** When true, items are not blocking (leaderships can be left vacant) */
  optional?: boolean;
  sections: SectionDef[];
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
  const [transfers, setTransfers] = useState<TransferState>(EMPTY_TRANSFERS);

  // Bulk transfer state (global + per module)
  const [bulkOwner, setBulkOwner] = useState<string>("");
  const [moduleBulkOwner, setModuleBulkOwner] = useState<Record<string, string>>({});

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

  // ============================================================
  // MODULE DEFINITIONS (source of truth for the modal layout)
  // ============================================================
  const modules: ModuleDef[] = useMemo(() => {
    const defs: ModuleDef[] = [
      {
        id: "okrs",
        label: "OKRs",
        icon: <Target className="h-4 w-4 text-primary" />,
        bulkLabel: "Transferir todos os itens de OKRs para:",
        sections: [
          {
            title: "Objetivos Organizacionais",
            icon: <Flag className="h-4 w-4 text-purple-500" />,
            items: deps.mandatory.orgObjectives,
            type: "orgObjectives",
          },
          {
            title: "KRs Organizacionais",
            icon: <Target className="h-4 w-4 text-purple-500" />,
            items: deps.mandatory.orgKrs,
            type: "orgKrs",
          },
          {
            title: "Objetivos de Time",
            icon: <Flag className="h-4 w-4 text-primary" />,
            items: deps.mandatory.teamObjectives,
            type: "teamObjectives",
          },
          {
            title: "Key Results de Time",
            icon: <Target className="h-4 w-4 text-primary" />,
            items: deps.mandatory.teamKrs,
            type: "teamKrs",
          },
          {
            title: "Iniciativas",
            icon: <ListChecks className="h-4 w-4 text-emerald-500" />,
            items: deps.mandatory.initiatives,
            type: "initiatives",
          },
        ],
      },
      {
        id: "kpis",
        label: "KPIs",
        icon: <ChartLine className="h-4 w-4 text-accent" />,
        bulkLabel: "Transferir todos os KPIs para:",
        sections: [
          {
            title: "KPIs sob responsabilidade",
            icon: <ChartLine className="h-4 w-4 text-accent" />,
            items: deps.mandatory.kpis,
            type: "kpis",
          },
        ],
      },
      {
        id: "teams",
        label: "Times e Áreas",
        icon: <Users className="h-4 w-4 text-muted-foreground" />,
        bulkLabel: "Transferir todas as lideranças para:",
        optional: true,
        sections: [
          {
            title: "Liderança de time",
            icon: <Users className="h-4 w-4 text-muted-foreground" />,
            items: deps.optional.teams,
            type: "teamLeaderships",
            allowNone: true,
            placeholder: "Novo líder",
          },
          {
            title: "Liderança de área",
            icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
            items: deps.optional.areaLeaderships,
            type: "areaLeaderships",
            allowNone: true,
            placeholder: "Novo líder",
          },
          {
            title: "Co-liderança de área",
            icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
            items: deps.optional.areaCoLeaderships,
            type: "areaCoLeaderships",
            allowNone: true,
            placeholder: "Novo co-líder",
            noneLabel: "Remover co-liderança (deixar vago)",
          },
        ],
      },
      {
        id: "assets",
        label: "Assets",
        icon: <Package className="h-4 w-4 text-sky-500" />,
        bulkLabel: "Transferir todos os itens de Assets para:",
        sections: [
          {
            title: "Recomendações de assets",
            icon: <Package className="h-4 w-4 text-sky-500" />,
            items: deps.mandatory.assetRecommendations,
            type: "assetRecommendations",
          },
        ],
      },
      {
        id: "tickets",
        label: "Tickets",
        icon: <Ticket className="h-4 w-4 text-warning" />,
        bulkLabel: "Transferir todos os itens de Tickets para:",
        sections: [
          {
            title: "Tickets abertos",
            icon: <Ticket className="h-4 w-4 text-warning" />,
            items: deps.mandatory.tickets,
            type: "tickets",
          },
          {
            title: "Regras de roteamento interno",
            icon: <Route className="h-4 w-4 text-orange-500" />,
            items: deps.mandatory.routingRules,
            type: "routingRules",
          },
        ],
      },
    ];

    // Hide modules without items
    return defs
      .map((m) => ({ ...m, sections: m.sections.filter((s) => s.items.length > 0) }))
      .filter((m) => m.sections.length > 0);
  }, [deps.mandatory, deps.optional]);

  const moduleStats = useMemo(() => {
    const stats: Record<string, { total: number; assigned: number }> = {};
    for (const m of modules) {
      let total = 0;
      let assigned = 0;
      for (const s of m.sections) {
        total += s.items.length;
        assigned += s.items.filter((i) => !!transfers[s.type][i.id]).length;
      }
      stats[m.id] = { total, assigned };
    }
    return stats;
  }, [modules, transfers]);

  /** Applies an owner to every item of a scope (a module, or all modules) */
  const applyBulk = (owner: string, moduleId?: string) => {
    if (!owner) return;
    const scope = moduleId ? modules.filter((m) => m.id === moduleId) : modules;

    setTransfers((prev) => {
      const next: TransferState = { ...prev };
      for (const m of scope) {
        for (const s of m.sections) {
          next[s.type] = { ...next[s.type] };
          for (const item of s.items) {
            next[s.type][item.id] = owner;
          }
        }
      }
      return next;
    });
  };

  // Check if all mandatory dependencies have been assigned
  const allMandatoryAssigned = useMemo(() => {
    return modules
      .filter((m) => !m.optional)
      .every((m) =>
        m.sections.every((s) => s.items.every((i) => !!transfers[s.type][i.id]))
      );
  }, [modules, transfers]);

  const otherOptionalCount =
    deps.optional.krCoResponsible.length + deps.optional.kpiContributions.length;

  /** Build transfer items for a type, skipping "leave vacant" and unset selects */
  const transferItems = (type: DependencyType, items: DependencyItem[]): TransferItem[] =>
    items
      .filter((i) => {
        const v = transfers[type][i.id];
        return !!v && v !== NONE_VALUE;
      })
      .map((i) => ({ id: i.id, newOwnerId: transfers[type][i.id] }));

  const handleConfirm = async () => {
    if (!profileId) return;

    const config: TransferConfig = {
      profileId,
      transfers: {
        kpis: transferItems("kpis", deps.mandatory.kpis),
        initiatives: transferItems("initiatives", deps.mandatory.initiatives),
        tickets: transferItems("tickets", deps.mandatory.tickets),
        teamObjectives: transferItems("teamObjectives", deps.mandatory.teamObjectives),
        teamKrs: transferItems("teamKrs", deps.mandatory.teamKrs),
        orgObjectives: transferItems("orgObjectives", deps.mandatory.orgObjectives),
        orgKrs: transferItems("orgKrs", deps.mandatory.orgKrs),
        routingRules: transferItems("routingRules", deps.mandatory.routingRules),
        assetRecommendations: transferItems(
          "assetRecommendations",
          deps.mandatory.assetRecommendations
        ),
        teamLeaderships: transferItems("teamLeaderships", deps.optional.teams),
        areaLeaderships: transferItems("areaLeaderships", deps.optional.areaLeaderships),
        areaCoLeaderships: transferItems("areaCoLeaderships", deps.optional.areaCoLeaderships),
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

  const renderOwnerOptions = () =>
    availableProfiles.map((p) => (
      <SelectItem key={p.id} value={p.id}>
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={p.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">{getInitials(p.full_name)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{p.full_name}</span>
        </div>
      </SelectItem>
    ));

  const renderSection = (section: SectionDef) => (
    <div key={section.type} className="space-y-2">
      <div className="flex items-center gap-2">
        {section.icon}
        <span className="text-sm font-medium">{section.title}</span>
        <Badge variant="secondary" className="ml-auto">
          {section.items.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {section.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50"
          >
            <span className="text-sm truncate flex-1" title={item.name}>
              {item.name}
            </span>
            <Select
              value={transfers[section.type][item.id] || ""}
              onValueChange={(v) => handleTransferChange(section.type, item.id, v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={section.placeholder ?? "Novo responsável"} />
              </SelectTrigger>
              <SelectContent>
                {section.allowNone && (
                  <SelectItem value={NONE_VALUE}>
                    <span className="text-muted-foreground">
                      {section.noneLabel ?? "Remover liderança (deixar vago)"}
                    </span>
                  </SelectItem>
                )}
                {renderOwnerOptions()}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );

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
            <strong>{profileName}</strong> possui itens sob sua responsabilidade. Defina o novo
            responsável por módulo antes de prosseguir com a exclusão.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingState text="Carregando dependências..." />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {deps.hasMandatoryDependencies && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{deps.totalMandatory}</strong> itens precisam de um novo responsável
                    antes da exclusão.
                  </AlertDescription>
                </Alert>
              )}

              {modules.length > 0 && (
                <>
                  {/* Global shortcut */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm text-muted-foreground">Transferir tudo para:</span>
                    <Select value={bulkOwner} onValueChange={setBulkOwner}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>{renderOwnerOptions()}</SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => applyBulk(bulkOwner)}
                      disabled={!bulkOwner}
                    >
                      Aplicar
                    </Button>
                  </div>

                  {/* Per-module accordions */}
                  <Accordion
                    type="multiple"
                    defaultValue={modules.map((m) => m.id)}
                    className="space-y-2"
                  >
                    {modules.map((m) => {
                      const stats = moduleStats[m.id];
                      const pending = stats.total - stats.assigned;
                      return (
                        <AccordionItem
                          key={m.id}
                          value={m.id}
                          className="border rounded-lg px-3 data-[state=open]:bg-muted/20"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2 flex-1 pr-2">
                              {m.icon}
                              <span className="font-medium">{m.label}</span>
                              <Badge
                                variant={
                                  pending === 0
                                    ? "secondary"
                                    : m.optional
                                      ? "outline"
                                      : "destructive"
                                }
                                className="ml-auto"
                              >
                                {stats.assigned}/{stats.total} definidos
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pb-4">
                            {/* Module-level bulk */}
                            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-background">
                              <span className="text-xs text-muted-foreground">{m.bulkLabel}</span>
                              <Select
                                value={moduleBulkOwner[m.id] ?? ""}
                                onValueChange={(v) =>
                                  setModuleBulkOwner((prev) => ({ ...prev, [m.id]: v }))
                                }
                              >
                                <SelectTrigger className="w-[190px] h-8">
                                  <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent>{renderOwnerOptions()}</SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => applyBulk(moduleBulkOwner[m.id] ?? "", m.id)}
                                disabled={!moduleBulkOwner[m.id]}
                              >
                                Aplicar
                              </Button>
                            </div>

                            {m.optional && (
                              <p className="text-xs text-muted-foreground">
                                Lideranças podem ser transferidas item a item. Se nada for
                                selecionado, a liderança será removida e ficará vaga.
                              </p>
                            )}

                            <div className="space-y-4">{m.sections.map(renderSection)}</div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </>
              )}

              {/* Optional Dependencies (auto-cleared) */}
              {otherOptionalCount > 0 && (
                <>
                  {modules.length > 0 && <Separator />}
                  <Alert className="border-warning/50 bg-warning/10">
                    <Info className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      <strong>{otherOptionalCount}</strong> vínculos serão removidos
                      automaticamente.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-4">
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
