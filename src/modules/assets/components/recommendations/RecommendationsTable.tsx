/**
 * RecommendationsTable
 * 
 * Table listing all recommendations with actions.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, CheckCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RecommendationReviewBadge } from "./RecommendationReviewBadge";
import { RecommendationScopeBadge } from "./RecommendationScopeBadge";
import { useLastPurchaseValue } from "../../hooks";
import type { AssetRecommendation } from "../../types";
import { Skeleton } from "@/components/ui/skeleton";

interface RecommendationsTableProps {
  recommendations: AssetRecommendation[];
  isLoading?: boolean;
  onEdit: (recommendation: AssetRecommendation) => void;
  onDelete: (recommendation: AssetRecommendation) => void;
  onMarkReviewed: (recommendation: AssetRecommendation) => void;
  onView: (recommendation: AssetRecommendation) => void;
  canManage?: boolean;
}

function RecommendationRow({
  recommendation,
  onEdit,
  onDelete,
  onMarkReviewed,
  onView,
  canManage,
}: {
  recommendation: AssetRecommendation;
  onEdit: (rec: AssetRecommendation) => void;
  onDelete: (rec: AssetRecommendation) => void;
  onMarkReviewed: (rec: AssetRecommendation) => void;
  onView: (rec: AssetRecommendation) => void;
  canManage?: boolean;
}) {
  const { data: lastPurchase } = useLastPurchaseValue(recommendation.id);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const categoryDisplay = recommendation.category?.parent_name
    ? `${recommendation.category.parent_name} › ${recommendation.category.name}`
    : recommendation.category?.name || "—";

  const nextReviewDate = recommendation.last_reviewed_at
    ? format(
        new Date(new Date(recommendation.last_reviewed_at).getTime() + 
          recommendation.review_interval_months * 30 * 24 * 60 * 60 * 1000),
        "dd/MM/yyyy",
        { locale: ptBR }
      )
    : "Nunca revisada";

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{recommendation.name}</span>
          <span className="text-sm text-muted-foreground">
            {recommendation.brand}
            {recommendation.model && ` • ${recommendation.model}`}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{categoryDisplay}</span>
      </TableCell>
      <TableCell>
        {recommendation.scope_type && (
          <RecommendationScopeBadge scopeType={recommendation.scope_type} />
        )}
      </TableCell>
      <TableCell>
        {recommendation.review_status && (
          <RecommendationReviewBadge status={recommendation.review_status} />
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{nextReviewDate}</span>
      </TableCell>
      <TableCell>
        {lastPurchase ? (
          <span className="text-sm">{formatCurrency(lastPurchase.value)}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={recommendation.owner?.photo_url || undefined} />
            <AvatarFallback className="text-xs">
              {recommendation.owner?.display_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{recommendation.owner?.display_name || "—"}</span>
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(recommendation)}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem onClick={() => onEdit(recommendation)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkReviewed(recommendation)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar revisada
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(recommendation)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function RecommendationsTable({
  recommendations,
  isLoading,
  onEdit,
  onDelete,
  onMarkReviewed,
  onView,
  canManage,
}: RecommendationsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma recomendação encontrada</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome / Marca</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Escopo</TableHead>
            <TableHead>Status Revisão</TableHead>
            <TableHead>Próx. Revisão</TableHead>
            <TableHead>Valor Ref.</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {recommendations.map((rec) => (
            <RecommendationRow
              key={rec.id}
              recommendation={rec}
              onEdit={onEdit}
              onDelete={onDelete}
              onMarkReviewed={onMarkReviewed}
              onView={onView}
              canManage={canManage}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
