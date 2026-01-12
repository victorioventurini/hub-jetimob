/**
 * OKR Utils - Barrel Export
 * 
 * Consolidates all OKR utility functions and validation logic.
 */

// KR Validation
export {
  validateKrTitle,
  validateKrValues,
  validateTeamKr,
  validateOrgKr,
  validateKrMetrics,
  canKrTypeContributeToOrg,
  getKrTypeContributionExplanation,
  getRandomPlaceholder,
  ORG_KR_PLACEHOLDERS,
  TEAM_KR_PLACEHOLDERS,
  type KrValidationResult,
} from './krValidation';

// Health Score
export {
  calculateObjectiveHealth,
  useObjectiveHealth,
  getHealthLevelConfig,
  type HealthLevel,
  type HealthFactor,
  type ObjectiveHealth,
} from './healthScore';

// Linking Rules
export {
  // Validation functions
  validateObjectiveToObjective,
  validateKrToObjective,
  validateKrToKr,
  // Limit validation
  validateObjectivesLimit,
  validateKrsLimit,
  validateContributionsLimit,
  // Helper functions
  getKrTypeExplanation,
  getLinkingRuleExplanation,
  // Constants
  OKR_LIMITS,
  // Types
  type LinkingEntityLevel,
  type LinkingEntityType,
  type LinkingValidation,
  type KrType,
  type LimitValidation,
} from './linkingRules';
