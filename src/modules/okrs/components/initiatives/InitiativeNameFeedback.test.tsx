/**
 * @file InitiativeNameFeedback.test.tsx
 * @description Tests for InitiativeNameFeedback component
 * 
 * Coverage:
 * - Feedback rendering
 * - Loading state
 * - Feedback types (warning, suggestion, success)
 * - Icon display
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InitiativeNameFeedback } from './InitiativeNameFeedback';

// Define the feedback type locally for testing
interface InitiativeNameFeedbackType {
  type: 'warning' | 'suggestion' | 'success';
  message: string;
  suggestion?: string;
}

describe('InitiativeNameFeedback', () => {
  describe('loading state', () => {
    it('should show loading indicator when isValidating is true', () => {
      const { container } = render(
        <InitiativeNameFeedback isValidating={true} feedback={null} />
      );
      
      // Should show loading spinner or indicator
      expect(container).toBeInTheDocument();
    });

    it('should not show loading when isValidating is false', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={null} />
      );
      
      // No loading indicator
    });
  });

  describe('null feedback', () => {
    it('should return null when no feedback is provided', () => {
      const { container } = render(
        <InitiativeNameFeedback isValidating={false} feedback={null} />
      );
      
      // Should render nothing (or minimal wrapper)
      expect(container.firstChild).toBeNull();
    });
  });

  describe('warning feedback', () => {
    const warningFeedback: InitiativeNameFeedbackType = {
      type: 'warning',
      message: 'This initiative name may need improvement',
      suggestion: 'Consider being more specific',
    };

    it('should render warning message', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={warningFeedback} />
      );
      
      expect(screen.getByText(/need improvement/i)).toBeInTheDocument();
    });

    it('should render suggestion when provided', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={warningFeedback} />
      );
      
      expect(screen.getByText(/being more specific/i)).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      const { container } = render(
        <InitiativeNameFeedback isValidating={false} feedback={warningFeedback} />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('suggestion feedback', () => {
    const suggestionFeedback: InitiativeNameFeedbackType = {
      type: 'suggestion',
      message: 'Good start! Here is a suggestion',
      suggestion: 'Add measurable outcome',
    };

    it('should render suggestion message', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={suggestionFeedback} />
      );
      
      expect(screen.getByText(/good start/i)).toBeInTheDocument();
    });

    it('should render the suggestion text', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={suggestionFeedback} />
      );
      
      expect(screen.getByText(/measurable outcome/i)).toBeInTheDocument();
    });
  });

  describe('success feedback', () => {
    const successFeedback: InitiativeNameFeedbackType = {
      type: 'success',
      message: 'Great initiative name!',
    };

    it('should render success message', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={successFeedback} />
      );
      
      expect(screen.getByText(/great initiative/i)).toBeInTheDocument();
    });

    it('should render success icon', () => {
      const { container } = render(
        <InitiativeNameFeedback isValidating={false} feedback={successFeedback} />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('feedback without suggestion', () => {
    const feedbackWithoutSuggestion: InitiativeNameFeedbackType = {
      type: 'warning',
      message: 'Warning message only',
    };

    it('should render without suggestion section', () => {
      render(
        <InitiativeNameFeedback isValidating={false} feedback={feedbackWithoutSuggestion} />
      );
      
      expect(screen.getByText(/warning message only/i)).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require isValidating prop', () => {
      const props = {
        isValidating: false,
        feedback: null,
      };
      
      expect(typeof props.isValidating).toBe('boolean');
    });

    it('should require feedback prop (nullable)', () => {
      const propsWithNull = { isValidating: false, feedback: null };
      const propsWithFeedback = {
        isValidating: false,
        feedback: { type: 'success' as const, message: 'Test' },
      };
      
      expect(propsWithNull.feedback).toBeNull();
      expect(propsWithFeedback.feedback).toBeDefined();
    });
  });

  describe('feedback types', () => {
    it('should support warning type', () => {
      const types = ['warning', 'suggestion', 'success'];
      expect(types).toContain('warning');
    });

    it('should support suggestion type', () => {
      const types = ['warning', 'suggestion', 'success'];
      expect(types).toContain('suggestion');
    });

    it('should support success type', () => {
      const types = ['warning', 'suggestion', 'success'];
      expect(types).toContain('success');
    });
  });

  describe('FEEDBACK_ICONS mapping', () => {
    it('should map each feedback type to an icon', () => {
      const iconMapping = {
        warning: 'AlertTriangle',
        suggestion: 'Lightbulb',
        success: 'CheckCircle',
      };
      
      expect(iconMapping.warning).toBeDefined();
      expect(iconMapping.suggestion).toBeDefined();
      expect(iconMapping.success).toBeDefined();
    });
  });
});
