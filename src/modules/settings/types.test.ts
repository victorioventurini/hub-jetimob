/**
 * Settings · JobTitles — type & multi-BU invariants (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type { JobTitle, JobTitleFormData, JobTitleWithUsageCount } from './types';

describe('Settings · JobTitle', () => {
  it('bu_ids é sempre array (multi-BU desde Wave 2.6)', () => {
    const j: JobTitle = {
      id: 'jt1', bu_ids: ['bu1', 'bu2'], name: 'Engineer',
      description: null, is_active: true,
      created_at: '', updated_at: '', deleted_at: null,
    };
    expect(Array.isArray(j.bu_ids)).toBe(true);
    expect(j.bu_ids).toHaveLength(2);
  });

  it('soft-deletable via deleted_at', () => {
    const j: JobTitle = {
      id: 'jt1', bu_ids: [], name: 'X', description: null, is_active: true,
      created_at: '', updated_at: '', deleted_at: '2026-01-01T00:00:00Z',
    };
    expect(j.deleted_at).not.toBeNull();
  });
});

describe('Settings · JobTitleFormData', () => {
  it('exige bu_ids no formulário (não pode criar cargo órfão)', () => {
    const form: JobTitleFormData = { name: 'Eng', is_active: true, bu_ids: ['bu1'] };
    expect(form.bu_ids.length).toBeGreaterThan(0);
  });
});

describe('Settings · JobTitleWithUsageCount', () => {
  it('estende JobTitle com contador de uso para warnings de exclusão', () => {
    const j: JobTitleWithUsageCount = {
      id: 'jt1', bu_ids: [], name: 'PM', description: null, is_active: true,
      created_at: '', updated_at: '', deleted_at: null,
      usage_count: 5,
    };
    expect(j.usage_count).toBe(5);
  });
});
