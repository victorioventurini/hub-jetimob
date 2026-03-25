/**
 * QbrKpiAnalysisStep - Step 2: Análise de KPIs e Métricas
 * 
 * Carrega KPIs do escopo do líder com valor atual, RAG status e variação.
 * Permite marcar KPIs como "zombie" ou sinalizar KPIs a criar.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Activity, AlertTriangle, Plus, X, Ghost,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type {
  MbrKpiSnapshot,
  QbrPreDraftData,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrKpiAnalysisStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  zombieCandidates: string[];
  onZombieCandidatesChange: (ids: string[]) => void;
  kpisToCreate: QbrPreDraftData['kpisToCreate'];
  onKpisToCreateChange: (kpis: QbrPreDraftData['kpisToCreate']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const RAG_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  green: { label: 'Na meta', color: 'text-status-green', bg: 'bg-status-green-muted' },
  yellow: { label: 'Atenção', color: 'text-status-amber', bg: 'bg-status-amber-muted' },
  red: { label: 'Crítico', color: 'text-status-red', bg: 'bg-status-red-muted' },
  no_data: { label: 'Sem dados', color: 'text-muted-foreground', bg: 'bg-muted' },
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrKpiAnalysisStep({
  kpiSnapshots,
  zombieCandidates,
  onZombieCandidatesChange,
  kpisToCreate,
  onKpisToCreateChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrKpiAnalysisStepProps) {
  const [newKpiDesc, setNewKpiDesc] = useState('');
  const [newKpiScope, setNewKpiScope] = useState('team');

  const handleToggleZombie = (kpiId: string) => {
    if (zombieCandidates.includes(kpiId)) {
      onZombieCandidatesChange(zombieCandidates.filter(id => id !== kpiId));
    } else {
      onZombieCandidatesChange([...zombieCandidates, kpiId]);
    }
  };

  const handleAddKpiToCreate = () => {
    if (!newKpiDesc.trim()) return;
    onKpisToCreateChange([
      ...kpisToCreate,
      { description: newKpiDesc.trim(), suggestedScope: newKpiScope, relatedKrTitle: '' },
    ]);
    setNewKpiDesc('');
  };

  const handleRemoveKpiToCreate = (index: number) => {
    onKpisToCreateChange(kpisToCreate.filter((_, i) => i !== index));
  };

  const alertKpis = kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');
  const healthyKpis = kpiSnapshots.filter(k => k.ragStatus === 'green');
  const noDataKpis = kpiSnapshots.filter(k => k.ragStatus === 'no_data');

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Activity}
          title="Análise de KPIs"
          description="Revise a saúde dos indicadores e sinalize oportunidades"
          variant="amber"
          badge={`${kpiSnapshots.length} KPIs`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-kpi-analysis"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* KPIs in alert */}
        {alertKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-amber" />
              KPIs em alerta ({alertKpis.length})
            </h4>
            {alertKpis.map((kpi) => {
              const rag = RAG_STYLES[kpi.ragStatus] || RAG_STYLES.no_data;
              const isZombie = zombieCandidates.includes(kpi.kpiId);
              return (
                <Card key={kpi.kpiId} className={cn(isZombie && 'border-dashed opacity-60')}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{kpi.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={cn('text-xs', rag.color)}>
                            {rag.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Atual: {kpi.currentValue != null ? kpi.currentValue : '—'} {kpi.unit}
                          </span>
                          {kpi.target != null && (
                            <span className="text-xs text-muted-foreground">
                              Meta: {kpi.target} {kpi.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={`zombie-${kpi.kpiId}`}
                          checked={isZombie}
                          onCheckedChange={() => handleToggleZombie(kpi.kpiId)}
                        />
                        <Label htmlFor={`zombie-${kpi.kpiId}`} className="text-xs cursor-pointer flex items-center gap-1">
                          <Ghost className="h-3 w-3" />
                          Zombie?
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Healthy KPIs */}
        {healthyKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-status-green">
              KPIs na meta ({healthyKpis.length})
            </h4>
            {healthyKpis.map((kpi) => {
              const isZombie = zombieCandidates.includes(kpi.kpiId);
              return (
                <Card key={kpi.kpiId} className={cn('border-status-green/20', isZombie && 'border-dashed opacity-60')}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{kpi.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {kpi.currentValue != null ? kpi.currentValue : '—'} {kpi.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={`zombie-healthy-${kpi.kpiId}`}
                          checked={isZombie}
                          onCheckedChange={() => handleToggleZombie(kpi.kpiId)}
                        />
                        <Label htmlFor={`zombie-healthy-${kpi.kpiId}`} className="text-xs cursor-pointer">
                          <Ghost className="h-3 w-3" />
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* KPIs to create */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            KPIs que deveriam existir
          </h4>
          <p className="text-xs text-muted-foreground">
            Há indicadores que você usa para tomar decisões mas não estão no sistema?
          </p>

          <div className="flex gap-2">
            <Input
              value={newKpiDesc}
              onChange={(e) => setNewKpiDesc(e.target.value)}
              placeholder="Descreva o indicador..."
              className="text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddKpiToCreate(); }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddKpiToCreate}
              disabled={!newKpiDesc.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {kpisToCreate.length > 0 && (
            <div className="space-y-2">
              {kpisToCreate.map((kpi, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <span className="text-sm flex-1">{kpi.description}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveKpiToCreate(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zombie summary */}
        {zombieCandidates.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Ghost className="h-3.5 w-3.5" />
              {zombieCandidates.length} KPI{zombieCandidates.length > 1 ? 's' : ''} marcado{zombieCandidates.length > 1 ? 's' : ''} como potencialmente zombie — serão discutidos no QBR.
            </p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
