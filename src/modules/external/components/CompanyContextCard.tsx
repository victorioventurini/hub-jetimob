/**
 * Card showing company context and categories
 * Provides transparency about ticket routing
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle2 } from "lucide-react";
import type { ExternalCompanyContext } from "../types";

interface CompanyContextCardProps {
  context: ExternalCompanyContext | null;
  isLoading?: boolean;
}

export function CompanyContextCard({ context, isLoading }: CompanyContextCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">{context.companyName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Categories */}
        {context.categories.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Categorias disponíveis:
            </p>
            <div className="flex flex-wrap gap-2">
              {context.categories.slice(0, 6).map((category) => (
                <Badge key={category.id} variant="secondary">
                  {category.name}
                </Badge>
              ))}
              {context.categories.length > 6 && (
                <Badge variant="outline">
                  +{context.categories.length - 6} mais
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Routing message */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Seus tickets são automaticamente direcionados para os especialistas corretos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
