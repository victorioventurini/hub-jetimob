/**
 * ID Types Tests
 * 
 * Tests for branded ID types and profile utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  asProfileId,
  asAuthUserId,
  isValidProfileId,
  isValidAuthUserId,
  toTypedProfile,
  canReceiveNotifications,
  getNotificationBlockReason,
  type ProfileId,
  type AuthUserId,
  type TypedProfile,
} from './idTypes';

describe('asProfileId', () => {
  it('should cast a string to ProfileId', () => {
    const id = asProfileId('test-profile-123');
    expect(id).toBe('test-profile-123');
    // Type check: this should compile if types are correct
    const _typeCheck: ProfileId = id;
  });

  it('should work with UUID strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const id = asProfileId(uuid);
    expect(id).toBe(uuid);
  });

  it('should work with empty string', () => {
    const id = asProfileId('');
    expect(id).toBe('');
  });
});

describe('asAuthUserId', () => {
  it('should cast a string to AuthUserId', () => {
    const id = asAuthUserId('test-auth-123');
    expect(id).toBe('test-auth-123');
    // Type check: this should compile if types are correct
    const _typeCheck: AuthUserId = id;
  });

  it('should work with UUID strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const id = asAuthUserId(uuid);
    expect(id).toBe(uuid);
  });
});

describe('isValidProfileId', () => {
  it('should return true for non-empty strings', () => {
    expect(isValidProfileId('profile-123')).toBe(true);
  });

  it('should return true for UUID strings', () => {
    expect(isValidProfileId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidProfileId('')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidProfileId(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidProfileId(undefined)).toBe(false);
  });

  it('should act as type guard', () => {
    const maybeId: string | null = 'profile-123';
    if (isValidProfileId(maybeId)) {
      // TypeScript should narrow this to ProfileId
      const id: ProfileId = maybeId;
      expect(id).toBe('profile-123');
    }
  });
});

describe('isValidAuthUserId', () => {
  it('should return true for non-empty strings', () => {
    expect(isValidAuthUserId('auth-123')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidAuthUserId('')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidAuthUserId(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidAuthUserId(undefined)).toBe(false);
  });
});

describe('toTypedProfile', () => {
  it('should convert raw profile with user_id to TypedProfile', () => {
    const raw = {
      id: 'profile-123',
      user_id: 'auth-123',
      display_name: 'John Doe',
      work_email: 'john@example.com',
      photo_url: 'https://example.com/photo.jpg',
    };
    
    const typed = toTypedProfile(raw);
    
    expect(typed.id).toBe('profile-123');
    expect(typed.user_id).toBe('auth-123');
    expect(typed.display_name).toBe('John Doe');
    expect(typed.work_email).toBe('john@example.com');
    expect(typed.photo_url).toBe('https://example.com/photo.jpg');
  });

  it('should convert raw profile with null user_id to TypedProfile', () => {
    const raw = {
      id: 'profile-pending',
      user_id: null,
      display_name: 'Jane Doe',
      work_email: 'jane@example.com',
      photo_url: null,
    };
    
    const typed = toTypedProfile(raw);
    
    expect(typed.id).toBe('profile-pending');
    expect(typed.user_id).toBeNull();
    expect(typed.display_name).toBe('Jane Doe');
  });

  it('should handle all null optional fields', () => {
    const raw = {
      id: 'profile-minimal',
      user_id: null,
      display_name: null,
      work_email: null,
      photo_url: null,
    };
    
    const typed = toTypedProfile(raw);
    
    expect(typed.id).toBe('profile-minimal');
    expect(typed.user_id).toBeNull();
    expect(typed.display_name).toBeNull();
    expect(typed.work_email).toBeNull();
    expect(typed.photo_url).toBeNull();
  });
});

describe('canReceiveNotifications', () => {
  it('should return true when profile has user_id', () => {
    const profile: TypedProfile = {
      id: asProfileId('profile-123'),
      user_id: asAuthUserId('auth-123'),
      display_name: 'John',
      work_email: 'john@example.com',
      photo_url: null,
    };
    
    expect(canReceiveNotifications(profile)).toBe(true);
  });

  it('should return false when profile has null user_id', () => {
    const profile: TypedProfile = {
      id: asProfileId('profile-pending'),
      user_id: null,
      display_name: 'Jane',
      work_email: 'jane@example.com',
      photo_url: null,
    };
    
    expect(canReceiveNotifications(profile)).toBe(false);
  });
});

describe('getNotificationBlockReason', () => {
  it('should return null when profile can receive notifications', () => {
    const profile: TypedProfile = {
      id: asProfileId('profile-123'),
      user_id: asAuthUserId('auth-123'),
      display_name: 'John',
      work_email: 'john@example.com',
      photo_url: null,
    };
    
    expect(getNotificationBlockReason(profile)).toBeNull();
  });

  it('should return reason when profile has null user_id', () => {
    const profile: TypedProfile = {
      id: asProfileId('profile-pending'),
      user_id: null,
      display_name: 'Jane',
      work_email: 'jane@example.com',
      photo_url: null,
    };
    
    const reason = getNotificationBlockReason(profile);
    expect(reason).not.toBeNull();
    expect(reason).toContain('login');
    expect(reason).toContain('notificações');
  });
});

describe('Type safety (compile-time checks)', () => {
  it('should not allow ProfileId where AuthUserId is expected (conceptual test)', () => {
    // This test documents the expected behavior
    // In TypeScript, these types are structurally different due to branded types
    const profileId = asProfileId('profile-123');
    const authUserId = asAuthUserId('auth-123');
    
    // Both are strings at runtime
    expect(typeof profileId).toBe('string');
    expect(typeof authUserId).toBe('string');
    
    // But they should be used correctly in context
    // The branded types ensure compile-time safety
    // If someone tries to use profileId where authUserId is expected,
    // TypeScript will show an error (cannot be tested at runtime)
  });
});
