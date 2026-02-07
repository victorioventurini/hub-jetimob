/**
 * Recommendation Utilities
 * 
 * Helper functions for Equipment Recommendations feature.
 * @see TCR v2.93.0 - Módulo Assets Recommendations
 */

import { differenceInDays, addMonths } from 'date-fns';
import type { 
  AssetRecommendation, 
  RecommendationReviewStatus, 
  RecommendationScopeType 
} from '../types';

/**
 * Calculates the review status based on last review date and interval.
 * 
 * @param lastReviewedAt - ISO date of last review (null = never reviewed = overdue)
 * @param reviewIntervalMonths - Review interval in months (3, 6, or 12)
 * @returns Review status: 'up_to_date' | 'due_soon' | 'overdue'
 */
export function getReviewStatus(
  lastReviewedAt: string | null,
  reviewIntervalMonths: number
): RecommendationReviewStatus {
  if (!lastReviewedAt) return 'overdue';
  
  const nextDue = addMonths(new Date(lastReviewedAt), reviewIntervalMonths);
  const daysUntil = differenceInDays(nextDue, new Date());
  
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 14) return 'due_soon';
  return 'up_to_date';
}

/**
 * Determines the scope type based on applicable teams/job titles.
 * Priority: job_title > team > global
 * 
 * @param teamIds - Array of applicable team IDs
 * @param jobTitleIds - Array of applicable job title IDs
 * @returns Scope type: 'global' | 'team' | 'job_title'
 */
export function getScopeType(
  teamIds: string[],
  jobTitleIds: string[]
): RecommendationScopeType {
  if (jobTitleIds.length > 0) return 'job_title';
  if (teamIds.length > 0) return 'team';
  return 'global';
}

/**
 * Scores a recommendation based on user context for ranking.
 * Higher score = more relevant recommendation.
 * 
 * Priority: Cargo (100) > Time (10) > Global (1) > Not applicable (0)
 * 
 * @param rec - The recommendation to score
 * @param userTeamId - User's current team ID (optional)
 * @param userJobTitleId - User's current job title ID (optional)
 * @returns Score for sorting (higher = more relevant)
 */
export function scoreRecommendation(
  rec: AssetRecommendation,
  userTeamId?: string,
  userJobTitleId?: string
): number {
  // Cargo match = highest priority (100 points)
  if (userJobTitleId && rec.applicable_job_title_ids.includes(userJobTitleId)) {
    return 100;
  }
  
  // Team match = medium priority (10 points)
  if (userTeamId && rec.applicable_team_ids.includes(userTeamId)) {
    return 10;
  }
  
  // Global (no scopes) = low priority (1 point)
  if (rec.applicable_team_ids.length === 0 && rec.applicable_job_title_ids.length === 0) {
    return 1;
  }
  
  // Not applicable (has scopes but doesn't match user)
  return 0;
}

/**
 * Enriches a recommendation with computed fields (review_status, scope_type).
 * 
 * @param rec - Raw recommendation from database
 * @returns Recommendation with computed fields
 */
export function enrichRecommendation(rec: AssetRecommendation): AssetRecommendation {
  return {
    ...rec,
    review_status: getReviewStatus(rec.last_reviewed_at, rec.review_interval_months),
    scope_type: getScopeType(rec.applicable_team_ids, rec.applicable_job_title_ids),
  };
}

/**
 * Filters and sorts recommendations by relevance for a given context.
 * 
 * @param recommendations - List of recommendations to filter
 * @param categoryId - Filter by category ID (optional)
 * @param teamId - User's team for relevance scoring (optional)
 * @param jobTitleId - User's job title for relevance scoring (optional)
 * @returns Sorted recommendations (most relevant first)
 */
export function filterAndRankRecommendations(
  recommendations: AssetRecommendation[],
  categoryId?: string,
  teamId?: string,
  jobTitleId?: string
): AssetRecommendation[] {
  let filtered = recommendations;
  
  // Filter by category if provided
  if (categoryId) {
    filtered = filtered.filter(r => r.category_id === categoryId);
  }
  
  // Score and sort by relevance
  const scored = filtered.map(rec => ({
    rec,
    score: scoreRecommendation(rec, teamId, jobTitleId),
  }));
  
  // Sort by score descending, then by name ascending
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.rec.name.localeCompare(b.rec.name, 'pt-BR');
  });
  
  return scored.map(s => s.rec);
}

/**
 * Groups recommendations by scope type for display.
 * 
 * @param recommendations - List of recommendations
 * @param teamId - User's team for relevance (optional)
 * @param jobTitleId - User's job title for relevance (optional)
 * @returns Object with grouped recommendations
 */
export function groupRecommendationsByScope(
  recommendations: AssetRecommendation[],
  teamId?: string,
  jobTitleId?: string
): {
  byJobTitle: AssetRecommendation[];
  byTeam: AssetRecommendation[];
  global: AssetRecommendation[];
} {
  const byJobTitle: AssetRecommendation[] = [];
  const byTeam: AssetRecommendation[] = [];
  const global: AssetRecommendation[] = [];
  
  for (const rec of recommendations) {
    const score = scoreRecommendation(rec, teamId, jobTitleId);
    
    if (score === 100) {
      byJobTitle.push(rec);
    } else if (score === 10) {
      byTeam.push(rec);
    } else {
      // score === 1 (global) or score === 0 (scoped but no user context to match)
      // Always show in global bucket so recommendations are never hidden
      global.push(rec);
    }
  }
  
  return { byJobTitle, byTeam, global };
}
