import { Building2, Plus, Search, MoreVertical, Users, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { queryKeys } from "@/lib/queryKeys";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateBuDialog } from "@/modules/bu/components/CreateBuDialog";
import { EditBuDialog } from "@/modules/bu/components/EditBuDialog";
import { BuDetailDialog } from "@/modules/bu/components/BuDetailDialog";
import { BuUnit } from "@/modules/bu/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLocalSearch } from "@/shared/url";

export default function SettingsBusinessUnits() {
  usePageTitle("Business Units", { 
    skipBu: true, 
    customDescription: "Gerencie as unidades de negócio cadastradas no Hub." 
  });

  const { value: search, setValue: setSearch } = useLocalSearch("q");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBu, setSelectedBu] = useState<BuUnit | null>(null);

  const { data: businessUnits, isLoading } = useQuery({
    queryKey: queryKeys.settings.businessUnits(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name, description, legal_entity, cnpj, allowed_email_domains, logo_url, symbol_url, primary_color, secondary_color, status, created_at, updated_at")
        .order("name");
      if (error) throw error;
      return data as BuUnit[];
    },
  });

  const { data: memberCounts } = useQuery({
    queryKey: queryKeys.settings.buMemberCounts(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_user_memberships")
        .select("bu_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.bu_id] = (counts[m.bu_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredBUs = businessUnits?.filter((bu) =>
    bu.name.toLowerCase().includes(search.toLowerCase()) ||
    bu.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (bu: BuUnit) => {
    setSelectedBu(bu);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (bu: BuUnit) => {
    setSelectedBu(bu);
    setDetailDialogOpen(true);
  };

  const handleEditFromDetail = () => {
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Units</h1>
          <p className="text-muted-foreground">
            Gerencie as unidades de negócio do Hub
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova BU
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar business units..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Unidades de Negócio
          </CardTitle>
          <CardDescription>
            {isLoading ? "Carregando..." : `${filteredBUs?.length || 0} business units cadastradas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBUs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? "Nenhuma BU encontrada" : "Nenhuma business unit cadastrada"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira BU
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBUs?.map((bu) => (
                <div
                  key={bu.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewDetails(bu)}
                >
                  {/* Logo/Icon */}
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: bu.primary_color || "#0A3D62" }}
                  >
                    {bu.symbol_url ? (
                      <img src={bu.symbol_url} alt={bu.name} className="h-8 w-8 object-contain" />
                    ) : (
                      bu.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{bu.name}</h3>
                      <Badge variant={bu.status === "active" ? "default" : "secondary"}>
                        {bu.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {bu.description || bu.legal_entity || "Sem descrição"}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{memberCounts?.[bu.id] || 0} membros</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span>{bu.allowed_email_domains?.length || 0} domínios</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(bu); }}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(bu); }}>
                        Ver detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateBuDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditBuDialog
        bu={selectedBu}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <BuDetailDialog
        bu={selectedBu}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEditFromDetail}
      />
    </div>
  );
}
