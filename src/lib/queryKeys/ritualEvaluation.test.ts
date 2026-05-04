import { describe, it, expect } from 'vitest';
import { ritualEvaluationKeys } from './ritualEvaluation';

describe('ritualEvaluationKeys', () => {
  it('all() returns global prefix', () => {
    expect(ritualEvaluationKeys.all()).toEqual(['ritualEvaluation']);
  });

  it('form key prefixed by formPrefix', () => {
    expect(ritualEvaluationKeys.form('AB12')).toEqual([
      'ritualEvaluation',
      'form',
      'AB12',
    ]);
    expect(ritualEvaluationKeys.form('AB12')[0]).toBe(
      ritualEvaluationKeys.formPrefix()[0],
    );
  });

  it('liveCount key carries sessionId', () => {
    expect(ritualEvaluationKeys.liveCount('s1')).toEqual([
      'ritualEvaluation',
      'liveCount',
      's1',
    ]);
  });

  it('summary and openAnswers built consistently', () => {
    expect(ritualEvaluationKeys.summary('s1')).toEqual([
      'ritualEvaluation',
      'summary',
      's1',
    ]);
    expect(ritualEvaluationKeys.openAnswers('s1')).toEqual([
      'ritualEvaluation',
      'openAnswers',
      's1',
    ]);
  });

  it('handles null', () => {
    expect(ritualEvaluationKeys.form(null)).toEqual([
      'ritualEvaluation',
      'form',
      null,
    ]);
  });
});
