import { Link } from "react-router-dom";
import { FileBarChart, Package, Key, Gift, Clock, AlertTriangle, ChevronRight, CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useInventory, useKeys, useGifts, useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { EmptyState } from "@/components/ui/empty-state";
import { isPast } from "date-fns";

interface ReportStatItemProps {
  label: string;
  value: number;
  variant?: "default" | "success" | "info" | "warning" | "destructive";
  to?: string;
}

function ReportStatItem({ label, value, variant = "default", to }: ReportStatItemProps) {
  const colorClasses = {
    default: "text-foreground",
    success: "text-status-green",
    info: "text-status-blue",
    warning: "text-status-amber",
    destructive: "text-destructive",
  };

  const content = (
    <div className={`flex justify-between items-center ${to ? "group cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`font-semibold ${colorClasses[variant]}`}>{value}</span>
        {to && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
}

export default function AssetsReportsPage() {
  usePageTitle("Relatórios de Ativos", {
    customDescription: "Acompanhe métricas de inventário, chaveiros e brindes corporativos."
  });

  const { items: inventoryItems, isLoading: loadingInventory } = useInventory();
  const { keyrings, isLoading: loadingKeys } = useKeys();
  const { items: giftItems, getItemTotals, isLoading: loadingGifts } = useGifts();
  const { canViewInventory, canViewKeys, canViewGifts, canView } = useAssetPermissionsV2();

  const isLoading = loadingInventory || loadingKeys || loadingGifts;

  if (!canView) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="Sem permissão"
        description="Você não tem permissão para visualizar relatórios de assets."
      />
    );
  }

  // Métricas de Inventário
  const inventoryStats = {
    total: inventoryItems.length,
    available: inventoryItems.filter((i) => i.status === "available").length,
    loaned: inventoryItems.filter((i) => i.status === "loaned").length,
    maintenance: inventoryItems.filter((i) => i.status === "maintenance").length,
  };

  // Empréstimos atrasados (expected_return_at no passado)
  const overdueLoans = inventoryItems.filter((i) => {
    if (i.status !== "loaned" || !i.expected_return_at) return false;
    return isPast(new Date(i.expected_return_at));
  });

  // Métricas de Chaves
  const keysStats = {
    total: keyrings.length,
    available: keyrings.filter((k) => k.status === "available").length,
    loaned: keyrings.filter((k) => k.status === "loaned").length,
    lost: keyrings.filter((k) => k.status === "lost").length,
  };

  // Métricas de Brindes
  const giftStats = {
    totalItems: giftItems.length,
    totalStock: giftItems.reduce((acc, item) => acc + getItemTotals(item.id).availableQuantity, 0),
    lowStock: giftItems.filter((item) => {
      const { availableQuantity } = getItemTotals(item.id);
      return availableQuantity > 0 && availableQuantity < 10;
    }).length,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert de empréstimos atrasados */}
      {canViewInventory && overdueLoans.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <CalendarClock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Devoluções em atraso
                  <Badge variant="destructive">{overdueLoans.length}</Badge>
                </CardTitle>
                <CardDescription>
                  {overdueLoans.length === 1 
                    ? "1 empréstimo com devolução atrasada"
                    : `${overdueLoans.length} empréstimos com devolução atrasada`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLoans.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to={`/assets/inventory/${item.id}`}
                  className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-destructive/10 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {item.internal_code} • {item.current_user?.full_name || "Sem portador"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
              {overdueLoans.length > 5 && (
                <Link
                  to="/assets/inventory?status=loaned&overdue=true"
                  className="text-sm text-destructive hover:underline block text-center pt-2"
                >
                  Ver todos os {overdueLoans.length} atrasados →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Inventário */}
        {canViewInventory && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Inventário</CardTitle>
              </div>
              <CardDescription>Visão geral dos ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ReportStatItem
                  label="Total de itens"
                  value={inventoryStats.total}
                  to="/assets/inventory"
                />
                <ReportStatItem
                  label="Disponíveis"
                  value={inventoryStats.available}
                  variant="success"
                  to="/assets/inventory?status=available"
                />
                <ReportStatItem
                  label="Emprestados"
                  value={inventoryStats.loaned}
                  variant="info"
                  to="/assets/inventory?status=loaned"
                />
                <ReportStatItem
                  label="Em manutenção"
                  value={inventoryStats.maintenance}
                  variant="warning"
                  to="/assets/inventory?status=maintenance"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Chaves */}
        {canViewKeys && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-status-amber-muted">
                  <Key className="h-5 w-5 text-status-amber" />
                </div>
                <CardTitle className="text-lg">Chaves</CardTitle>
              </div>
              <CardDescription>Status dos chaveiros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ReportStatItem
                  label="Total de chaveiros"
                  value={keysStats.total}
                  to="/assets/keys"
                />
                <ReportStatItem
                  label="Disponíveis"
                  value={keysStats.available}
                  variant="success"
                  to="/assets/keys?status=available"
                />
                <ReportStatItem
                  label="Emprestados"
                  value={keysStats.loaned}
                  variant="info"
                  to="/assets/keys?status=loaned"
                />
                {keysStats.lost > 0 && (
                  <ReportStatItem
                    label="Extraviados"
                    value={keysStats.lost}
                    variant="destructive"
                    to="/assets/keys?status=lost"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Brindes */}
        {canViewGifts && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-status-pink-muted">
                  <Gift className="h-5 w-5 text-status-pink" />
                </div>
                <CardTitle className="text-lg">Brindes</CardTitle>
              </div>
              <CardDescription>Controle de estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ReportStatItem
                  label="Tipos de brindes"
                  value={giftStats.totalItems}
                  to="/assets/gifts"
                />
                <ReportStatItem
                  label="Total em estoque"
                  value={giftStats.totalStock}
                  variant="success"
                />
                {giftStats.lowStock > 0 && (
                  <ReportStatItem
                    label="Estoque baixo"
                    value={giftStats.lowStock}
                    variant="warning"
                    to="/assets/gifts?lowStock=true"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
