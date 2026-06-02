/**
 * Analysis module hooks barrel
 *
 * @see docs/canonical/HOOKS_BARREL_STANDARD.md
 */

export { useAnalysisComments } from "./useAnalysisComments";
export {
  useEditAnalysisComment,
  useDeleteAnalysisComment,
  usePinAnalysisComment,
} from "./useAnalysisCommentMutations";
export { useAnalysisDecisions } from "./useAnalysisDecisions";
export { useAnalysisFeedback } from "./useAnalysisFeedback";
export { useAnalysisHistory } from "./useAnalysisHistory";
export { useAnalysisReport } from "./useAnalysisReport";
export { useDeleteAnalysisReport } from "./useDeleteAnalysisReport";
export { useAnalysisShare } from "./useAnalysisShare";
export {
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  type TemplateFormData,
} from "./useAnalysisTemplateMutations";
export { useAnalysisTemplates } from "./useAnalysisTemplates";
export { useGenerateAnalysis } from "./useGenerateAnalysis";
