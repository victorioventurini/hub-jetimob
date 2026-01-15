/**
 * Performance Dashboard Page
 * P4: Dashboard de monitoramento de performance do banco de dados
 */

import { Helmet } from "react-helmet-async";
import { Activity, Database, AlertTriangle, CheckCircle2, Package, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePerfMetricsLatest, usePerfMetricsHistory, collectPerfMetricsManually, type TableMetric, type UnusedIndex } from "../hooks/usePerfMetrics";
import { useQueryClient } from "@tanstack/react-query";
import { perfMetricsKeys } from "@/lib/queryKeys/integrations";
import { toast } from "sonner";
import { useState } from "react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function StatusBadge({ status }: { status: 'critical' | 'warning' | 'ok' }) {
  const variants = {
    critical: { label: 'Crítico', className: 'bg-destructive text-destructive-foreground' },
    warning: { label: 'Atenção', className: 'bg-amber-500 text-white' },
    ok: { label: 'OK', className: 'bg-emerald-500 text-white' },
  };
  const v = variants[status];
  return <Badge className={v.className}>{v.label}</Badge>;
}

function SummaryCard({ 
  title, 
  value, 
  description,
  icon: Icon,
  variant = 'default'
}: { 
  title: string; 
  value: number | string; 
  description?: string;
  icon: React.ElementType;
  variant?: 'default' | 'critical' | 'warning' | 'success';
}) {
  const variantStyles = {
    default: 'border-border',
    critical: 'border-destructive bg-destructive/5',
    warning: 'border-amber-500 bg-amber-500/5',
    success: 'border-emerald-500 bg-emerald-500/5',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    critical: 'text-destructive',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
  };

  return (
    <Card className={cn("border-2", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconStyles[variant])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TablesTable({ tables }: { tables: TableMetric[] }) {
  if (!tables || tables.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma tabela com atividade significativa
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tabela</TableHead>
          <TableHead className="text-right">Seq Scans</TableHead>
          <TableHead className="text-right">Idx Scans</TableHead>
          <TableHead className="text-right">% Índice</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tables.map((table) => (
          <TableRow key={table.name}>
            <TableCell className="font-mono text-sm">{table.name}</TableCell>
            <TableCell className="text-right">{table.seq_scan.toLocaleString()}</TableCell>
            <TableCell className="text-right">{table.idx_scan.toLocaleString()}</TableCell>
            <TableCell className="text-right font-medium">{table.idx_scan_pct}%</TableCell>
            <TableCell>
              <StatusBadge status={table.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UnusedIndexesTable({ indexes }: { indexes: UnusedIndex[] }) {
  if (!indexes || indexes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum índice não utilizado encontrado
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Índice</TableHead>
          <TableHead>Tabela</TableHead>
          <TableHead className="text-right">Tamanho</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {indexes.map((idx) => (
          <TableRow key={idx.name}>
            <TableCell className="font-mono text-sm">{idx.name}</TableCell>
            <TableCell className="font-mono text-sm">{idx.table_name}</TableCell>
            <TableCell className="text-right">{formatBytes(idx.size_bytes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TrendChart({ data }: { data: Array<{ collected_at: string; summary: { tables_critical: number; tables_warning: number; tables_ok: number } }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Dados insuficientes para gráfico de tendência
      </div>
    );
  }

  const chartData = data.map(d => ({
    date: format(parseISO(d.collected_at), 'dd/MM', { locale: ptBR }),
    critical: d.summary.tables_critical,
    warning: d.summary.tables_warning,
    ok: d.summary.tables_ok,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Area type="monotone" dataKey="ok" stackId="1" fill="hsl(142, 76%, 36%)" stroke="hsl(142, 76%, 36%)" fillOpacity={0.3} name="OK" />
        <Area type="monotone" dataKey="warning" stackId="1" fill="hsl(45, 93%, 47%)" stroke="hsl(45, 93%, 47%)" fillOpacity={0.3} name="Atenção" />
        <Area type="monotone" dataKey="critical" stackId="1" fill="hsl(0, 84%, 60%)" stroke="hsl(0, 84%, 60%)" fillOpacity={0.3} name="Crítico" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function PerfDashboardPage() {
  const queryClient = useQueryClient();
  const [isCollecting, setIsCollecting] = useState(false);
  
  const { data: latest, isLoading: loadingLatest, error: errorLatest } = usePerfMetricsLatest();
  const { data: history, isLoading: loadingHistory } = usePerfMetricsHistory(30);

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      await collectPerfMetricsManually();
      await queryClient.invalidateQueries({ queryKey: perfMetricsKeys.latest() });
      await queryClient.invalidateQueries({ queryKey: perfMetricsKeys.history(30) });
      toast.success("Métricas coletadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao coletar métricas");
      console.error(error);
    } finally {
      setIsCollecting(false);
    }
  };

  const overallStatus = latest?.summary 
    ? (latest.summary.tables_critical > 0 ? 'critical' : latest.summary.tables_warning > 0 ? 'warning' : 'success')
    : 'default';

  const statusLabels = {
    critical: 'Crítico',
    warning: 'Atenção',
    success: 'Saudável',
    default: 'Sem dados',
  };

  return (
    <>
      <Helmet>
        <title>Performance do Banco | Hub Jetimob</title>
        <meta name="description" content="Monitore a saúde e performance do banco de dados do Hub." />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Performance do Banco</h1>
              <Badge variant={overallStatus === 'critical' ? 'destructive' : overallStatus === 'warning' ? 'secondary' : 'default'}>
                {statusLabels[overallStatus]}
              </Badge>
            </div>
            {latest && (
              <p className="text-sm text-muted-foreground">
                Última coleta: {formatDistanceToNow(parseISO(latest.collected_at), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>
          <Button onClick={handleCollect} disabled={isCollecting}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isCollecting && "animate-spin")} />
            Coletar Agora
          </Button>
        </div>

        {/* Loading state */}
        {loadingLatest && (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[120px]" />
            ))}
          </div>
        )}

        {/* Error state */}
        {errorLatest && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Erro ao carregar métricas: {(errorLatest as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {latest && (
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              title="Tabelas Analisadas"
              value={latest.summary.total_tables}
              description="Com atividade significativa"
              icon={Database}
            />
            <SummaryCard
              title="Tabelas Críticas"
              value={latest.summary.tables_critical}
              description="< 50% uso de índice"
              icon={AlertTriangle}
              variant={latest.summary.tables_critical > 0 ? 'critical' : 'success'}
            />
            <SummaryCard
              title="Tabelas em Atenção"
              value={latest.summary.tables_warning}
              description="50-80% uso de índice"
              icon={Activity}
              variant={latest.summary.tables_warning > 0 ? 'warning' : 'success'}
            />
            <SummaryCard
              title="Índices Não Usados"
              value={`${latest.summary.unused_indexes_count} (${latest.summary.unused_indexes_size_mb} MB)`}
              description="Candidatos a remoção"
              icon={Package}
              variant={latest.summary.unused_indexes_count > 5 ? 'warning' : 'default'}
            />
          </div>
        )}

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência (30 dias)</CardTitle>
            <CardDescription>Distribuição de tabelas por status ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <TrendChart data={history || []} />
            )}
          </CardContent>
        </Card>

        {/* Tables List */}
        {latest && (
          <Card>
            <CardHeader>
              <CardTitle>Tabelas Monitoradas</CardTitle>
              <CardDescription>
                Tabelas com mais de 100 operações (seq_scan + idx_scan)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TablesTable tables={latest.metrics.tables} />
            </CardContent>
          </Card>
        )}

        {/* Unused Indexes */}
        {latest && (
          <Card>
            <CardHeader>
              <CardTitle>Índices Não Utilizados</CardTitle>
              <CardDescription>
                Índices com 0 scans que podem ser candidatos a remoção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnusedIndexesTable indexes={latest.metrics.unused_indexes} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
