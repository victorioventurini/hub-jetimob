/**
 * OkrHealthPage - Página de Saúde de Execução das OKRs Organizacionais
 * 
 * Estrutura similar ao Construction Review, mas focada em EXECUÇÃO:
 * - Grid 1/3 (Score Card) + 2/3 (Objetivos)
 * - Análise automática por IA de cada objetivo
 * - Análise consolidada da organização
 * 
 * Acesso: Apenas Admin e Super Admin
 */

import { Helmet } from "react-helmet-async";
import { ArrowLeft, Info, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOrgHealthReview } from "../hooks";
import { OrgHealthScoreCard, OrgObjectiveHealthCard } from "../components/health";
import { useState } from "react";

export default function OkrHealthPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Available years (current year + 1 year back)
  const availableYears = [currentYear, currentYear - 1];
  
  usePageTitle('Saúde das OKRs Organizacionais');

  // Fetch health review data
  const {
    objectives,
    scores,
    counts,
    consolidatedAnalysis,
    consolidatedAnalysisLoading,
    consolidatedAnalysisError,
    isLoading,
    error,
    reEvaluateObjective,
    refreshConsolidatedAnalysis,
  } = useOrgHealthReview(selectedYear);

  return (
    <>
      <Helmet>
        <title>Saúde das OKRs Organizacionais | Hub Jetimob</title>
        <meta 
          name="description" 
          content="Monitore a execução das OKRs organizacionais: progresso, check-ins, contribuições de times e análise de saúde por IA" 
        />
      </Helmet>

      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/okrs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Saúde das OKRs Organizacionais</h1>
              <p className="text-muted-foreground text-sm">
                Monitore a execução e acompanhamento das OKRs da empresa
              </p>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(val) => setSelectedYear(parseInt(val))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Navigation Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Esta página mostra a saúde da execução</AlertTitle>
          <AlertDescription>
            Para avaliar a qualidade da criação das OKRs de times, acesse{" "}
            <Link to="/okrs/construction-review" className="underline font-medium hover:text-primary">
              Avaliação de Construção
            </Link>
          </AlertDescription>
        </Alert>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Skeleton className="h-[500px]" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : objectives.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Nenhum objetivo organizacional encontrado</AlertTitle>
            <AlertDescription>
              Não há objetivos organizacionais cadastrados para o ano de {selectedYear}.
              Acesse{" "}
              <Link to="/okrs/org" className="underline font-medium hover:text-primary">
                OKRs Organizacionais
              </Link>{" "}
              para criar novos objetivos.
            </AlertDescription>
          </Alert>
        ) : (
          /* Main Content - Grid Layout */
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Score Card (1/3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <OrgHealthScoreCard
                  overallScore={scores.overall}
                  scores={{
                    cohesion: scores.cohesion,
                    distribution: scores.distribution,
                    coverage: scores.coverage,
                    traceability: scores.traceability,
                  }}
                  counts={counts}
                  consolidatedAnalysis={consolidatedAnalysis}
                  consolidatedLoading={consolidatedAnalysisLoading}
                  consolidatedError={consolidatedAnalysisError}
                  onRefreshAnalysis={refreshConsolidatedAnalysis}
                />
              </div>
            </div>

            {/* Right Column - Objectives List (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Objetivos Organizacionais ({objectives.length})
                </h2>
              </div>

              {objectives.map((objective) => (
                <OrgObjectiveHealthCard
                  key={objective.objectiveId}
                  review={objective}
                  onReEvaluate={reEvaluateObjective}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
