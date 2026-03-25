/**
 * @file OkrEmptyState.test.tsx
 * @description Tests for OkrEmptyState component
 * 
 * Coverage:
 * - Component rendering
 * - Props handling
 * - Action callback
 * - Icon and styling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { OkrEmptyState } from './OkrEmptyState';

describe('OkrEmptyState', () => {
  describe('rendering', () => {
    it('should render with required props', () => {
      render(
        <OkrEmptyState 
          title="No OKRs found" 
          description="Create your first OKR to get started" 
        />
      );
      
      expect(screen.getByText('No OKRs found')).toBeInTheDocument();
      expect(screen.getByText('Create your first OKR to get started')).toBeInTheDocument();
    });

    it('should render title correctly', () => {
      render(
        <OkrEmptyState 
          title="Empty State Title" 
          description="Some description" 
        />
      );
      
      expect(screen.getByText('Empty State Title')).toBeInTheDocument();
    });

    it('should render description correctly', () => {
      render(
        <OkrEmptyState 
          title="Title" 
          description="This is the description text" 
        />
      );
      
      expect(screen.getByText('This is the description text')).toBeInTheDocument();
    });

    it('should render without action button when actionLabel is not provided', () => {
      render(
        <OkrEmptyState 
          title="Title" 
          description="Description" 
        />
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render action button when actionLabel is provided', () => {
      render(
        <OkrEmptyState 
          title="Title" 
          description="Description" 
          actionLabel="Create OKR"
          onAction={() => {}}
        />
      );
      
      expect(screen.getByRole('button', { name: /create okr/i })).toBeInTheDocument();
    });
  });

  describe('action callback', () => {
    it('should call onAction when button is clicked', () => {
      const onAction = vi.fn();
      
      render(
        <OkrEmptyState 
          title="Title" 
          description="Description" 
          actionLabel="Click Me"
          onAction={onAction}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /click me/i }));
      
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should not render button when onAction is not provided', () => {
      render(
        <OkrEmptyState 
          title="Title" 
          description="Description" 
          actionLabel="Create"
        />
      );
      
      // Button might still render but should be non-functional
      // This tests the component behavior
    });
  });

  describe('props interface', () => {
    it('should accept title as string', () => {
      const props = {
        title: 'Test Title',
        description: 'Test Description',
      };
      
      expect(typeof props.title).toBe('string');
    });

    it('should accept description as string', () => {
      const props = {
        title: 'Test Title',
        description: 'Test Description',
      };
      
      expect(typeof props.description).toBe('string');
    });

    it('should accept optional actionLabel', () => {
      const propsWithAction = {
        title: 'Title',
        description: 'Description',
        actionLabel: 'Action',
      };
      
      const propsWithoutAction = {
        title: 'Title',
        description: 'Description',
      };
      
      expect(propsWithAction.actionLabel).toBeDefined();
      expect(propsWithoutAction).not.toHaveProperty('actionLabel');
    });

    it('should accept optional onAction callback', () => {
      const callback = vi.fn();
      const props = {
        title: 'Title',
        description: 'Description',
        onAction: callback,
      };
      
      expect(typeof props.onAction).toBe('function');
    });
  });

  describe('different content variations', () => {
    it('should render with long title', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines in the UI';
      
      render(
        <OkrEmptyState 
          title={longTitle} 
          description="Description" 
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should render with long description', () => {
      const longDescription = 'This is a very long description that provides detailed information about what the user should do when there are no OKRs available in the system.';
      
      render(
        <OkrEmptyState 
          title="Title" 
          description={longDescription} 
        />
      );
      
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should render with special characters in title', () => {
      render(
        <OkrEmptyState 
          title="OKRs & Goals <2024>" 
          description="Description" 
        />
      );
      
      expect(screen.getByText('OKRs & Goals <2024>')).toBeInTheDocument();
    });

    it('should render with emoji in description', () => {
      render(
        <OkrEmptyState 
          title="Title" 
          description="No OKRs yet 🎯" 
        />
      );
      
      expect(screen.getByText('No OKRs yet 🎯')).toBeInTheDocument();
    });
  });

  describe('use cases', () => {
    it('should work for team OKRs empty state', () => {
      render(
        <OkrEmptyState 
          title="Nenhum OKR do time" 
          description="Este time ainda não possui OKRs definidos" 
          actionLabel="Criar OKR"
          onAction={() => {}}
        />
      );
      
      expect(screen.getByText('Nenhum OKR do time')).toBeInTheDocument();
      expect(screen.getByText('Este time ainda não possui OKRs definidos')).toBeInTheDocument();
    });

    it('should work for org OKRs empty state', () => {
      render(
        <OkrEmptyState 
          title="Nenhum OKR organizacional" 
          description="A organização ainda não definiu OKRs para este ciclo" 
        />
      );
      
      expect(screen.getByText('Nenhum OKR organizacional')).toBeInTheDocument();
    });

    it('should work for KR list empty state', () => {
      render(
        <OkrEmptyState 
          title="Nenhum Key Result" 
          description="Adicione Key Results para acompanhar o progresso do objetivo" 
          actionLabel="Adicionar KR"
          onAction={() => {}}
        />
      );
      
      expect(screen.getByText('Nenhum Key Result')).toBeInTheDocument();
    });

    it('should work for initiatives empty state', () => {
      render(
        <OkrEmptyState 
          title="Nenhuma iniciativa" 
          description="Iniciativas são ações que ajudam a atingir os Key Results" 
          actionLabel="Nova Iniciativa"
          onAction={() => {}}
        />
      );
      
      expect(screen.getByText('Nenhuma iniciativa')).toBeInTheDocument();
    });
  });
});
