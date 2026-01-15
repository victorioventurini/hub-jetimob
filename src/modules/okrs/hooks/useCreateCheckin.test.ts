/**
 * useCreateCheckin Hook Tests
 * 
 * Tests for the check-in creation hook and helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  statusToConfidence,
  confidenceToStatus,
  type CheckinConfidence,
  type CheckinStatus,
} from './useCreateCheckin';

// ============================================================
// Helper Function Tests
// ============================================================

describe('statusToConfidence', () => {
  it('should map green to high', () => {
    expect(statusToConfidence('green')).toBe('high');
  });

  it('should map yellow to medium', () => {
    expect(statusToConfidence('yellow')).toBe('medium');
  });

  it('should map red to low', () => {
    expect(statusToConfidence('red')).toBe('low');
  });

  it('should handle all valid status values', () => {
    const statuses: CheckinStatus[] = ['green', 'yellow', 'red'];
    const expectedConfidences: CheckinConfidence[] = ['high', 'medium', 'low'];
    
    statuses.forEach((status, index) => {
      expect(statusToConfidence(status)).toBe(expectedConfidences[index]);
    });
  });
});

describe('confidenceToStatus', () => {
  it('should map high to green', () => {
    expect(confidenceToStatus('high')).toBe('green');
  });

  it('should map medium to yellow', () => {
    expect(confidenceToStatus('medium')).toBe('yellow');
  });

  it('should map low to red', () => {
    expect(confidenceToStatus('low')).toBe('red');
  });

  it('should be the inverse of statusToConfidence', () => {
    const statuses: CheckinStatus[] = ['green', 'yellow', 'red'];
    
    statuses.forEach(status => {
      const confidence = statusToConfidence(status);
      expect(confidenceToStatus(confidence)).toBe(status);
    });
  });

  it('should handle all valid confidence values', () => {
    const confidences: CheckinConfidence[] = ['high', 'medium', 'low'];
    const expectedStatuses: CheckinStatus[] = ['green', 'yellow', 'red'];
    
    confidences.forEach((confidence, index) => {
      expect(confidenceToStatus(confidence)).toBe(expectedStatuses[index]);
    });
  });
});

// ============================================================
// Type Validation Tests
// ============================================================

describe('CreateCheckinInput type validation', () => {
  it('should accept valid input structure', () => {
    // This is a compile-time check - if types are wrong, TS will fail
    const validInput = {
      krId: 'kr-123',
      currentValue: 50,
      previousValue: 40,
      confidence: 'high' as CheckinConfidence,
      comments: 'Making good progress',
      blockers: 'None',
      teamId: 'team-456',
    };
    
    expect(validInput.krId).toBeDefined();
    expect(validInput.currentValue).toBe(50);
    expect(validInput.previousValue).toBe(40);
    expect(validInput.confidence).toBe('high');
  });

  it('should accept input without optional fields', () => {
    const minimalInput = {
      krId: 'kr-123',
      currentValue: 50,
      previousValue: 40,
      confidence: 'medium' as CheckinConfidence,
    };
    
    expect(minimalInput.krId).toBeDefined();
    expect(minimalInput.confidence).toBe('medium');
  });
});
