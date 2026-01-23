import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/globalClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Package, 
  Calendar, 
  ArrowLeft, 
  Building2, 
  Clock, 
  Link2,
  ExternalLink 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PublicAssetData {
  asset: {
    id: string;
    name: string;
    internal_code: string;
    description: string | null;
    brand: string | null;
    model: string | null;
    status: string;
    photos: string[] | null;
    holder_summary: string;
    due_at: string | null;
    last_moved_at: string | null;
  };
  bu: {
    id: string;
    name: string;
    legal_entity: string | null;
    cnpj: string | null;
  };
  related_items: Array<{
    name: string;
    internal_code: string;
    status: string;
    photo: string | null;
    role: string;
  }>;
  /** BU-scoped internal path for authenticated view */
  internal_view_path: string;
}

const statusLabels: Record<string, string> = {
  available: "Disponível",
  loaned: "Emprestado",
  maintenance: "Em Manutenção",
  written_off: "Baixado",
};

export default function PublicAsset() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicAssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic page title and meta description for public page
  useEffect(() => {
    if (data?.asset) {
      const { asset, bu } = data;
      document.title = `Item ${asset.internal_code} - ${asset.name} | Hub`;
      
      // Update meta description
      let metaDescriptionTag = document.querySelector('meta[name="description"]');
      if (!metaDescriptionTag) {
        metaDescriptionTag = document.createElement("meta");
        metaDescriptionTag.setAttribute("name", "description");
        document.head.appendChild(metaDescriptionTag);
      }
      const statusLabel = statusLabels[asset.status] || asset.status;
      metaDescriptionTag.setAttribute(
        "content", 
        `Visualize informações do item ${asset.internal_code} (${asset.name}) da ${bu.name}. Status: ${statusLabel}.`
      );
    } else if (error) {
      document.title = `Item ${code || ''} não encontrado | Hub`;
    } else {
      document.title = `Carregando item... | Hub`;
    }

    return () => {
      document.title = "Hub";
    };
  }, [data, error, code]);

  useEffect(() => {
    async function fetchAsset() {
      if (!code) {
        setError("Código não informado");
        setLoading(false);
        return;
      }

      try {
        const { data: response, error: fetchError } = await supabase.functions.invoke(
          "get-public-asset",
          { body: null, headers: {} }
        );

        // Use query params approach since we can't pass body to GET
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-asset?ref=${encodeURIComponent(code)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await res.json();

        if (!res.ok || result.error) {
          setError("Item não encontrado");
        } else {
          setData(result as PublicAssetData);
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

  const handleViewInternal = () => {
    if (data?.internal_view_path) {
      // Navigate to BU-scoped internal detail page
      // This ensures the correct BU is selected even if user's default BU is different
      navigate(data.internal_view_path);
    }
  };

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
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
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

  const { asset, bu, related_items } = data;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Main Asset Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                    #{asset.internal_code}
                  </span>
                  <StatusBadge 
                    status={asset.status}
                    customLabel={statusLabels[asset.status] || asset.status}
                  />
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

              <div className="flex items-center gap-3 text-sm">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Situação:</span>
                <span className="font-medium">{asset.holder_summary}</span>
              </div>

              {asset.status === "loaned" && asset.due_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Devolução prevista:</span>
                  <span className="font-medium">
                    {format(new Date(asset.due_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {asset.last_moved_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Última atualização:</span>
                  <span className="font-medium">
                    {format(new Date(asset.last_moved_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BU Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">
                  Este item pertence a {bu.legal_entity || bu.name}
                </p>
                {bu.cnpj && (
                  <p className="text-muted-foreground">CNPJ: {bu.cnpj}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Items Card */}
        {related_items.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Itens relacionados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {related_items.map((item) => (
                <Link
                  key={item.internal_code}
                  to={`/assets/${item.internal_code}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{item.internal_code}
                        {item.role === "primary" && " • Primário"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge 
                    status={item.status}
                    customLabel={statusLabels[item.status] || item.status}
                    size="sm"
                  />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty related items state */}
        {related_items.length === 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Link2 className="h-4 w-4" />
                <span>Este item não possui acessórios relacionados.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Internal View Button */}
        <div className="pt-2">
          <Button 
            onClick={handleViewInternal} 
            variant="outline" 
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver no Hub (interno)
          </Button>
        </div>
      </div>
    </div>
  );
}
