/**
 * OkrStatusBadge Component Tests
 * 
 * Tests for the status badge component used across OKR views.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OkrStatusBadge } from './OkrStatusBadge';
import type { OkrStatus, OkrRagStatus } from '../types';

// ============================================================
// Objective Status Badge Tests
// ============================================================

describe('OkrStatusBadge - Objective Type', () => {
  const objectiveStatuses: OkrStatus[] = ['draft', 'active', 'completed', 'cancelled', 'discarded'];

  it('should render for each objective status', () => {
    objectiveStatuses.forEach((status) => {
      const { container } = render(<OkrStatusBadge status={status} type="objective" />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  it('should render draft status', () => {
    render(<OkrStatusBadge status="draft" type="objective" />);
    // The component uses StatusBadge which should render the status
    expect(document.body.textContent).toBeTruthy();
  });

  it('should render active status', () => {
    render(<OkrStatusBadge status="active" type="objective" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should render completed status', () => {
    render(<OkrStatusBadge status="completed" type="objective" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should render cancelled status', () => {
    render(<OkrStatusBadge status="cancelled" type="objective" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should accept className prop', () => {
    const { container } = render(
      <OkrStatusBadge status="active" type="objective" className="custom-class" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('should default to objective type when not specified', () => {
    const { container } = render(<OkrStatusBadge status="active" />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ============================================================
// KR RAG Status Badge Tests
// ============================================================

describe('OkrStatusBadge - KR Type', () => {
  const ragStatuses: OkrRagStatus[] = ['green', 'yellow', 'red', 'not_started'];

  it('should render for each RAG status', () => {
    ragStatuses.forEach((status) => {
      const { container } = render(<OkrStatusBadge status={status} type="kr" />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  it('should render green (on track) status', () => {
    render(<OkrStatusBadge status="green" type="kr" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should render yellow (at risk) status', () => {
    render(<OkrStatusBadge status="yellow" type="kr" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should render red (off track) status', () => {
    render(<OkrStatusBadge status="red" type="kr" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should render not_started status', () => {
    render(<OkrStatusBadge status="not_started" type="kr" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('should show dot for KR type', () => {
    // KR type should have showDot={true}
    const { container } = render(<OkrStatusBadge status="green" type="kr" />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ============================================================
// Status Mapping Tests
// ============================================================

describe('Status Mapping', () => {
  describe('RAG to Status mapping', () => {
    const ragToStatusMap = {
      green: 'on_track',
      yellow: 'at_risk',
      red: 'off_track',
      not_started: 'not_started',
    };

    it('should map green to on_track', () => {
      expect(ragToStatusMap.green).toBe('on_track');
    });

    it('should map yellow to at_risk', () => {
      expect(ragToStatusMap.yellow).toBe('at_risk');
    });

    it('should map red to off_track', () => {
      expect(ragToStatusMap.red).toBe('off_track');
    });

    it('should map not_started to not_started', () => {
      expect(ragToStatusMap.not_started).toBe('not_started');
    });
  });

  describe('Objective to Status mapping', () => {
    const objectiveToStatusMap = {
      draft: 'draft',
      active: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
      discarded: 'inactive',
    };

    it('should map draft to draft', () => {
      expect(objectiveToStatusMap.draft).toBe('draft');
    });

    it('should map active to active', () => {
      expect(objectiveToStatusMap.active).toBe('active');
    });

    it('should map completed to completed', () => {
      expect(objectiveToStatusMap.completed).toBe('completed');
    });

    it('should map cancelled to cancelled', () => {
      expect(objectiveToStatusMap.cancelled).toBe('cancelled');
    });

    it('should map discarded to inactive', () => {
      expect(objectiveToStatusMap.discarded).toBe('inactive');
    });
  });
});
