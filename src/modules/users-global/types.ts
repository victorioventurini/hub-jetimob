// ============================================================
// USERS GLOBAL MODULE - Types
// ============================================================

export interface BuAccess {
  bu_id: string;
  bu_name: string;
  role_in_bu: string;
  is_default: boolean;
}

export interface GlobalUser {
  profile_id: string;
  user_id: string | null;
  display_name: string | null;
  work_email: string | null;
  onboarding_completed: boolean | null;
  primary_bu_id: string | null;
  primary_bu_name: string | null;
  last_sign_in_at: string | null;
  global_role: string | null;
  bu_accesses: BuAccess[];
}

export interface GlobalUserFilters {
  q?: string;
  buId?: string;
  onboardingStatus?: 'all' | 'completed' | 'pending';
}
