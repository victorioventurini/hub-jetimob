import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, Calendar, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AssetData {
  id: string;
  name: string;
  internal_code: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  current_holder_type: string;
  acquired_at: string | null;
}

const statusLabels: Record<string, string> = {
  available: "Disponível",
  loaned: "Emprestado",
  maintenance: "Em Manutenção",
  written_off: "Baixado",
};

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-700 border-green-200",
  loaned: "bg-blue-500/10 text-blue-700 border-blue-200",
  maintenance: "bg-amber-500/10 text-amber-700 border-amber-200",
  written_off: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const holderLabels: Record<string, string> = {
  location: "Em sede",
  user: "Com colaborador",
};

export default function PublicAsset() {
  const { code } = useParams<{ code: string }>();
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAsset() {
      if (!code) {
        setError("Código não informado");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("asset_inventory")
          .select(`
            id,
            name,
            internal_code,
            description,
            brand,
            model,
            status,
            current_holder_type,
            acquired_at
          `)
          .eq("internal_code", code)
          .is("deleted_at", null)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching asset:", fetchError);
          setError("Erro ao buscar item");
        } else if (!data) {
          setError("Item não encontrado");
        } else {
          setAsset(data as AssetData);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Erro ao buscar item");
      } finally {
        setLoading(false);
      }
    }

    fetchAsset();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 pb-6">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Item não encontrado</h1>
            <p className="text-muted-foreground mb-6">
              O item com código #{code} não foi encontrado ou não está disponível.
            </p>
            <Button asChild variant="outline">
              <Link to="/auth">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ir para o Hub
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                  #{asset.internal_code}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn(statusColors[asset.status])}
                >
                  {statusLabels[asset.status] || asset.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{asset.name}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {asset.description && (
            <p className="text-muted-foreground text-sm">{asset.description}</p>
          )}

          <div className="space-y-3">
            {(asset.brand || asset.model) && (
              <div className="flex items-center gap-3 text-sm">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Marca/Modelo:</span>
                <span className="font-medium">
                  {[asset.brand, asset.model].filter(Boolean).join(" ")}
                </span>
              </div>
            )}

            {asset.current_holder_type && (
              <div className="flex items-center gap-3 text-sm">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Situação:</span>
                <span className="font-medium">
                  {holderLabels[asset.current_holder_type] || asset.current_holder_type}
                </span>
              </div>
            )}

            {asset.acquired_at && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Aquisição:</span>
                <span className="font-medium">
                  {format(new Date(asset.acquired_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Este item pertence ao inventário do Hub.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
