// ============================================================
// BU ACCESS MANAGER - Gerenciar acessos do usuário a BUs
// ============================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Star, Building2 } from "lucide-react";
import { useAllBus, useAddBuAccess, useRemoveBuAccess } from "@/modules/users-global/hooks";
import type { BuAccess } from "../types";

interface BuAccessManagerProps {
  userId: string;
  buAccesses: BuAccess[];
}

export function BuAccessManager({ userId, buAccesses }: BuAccessManagerProps) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [selectedBuId, setSelectedBuId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("collaborator");
  const [setAsDefault, setSetAsDefault] = useState(false);

  const { data: allBus = [] } = useAllBus();
  const addBuAccess = useAddBuAccess();
  const removeBuAccess = useRemoveBuAccess();

  const existingBuIds = new Set(buAccesses.map((a) => a.bu_id));
  const availableBus = allBus.filter((bu) => !existingBuIds.has(bu.id));

  const handleAdd = () => {
    if (!selectedBuId) return;
    addBuAccess.mutate(
      { userId, buId: selectedBuId, roleInBu: selectedRole, isDefault: setAsDefault },
      {
        onSuccess: () => {
          setAddPopoverOpen(false);
          setSelectedBuId("");
          setSelectedRole("collaborator");
          setSetAsDefault(false);
        },
      }
    );
  };

  const handleRemove = (buId: string) => {
    removeBuAccess.mutate({ userId, buId });
  };

  const handleSetAsDefault = (buId: string) => {
    addBuAccess.mutate({ userId, buId, isDefault: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Acesso a Business Units</Label>
        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={availableBus.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar BU
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Business Unit</Label>
                <Select value={selectedBuId} onValueChange={setSelectedBuId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma BU" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBus.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id}>
                        {bu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role na BU</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaborator">Colaborador</SelectItem>
                    <SelectItem value="admin">Admin da BU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="set-default"
                  checked={setAsDefault}
                  onCheckedChange={setSetAsDefault}
                />
                <Label htmlFor="set-default" className="text-sm">
                  Definir como BU padrão
                </Label>
              </div>
              <Button
                className="w-full"
                onClick={handleAdd}
                disabled={!selectedBuId || addBuAccess.isPending}
              >
                {addBuAccess.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {buAccesses.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Usuário não tem acesso a nenhuma BU
        </div>
      ) : (
        <div className="space-y-2">
          {buAccesses.map((access) => (
            <div
              key={access.bu_id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2">
                {access.is_default && (
                  <Star className="h-4 w-4 text-warning fill-warning" />
                )}
                <span className="font-medium">{access.bu_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {access.role_in_bu === "admin" ? "Admin" : "Colaborador"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {!access.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetAsDefault(access.bu_id)}
                    title="Definir como padrão"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(access.bu_id)}
                  disabled={removeBuAccess.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
