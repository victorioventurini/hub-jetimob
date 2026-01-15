/**
 * Profile Test Fixtures
 * 
 * Factory functions and default fixtures for profile-related tests.
 */

import { asProfileId, asAuthUserId, TypedProfile } from '@/lib/idTypes';

export interface ProfileFixture {
  id: string;
  user_id: string | null;
  display_name: string | null;
  work_email: string | null;
  photo_url: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

// Default profile IDs for consistent testing
export const TEST_PROFILE_ID = 'profile-test-001';
export const TEST_AUTH_USER_ID = 'auth-user-test-001';

// Factory function
export function createMockProfile(overrides: Partial<ProfileFixture> = {}): ProfileFixture {
  return {
    id: TEST_PROFILE_ID,
    user_id: TEST_AUTH_USER_ID,
    display_name: 'Test User',
    work_email: 'test@jetimob.com',
    photo_url: null,
    first_name: 'Test',
    last_name: 'User',
    ...overrides,
  };
}

// Factory for TypedProfile
export function createMockTypedProfile(overrides: Partial<ProfileFixture> = {}): TypedProfile {
  const raw = createMockProfile(overrides);
  return {
    id: asProfileId(raw.id),
    user_id: raw.user_id ? asAuthUserId(raw.user_id) : null,
    display_name: raw.display_name,
    work_email: raw.work_email,
    photo_url: raw.photo_url,
  };
}

// Pre-defined fixtures for common scenarios
export const FIXTURES = {
  // Regular active user
  activeUser: createMockProfile({
    id: 'profile-active-001',
    user_id: 'auth-active-001',
    display_name: 'Active User',
    work_email: 'active@jetimob.com',
  }),
  
  // User who never logged in (no auth.users record)
  pendingUser: createMockProfile({
    id: 'profile-pending-001',
    user_id: null,
    display_name: 'Pending User',
    work_email: 'pending@jetimob.com',
  }),
  
  // Admin user
  adminUser: createMockProfile({
    id: 'profile-admin-001',
    user_id: 'auth-admin-001',
    display_name: 'Admin User',
    work_email: 'admin@jetimob.com',
  }),
};
