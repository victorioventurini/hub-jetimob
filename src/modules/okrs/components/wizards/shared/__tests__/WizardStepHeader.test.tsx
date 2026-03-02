/**
 * @file WizardStepHeader.test.tsx
 * @description Tests for shared WizardStepHeader component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WizardStepHeader } from '../WizardStepHeader';
import { BarChart3 } from 'lucide-react';

describe('WizardStepHeader', () => {
  it('renders title', () => {
    render(<WizardStepHeader icon={BarChart3} title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<WizardStepHeader icon={BarChart3} title="T" description="A description" />);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<WizardStepHeader icon={BarChart3} title="T" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders badge when provided', () => {
    render(<WizardStepHeader icon={BarChart3} title="T" badge="5" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge when not provided', () => {
    render(<WizardStepHeader icon={BarChart3} title="T" />);
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('renders rightContent when provided', () => {
    render(<WizardStepHeader icon={BarChart3} title="T" rightContent={<span>Right</span>} />);
    expect(screen.getByText('Right')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<WizardStepHeader icon={BarChart3} title="T" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders icon element', () => {
    const { container } = render(<WizardStepHeader icon={BarChart3} title="T" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
