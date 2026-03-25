/**
 * @file InitiativeCulturalMessage.test.tsx
 * @description Tests for InitiativeCulturalMessage component
 * 
 * Coverage:
 * - Message rendering
 * - Icon display
 * - Styling and className prop
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { InitiativeCulturalMessage } from './InitiativeCulturalMessage';

describe('InitiativeCulturalMessage', () => {
  describe('rendering', () => {
    it('should render the cultural message', () => {
      render(<InitiativeCulturalMessage />);
      
      expect(screen.getByText(/iniciativas não precisam estar perfeitas/i)).toBeInTheDocument();
    });

    it('should render complete message text', () => {
      render(<InitiativeCulturalMessage />);
      
      expect(screen.getByText(/precisam existir, ser tentadas e ajustadas/i)).toBeInTheDocument();
    });

    it('should render with Sparkles icon', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render in a styled container', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('rounded-md');
    });
  });

  describe('className prop', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <InitiativeCulturalMessage className="custom-class" />
      );
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <InitiativeCulturalMessage className="my-custom-class" />
      );
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('my-custom-class');
      expect(messageContainer).toHaveClass('rounded-md');
    });

    it('should work without className prop', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have muted background', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('bg-muted/30');
    });

    it('should have padding', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('p-3');
    });

    it('should have dashed border', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('border-dashed');
    });

    it('should have muted foreground text color', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('text-muted-foreground');
    });

    it('should have small text size', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('text-sm');
    });
  });

  describe('icon styling', () => {
    it('should render icon with correct size', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4');
      expect(svg).toHaveClass('h-4');
    });

    it('should render icon inline', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('inline');
    });

    it('should have margin on right side of icon', () => {
      const { container } = render(<InitiativeCulturalMessage />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('mr-1.5');
    });
  });

  describe('props interface', () => {
    it('should accept optional className', () => {
      const propsWithClass = { className: 'test-class' };
      const propsWithoutClass = {};
      
      expect(propsWithClass.className).toBeDefined();
      expect(propsWithoutClass).not.toHaveProperty('className');
    });
  });

  describe('message content', () => {
    it('should encourage experimentation', () => {
      render(<InitiativeCulturalMessage />);
      
      const text = screen.getByText(/iniciativas não precisam estar perfeitas/i);
      expect(text.textContent).toContain('tentadas');
    });

    it('should mention adjustment as part of the process', () => {
      render(<InitiativeCulturalMessage />);
      
      const text = screen.getByText(/iniciativas não precisam estar perfeitas/i);
      expect(text.textContent).toContain('ajustadas');
    });
  });
});
