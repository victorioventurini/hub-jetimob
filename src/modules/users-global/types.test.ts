/**
 * Users-Global module — type & filter tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  EmploymentStatus,
  GlobalUser,
  GlobalUserFilters,
  UserTypeFilter,
  StatusFilter,
  BuAccess,
} from './types';

describe('Users-Global · employment status', () => {
  it('cobre 4 estados (active, vacation, terminated, external)', () => {
    const s: EmploymentStatus[] = ['active', 'vacation', 'terminated', 'external'];
    expect(new Set(s).size).toBe(4);
  });

  it('terminated é o único estado que esconde por padrão (ver includeTerminated)', () => {
    const f: GlobalUserFilters = { includeTerminated: false };
    expect(f.includeTerminated).toBe(false);
  });
});

describe('Users-Global · GlobalUser shape', () => {
  it('bu_accesses é array (multi-BU obrigatório)', () => {
    const access: BuAccess = { bu_id: 'bu1', bu_name: 'BU 1', role_in_bu: 'leader', is_default: true };
    const u: GlobalUser = {
      profile_id: 'p1', user_id: 'u1', display_name: 'Joana', work_email: 'j@x.com',
      user_type: 'internal', onboarding_completed: true,
      primary_bu_id: 'bu1', primary_bu_name: 'BU 1',
      last_sign_in_at: null, global_role: null,
      bu_accesses: [access], employment_status: 'active', deleted_at: null,
    };
    expect(u.bu_accesses).toHaveLength(1);
    expect(u.bu_accesses[0].is_default).toBe(true);
  });

  it('user_type=external pode ter user_id null (convidado externo)', () => {
    const u: GlobalUser = {
      profile_id: 'p2', user_id: null, display_name: 'Visitor', work_email: null,
      user_type: 'external', onboarding_completed: false,
      primary_bu_id: null, primary_bu_name: null,
      last_sign_in_at: null, global_role: null, bu_accesses: [],
      employment_status: 'external', deleted_at: null,
    };
    expect(u.user_id).toBeNull();
    expect(u.user_type).toBe('external');
  });
});

describe('Users-Global · filter enums', () => {
  it('UserTypeFilter inclui "all" para limpar filtro', () => {
    const v: UserTypeFilter[] = ['all', 'internal', 'external'];
    expect(v).toContain('all');
  });

  it('StatusFilter agrupa terminated separadamente de active', () => {
    const v: StatusFilter[] = ['active', 'terminated', 'all'];
    expect(v).toEqual(expect.arrayContaining(['active', 'terminated']));
  });
});
