/**
 * Página de Avaliação de Construção de OKRs Organizacionais
 * 
 * Permite que admins de BU avaliem a qualidade metodológica de construção
 * dos OKRs organizacionais usando IA (agente validador-metodologico-okrs).
 * 
 * @see TCR v2.75.0 - Módulo OKRs
 * @route /okrs/org-construction-review
 * @access requiresBuAdmin
 */

import { Suspense } from 'react';
import { Building2, FileCheck, Loader2 } from 'lucide-react';
import { useBu } from '@/contexts/BuContext';
import { useUrlState } from '@/shared/url/useUrlState';
import { useOrgConstructionReview } from '../hooks/useOrgConstructionReview';
import { ConstructionScoreCard, ObjectiveChecklistCard } from '../components/construction';
import { REVIEW_CRITERIA } from '../types/construction-review';
import { YearSelect } from '@/components/selects/YearSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

function LoadingSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64" />
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}

function OrgConstructionReviewContent() {
  const { currentBuId } = useBu();
  const currentYear = new Date().getFullYear();
  
  const { value: year, set: setYear } = useUrlState<number>({
    key: 'year',
    defaultValue: currentYear,
    parse: (v) => parseInt(v, 10),
    serialize: (v) => v.toString(),
  });

  const {
    objectives,
    avgScore,
    approvedCount,
    needsImprovementCount,
    pendingCount,
    totalObjectives,
    isLoading,
    error,
    reEvaluateObjective,
  } = useOrgConstructionReview(year);

  if (!currentBuId) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <Alert variant="destructive">
          <AlertDescription>Selecione uma BU para continuar.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar OKRs organizacionais: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Avaliação de Construção - OKRs Organizacionais
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise de qualidade metodológica dos OKRs de nível empresa
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ano:</span>
          <YearSelect
            value={year}
            onValueChange={setYear}
            years={[currentYear - 1, currentYear, currentYear + 1]}
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && objectives.length === 0 && (
        <Alert>
          <FileCheck className="h-4 w-4" />
          <AlertDescription>
            Nenhum objetivo organizacional encontrado para {year}. 
            Crie OKRs organizacionais antes de avaliar a qualidade de construção.
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {!isLoading && objectives.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Card (1/3) */}
          <div className="lg:col-span-1">
            <ConstructionScoreCard
              avgScore={avgScore}
              approvedCount={approvedCount}
              needsImprovementCount={needsImprovementCount}
              pendingCount={pendingCount}
              totalObjectives={totalObjectives}
            />
          </div>

          {/* Objectives List (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">
                Objetivos Organizacionais ({objectives.length})
              </h2>
            </div>

            {objectives.map((objective) => (
              <ObjectiveChecklistCard
                key={objective.objectiveId}
                review={objective}
                criteria={REVIEW_CRITERIA}
                onReEvaluate={(id) => reEvaluateObjective(id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgConstructionReviewPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OrgConstructionReviewContent />
    </Suspense>
  );
}
