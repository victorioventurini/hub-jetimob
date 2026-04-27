/**
 * KpiMigrationBanner — Banners de revisão de migração de frequência v3.0.0
 *
 * Variantes:
 * - `dashboard-global`: aparece no /kpis quando há >0 KPIs com `frequency_migration_reviewed=false`.
 *   CTA aplica filtro `?needs_review=1`.
 * - `detail-pending`: discreto no detalhe quando o KPI atual está com `frequency_migration_reviewed=false`
 *   e tem `consolidation_frequency` definido.
 * - `detail-missing`: destacado quando `consolidation_frequency IS NULL` (ex-`manual`).
 *
 * Permissão: `kpis.settings.manage:bu` (delegado ao caller via `useCanEditKpi`).
 */

import { Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type DashboardGlobalProps = {
  variant: "dashboard-global";
  count: number;
  onReview: () => void;
};

type DetailPendingProps = {
  variant: "detail-pending";
  onReview: () => void;
};

type DetailMissingProps = {
  variant: "detail-missing";
  onReview: () => void;
};

type Props = DashboardGlobalProps | DetailPendingProps | DetailMissingProps;

export function KpiMigrationBanner(props: Props) {
  if (props.variant === "dashboard-global") {
    if (props.count <= 0) return null;
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>
          {props.count === 1
            ? "1 indicador precisa de revisão de frequência"
            : `${props.count} indicadores precisam de revisão de frequência`}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            A separação entre frequência de consolidação e atualização foi introduzida.
            Revise para garantir que apareçam corretamente nos ritos.
          </span>
          <Button size="sm" variant="outline" onClick={props.onReview}>
            Ver indicadores pendentes
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (props.variant === "detail-pending") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Configuração migrada — revise consolidação e atualização</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Confirme as frequências para liberar este indicador nos ritos do time.
          </span>
          <Button size="sm" variant="outline" onClick={props.onReview}>
            Revisar agora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // detail-missing
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Frequência não configurada</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">
          Este indicador precisa ter sua frequência configurada para aparecer corretamente nos ritos.
        </span>
        <Button size="sm" variant="secondary" onClick={props.onReview}>
          Configurar agora
        </Button>
      </AlertDescription>
    </Alert>
  );
}
