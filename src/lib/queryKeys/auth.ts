/**
 * Auth & Profiles Query Keys
 */
export const authKeys = {
  identity: (userId: string | null) => ['auth', 'identity', userId] as const,
  onboardingCheck: (userId: string | null) => ['auth', 'onboarding-check', userId] as const,
  userRole: (userId: string | null) => ['auth', 'user-role', userId] as const,
} as const;

export const profilesKeys = {
  all: (buId: string | null) => ['profiles', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) => 
    ['profiles', 'list', buId, filters] as const,
  detail: (userId: string, buId?: string | null) => ['profiles', 'detail', userId, buId] as const,
  hoverCard: (userId: string, buId?: string | null) => ['profiles', 'hover-card', userId, buId] as const,
  me: () => ['profiles', 'me'] as const,
  buProfiles: (buId: string | null) => ['profiles', 'bu', buId] as const,
  buMembers: (buId: string | null) => ['profiles', 'bu-members', buId] as const,
} as const;

export const identityKeys = {
  profile: (userId: string | null) => ['identity', 'profile', userId] as const,
  permissions: (buId: string | null, userId: string | null) => 
    ['identity', 'permissions', buId, userId] as const,
  impersonatedPermissions: (buId: string | null, targetUserId: string | null) => 
    ['identity', 'permissions', 'impersonated', buId, targetUserId] as const,
  impersonatedRole: (buId: string | null, targetUserId: string | null) => 
    ['identity', 'role', 'impersonated', buId, targetUserId] as const,
  modules: (userId: string | null, buId: string | null) => 
    ['identity', 'modules', userId, buId] as const,
} as const;

export const onboardingKeys = {
  check: (userId: string | null) => ['onboarding-check', userId] as const,
  page: (userId: string | null) => ['onboarding-page', userId] as const,
  myProfile: () => ['my-profile'] as const,
  teams: (buId: string | null) => ['onboarding', 'teams', buId] as const,
} as const;

export const myProfileKeys = {
  profile: (userId: string | null) => ['my-profile', userId] as const,
  profilePrefix: () => ['my-profile'] as const,
  team: (teamId: string | null) => ['profile-team', teamId] as const,
} as const;

export const publicProfileKeys = {
  profile: (profileId: string | null, buId: string | null) => 
    ['public-profile', profileId, buId] as const,
  okrs: (userId: string | null, buId: string | null) => 
    ['user-okrs', userId, buId] as const,
  kpis: (userId: string | null, buId: string | null) => 
    ['user-kpis', userId, buId] as const,
  squads: (userId: string | null, buId: string | null) => 
    ['user-squads', userId, buId] as const,
  buMemberships: (profileId: string | null) => 
    ['user-bu-memberships', profileId] as const,
} as const;
