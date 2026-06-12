/**
 * Analysis Routes
 *
 * Rotas do módulo Análise Estratégica - requerem BU e módulo 'analysis' ativo.
 */

import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { BuRequiredRoute } from "@/components/auth/BuRequiredRoute";
import { ModuleRoute } from "@/components/auth/ModuleRoute";
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const AnalysisHomePage = lazyWithRetry(
  () => import("@/modules/analysis/pages/AnalysisHomePage")
);
const AnalysisResultPage = lazyWithRetry(
  () => import("@/modules/analysis/pages/AnalysisResultPage")
);
const AnalysisTemplatesPage = lazyWithRetry(
  () => import("@/modules/analysis/pages/AnalysisTemplatesPage")
);
const AnalysisChatPage = lazyWithRetry(
  () => import("@/modules/analysis/pages/AnalysisChatPage")
);

function AnalysisRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="analysis">{children}</ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const analysisRoutes = (
  <>
    <Route
      path="/analysis"
      element={
        <AnalysisRoute>
          <AnalysisHomePage />
        </AnalysisRoute>
      }
    />
    <Route
      path="/analysis/templates"
      element={
        <AnalysisRoute>
          <AnalysisTemplatesPage />
        </AnalysisRoute>
      }
    />
    <Route
      path="/analysis/:reportId"
      element={
        <AnalysisRoute>
          <AnalysisResultPage />
        </AnalysisRoute>
      }
    />
  </>
);
