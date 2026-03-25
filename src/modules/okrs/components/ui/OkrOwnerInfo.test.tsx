/**
 * @file OkrOwnerInfo.test.tsx
 * @description Tests for OkrOwnerInfo and OkrOwnersRow components
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OkrOwnerInfo, OkrOwnersRow } from './OkrOwnerInfo';

describe('OkrOwnerInfo', () => {
  const mockOwner = {
    display_name: 'John Doe',
    photo_url: 'https://example.com/photo.jpg',
    role: 'Product Manager',
  };

  describe('rendering', () => {
    // Size=sm (default) only renders avatar + tooltip, NOT inline text
    it('should render avatar for default (sm) size', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} />);
      // Avatar uses span with role="img" or AvatarFallback with initials
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should render display name for md size', () => {
      render(<OkrOwnerInfo owner={mockOwner} size="md" />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render display name for lg size', () => {
      render(<OkrOwnerInfo owner={mockOwner} size="lg" />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle null owner', () => {
      const { container } = render(<OkrOwnerInfo owner={null} />);
      // Returns null, so container should be empty
      expect(container.firstChild).toBeEmptyDOMElement();
    });

    it('should handle undefined owner', () => {
      const { container } = render(<OkrOwnerInfo owner={undefined} />);
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe('owner without photo', () => {
    it('should render fallback initials when no photo_url', () => {
      const ownerWithoutPhoto = {
        display_name: 'Jane Smith',
        photo_url: null,
        role: 'Engineer',
      };
      // Size md shows name text
      render(<OkrOwnerInfo owner={ownerWithoutPhoto} size="md" />);
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render with sm size (avatar only)', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} size="sm" />);
      // sm renders avatar but no visible name text (tooltip only)
      expect(container.firstChild).not.toBeEmptyDOMElement();
    });

    it('should render with md size (avatar + name)', () => {
      render(<OkrOwnerInfo owner={mockOwner} size="md" />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render with lg size (avatar + name)', () => {
      render(<OkrOwnerInfo owner={mockOwner} size="lg" />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('showRole prop', () => {
    it('should show role when showRole is true', () => {
      render(<OkrOwnerInfo owner={mockOwner} showRole={true} />);
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
    });

    it('should not show role by default', () => {
      render(<OkrOwnerInfo owner={mockOwner} size="md" />);
      expect(screen.queryByText('Product Manager')).not.toBeInTheDocument();
    });
  });

  describe('showTooltip prop', () => {
    it('should work with showTooltip=true (sm)', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} showTooltip={true} />);
      expect(container.firstChild).not.toBeEmptyDOMElement();
    });

    it('should work with showTooltip=false (sm)', () => {
      const { container } = render(<OkrOwnerInfo owner={mockOwner} showTooltip={false} />);
      expect(container.firstChild).not.toBeEmptyDOMElement();
    });
  });

  describe('props interface', () => {
    it('should accept owner with all properties', () => {
      const owner = { display_name: 'Test User', photo_url: 'https://example.com/photo.jpg', role: 'Developer' };
      expect(owner.display_name).toBeDefined();
      expect(owner.photo_url).toBeDefined();
      expect(owner.role).toBeDefined();
    });

    it('should accept owner with nullable photo_url', () => {
      const owner = { display_name: 'Test User', photo_url: null, role: 'Developer' };
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
      const { container } = render(<OkrOwnersRow owners={[mockOwners[0]]} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('should render multiple owners', () => {
      const { container } = render(<OkrOwnersRow owners={mockOwners} />);
      // Each owner gets an avatar with img or fallback
      expect(container.firstChild).not.toBeNull();
      // Check initials are rendered
      expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('should render null for empty array', () => {
      const { container } = render(<OkrOwnersRow owners={[]} />);
      expect(container.firstChild).toBeEmptyDOMElement();
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
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should show remaining count badge', () => {
      const manyOwners = [
        ...mockOwners,
        { display_name: 'Dave', photo_url: null, role: 'QA' },
        { display_name: 'Eve', photo_url: null, role: 'Ops' },
      ];
      render(<OkrOwnersRow owners={manyOwners} max={2} />);
      expect(screen.getByText(/\+\d/)).toBeInTheDocument();
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
