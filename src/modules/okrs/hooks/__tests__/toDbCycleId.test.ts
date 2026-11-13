import { describe, it, expect } from 'vitest';
import { toDbCycleId } from '../useGenericWizardDraft.session';

describe('toDbCycleId', () => {
  it("never sends the 'no-cycle' placeholder to the database", () => {
    expect(toDbCycleId('no-cycle')).toBeNull();
  });
  it('keeps a real cycle uuid', () => {
    expect(toDbCycleId('a074c24a-481f-4a26-849c-2f9c22a31d05')).toBe('a074c24a-481f-4a26-849c-2f9c22a31d05');
  });
});
