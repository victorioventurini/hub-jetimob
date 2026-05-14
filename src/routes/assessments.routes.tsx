/**
 * Assessments Routes — módulo BU-scoped + runner público.
 */
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { BuRequiredRoute } from "@/components/auth/BuRequiredRoute";
import { ModuleRoute } from "@/components/auth/ModuleRoute";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const AssessmentsPage = lazyWithRetry(() => import("@/modules/assessments/pages/AssessmentsPage"));
const FormEditorPage = lazyWithRetry(() => import("@/modules/assessments/pages/FormEditorPage"));
const AssessmentDetailPage = lazyWithRetry(() => import("@/modules/assessments/pages/AssessmentDetailPage"));
const RunDetailPage = lazyWithRetry(() => import("@/modules/assessments/pages/RunDetailPage"));
const AssessmentPreviewPage = lazyWithRetry(() => import("@/modules/assessments/pages/AssessmentPreviewPage"));

function AssessmentsRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="assessments">{children}</ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const assessmentRoutes = (
  <>
    <Route path="/assessments" element={<AssessmentsRoute><AssessmentsPage /></AssessmentsRoute>} />
    <Route path="/assessments/forms/:id" element={<AssessmentsRoute><FormEditorPage /></AssessmentsRoute>} />
    <Route path="/assessments/provas/:id" element={<AssessmentsRoute><AssessmentDetailPage /></AssessmentsRoute>} />
    <Route path="/assessments/runs/:runId" element={<AssessmentsRoute><RunDetailPage /></AssessmentsRoute>} />
  </>
);
