/**
 * Tests for EmptyState component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('should render default variant', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
    expect(screen.getByText('Não há itens para exibir no momento.')).toBeInTheDocument();
  });

  it('should render search variant', () => {
    render(<EmptyState variant="search" />);
    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
  });

  it('should render filter variant', () => {
    render(<EmptyState variant="filter" />);
    expect(screen.getByText('Nenhum item corresponde aos filtros')).toBeInTheDocument();
  });

  it('should render firstUse variant', () => {
    render(<EmptyState variant="firstUse" />);
    expect(screen.getByText('Comece agora')).toBeInTheDocument();
  });

  it('should render noPermission variant', () => {
    render(<EmptyState variant="noPermission" />);
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  });

  it('should override variant defaults with custom props', () => {
    render(<EmptyState variant="search" title="Custom Title" description="Custom Desc" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Desc')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    const onClick = vi.fn();
    render(<EmptyState actionLabel="Criar" onAction={onClick} />);
    const button = screen.getByRole('button', { name: 'Criar' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should not render button when only label provided without action', () => {
    render(<EmptyState actionLabel="Criar" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should apply compact mode classes', () => {
    const { container } = render(<EmptyState compact />);
    expect(container.firstChild).toHaveClass('py-8');
  });

  it('should apply full mode classes by default', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toHaveClass('py-16');
  });
});
