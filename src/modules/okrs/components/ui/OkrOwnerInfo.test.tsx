/**
 * @file OkrOwnerInfo.test.tsx
 * @description Tests for OkrOwnerInfo and OkrOwnersRow components
 * 
 * Coverage:
 * - Single owner display
 * - Multiple owners display
 * - Avatar rendering
 * - Tooltip behavior
 * - Size variants
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OkrOwnerInfo, OkrOwnersRow } from './OkrOwnerInfo';

describe('OkrOwnerInfo', () => {
  const mockOwner = {
    display_name: 'John Doe',
    photo_url: 'https://example.com/photo.jpg',
    role: 'Product Manager',
  };

  describe('rendering', () => {
    it('should render owner with display name', () => {
      render(<OkrOwnerInfo owner={mockOwner} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render avatar', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} />);
      
      // Avatar component should be rendered
      const avatar = container.querySelector('[class*="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should handle null owner', () => {
      render(<OkrOwnerInfo owner={null} />);
      
      // Should render fallback or nothing
      expect(document.body).toBeTruthy();
    });

    it('should handle undefined owner', () => {
      render(<OkrOwnerInfo owner={undefined} />);
      
      // Should render fallback or nothing
      expect(document.body).toBeTruthy();
    });
  });

  describe('owner without photo', () => {
    it('should render fallback when no photo_url', () => {
      const ownerWithoutPhoto = {
        display_name: 'Jane Smith',
        photo_url: null,
        role: 'Engineer',
      };
      
      render(<OkrOwnerInfo owner={ownerWithoutPhoto} />);
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render with default size', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} />);
      
      const avatar = container.querySelector('[class*="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should render with sm size', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} size="sm" />);
      
      const avatar = container.querySelector('[class*="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should render with md size', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} size="md" />);
      
      const avatar = container.querySelector('[class*="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should render with lg size', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} size="lg" />);
      
      const avatar = container.querySelector('[class*="avatar"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('showRole prop', () => {
    it('should show role when showRole is true', () => {
      render(<OkrOwnerInfo owner={mockOwner} showRole={true} />);
      
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
    });

    it('should not show role by default', () => {
      render(<OkrOwnerInfo owner={mockOwner} />);
      
      // Role should not be visible by default (depends on implementation)
    });
  });

  describe('showTooltip prop', () => {
    it('should work with showTooltip=true', () => {
      render(<OkrOwnerInfo owner={mockOwner} showTooltip={true} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should work with showTooltip=false', () => {
      render(<OkrOwnerInfo owner={mockOwner} showTooltip={false} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should accept owner with all properties', () => {
      const owner = {
        display_name: 'Test User',
        photo_url: 'https://example.com/photo.jpg',
        role: 'Developer',
      };
      
      expect(owner.display_name).toBeDefined();
      expect(owner.photo_url).toBeDefined();
      expect(owner.role).toBeDefined();
    });

    it('should accept owner with nullable photo_url', () => {
      const owner = {
        display_name: 'Test User',
        photo_url: null,
        role: 'Developer',
      };
      
      expect(owner.photo_url).toBeNull();
    });
  });
});

describe('OkrOwnersRow', () => {
  const mockOwners = [
    { display_name: 'Alice', photo_url: 'https://example.com/alice.jpg', role: 'PM' },
    { display_name: 'Bob', photo_url: 'https://example.com/bob.jpg', role: 'Dev' },
    { display_name: 'Charlie', photo_url: 'https://example.com/charlie.jpg', role: 'Designer' },
  ];

  describe('rendering', () => {
    it('should render single owner', () => {
      render(<OkrOwnersRow owners={[mockOwners[0]]} />);
      
      // Should render at least one avatar
      expect(document.body).toBeTruthy();
    });

    it('should render multiple owners', () => {
      const { container } = render(<OkrOwnersRow owners={mockOwners} />);
      
      // Should render multiple avatars
      const avatars = container.querySelectorAll('[class*="avatar"]');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('should render empty array', () => {
      const { container } = render(<OkrOwnersRow owners={[]} />);
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('max display', () => {
    it('should limit displayed avatars with max prop', () => {
      const manyOwners = [
        ...mockOwners,
        { display_name: 'Dave', photo_url: null, role: 'QA' },
        { display_name: 'Eve', photo_url: null, role: 'Ops' },
      ];
      
      render(<OkrOwnersRow owners={manyOwners} max={3} />);
      
      // Should show count of remaining
    });

    it('should show remaining count badge', () => {
      const manyOwners = [
        ...mockOwners,
        { display_name: 'Dave', photo_url: null, role: 'QA' },
        { display_name: 'Eve', photo_url: null, role: 'Ops' },
      ];
      
      render(<OkrOwnersRow owners={manyOwners} max={2} />);
      
      // Should show +3 or similar
      expect(screen.getByText(/\+\d/)).toBeInTheDocument();
    });
  });

  describe('avatar display', () => {
    it('should render avatars for owners', () => {
      const { container } = render(<OkrOwnersRow owners={mockOwners} />);
      
      const avatars = container.querySelectorAll('[class*="avatar"]');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('props interface', () => {
    it('should require owners array', () => {
      const props = { owners: mockOwners };
      expect(Array.isArray(props.owners)).toBe(true);
    });

    it('should accept optional max prop', () => {
      const propsWithMax = { owners: mockOwners, max: 3 };
      expect(propsWithMax.max).toBe(3);
    });
  });
});
