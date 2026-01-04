import { Blocks, Search, CheckCircle2, XCircle, Clock, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { icons, LucideIcon } from "lucide-react";

function getIconComponent(iconName: string | null): LucideIcon {
  if (!iconName) return Blocks;
  const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  return (icons as Record<string, LucideIcon>)[formattedName] || Blocks;
}

export default function SettingsModules() {
  const [search, setSearch] = useState("");

  const { data: modules, isLoading } = useQuery({
    queryKey: ["settings-modules-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredModules = modules?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase()) ||
    m.slug.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        );
      case "coming_soon":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Em breve
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "global" ? (
      <Badge variant="outline" className="text-blue-600 border-blue-300">
        Global
      </Badge>
    ) : (
      <Badge variant="outline" className="text-purple-600 border-purple-300">
        Operacional
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
        <p className="text-muted-foreground">
          Configure os módulos disponíveis no Hub
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar módulos..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blocks className="h-5 w-5 text-primary" />
            Catálogo de Módulos
          </CardTitle>
          <CardDescription>
            {isLoading ? "Carregando..." : `${filteredModules?.length || 0} módulos disponíveis`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : filteredModules?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Blocks className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? "Nenhum módulo encontrado" : "Nenhum módulo cadastrado"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredModules?.map((module) => {
                const IconComponent = getIconComponent(module.icon);
                return (
                  <div
                    key={module.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            {module.status === "active" ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-medium text-foreground mb-1">{module.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {module.description || "Sem descrição"}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(module.status)}
                      {getTypeBadge(module.type)}
                    </div>

                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>v{module.version}</span>
                      {module.route && (
                        <span className="ml-2">• {module.route}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
