import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@/test/test-utils';
import { KeyResultRow, type KeyResult } from './KeyResultRow';

vi.mock('@/hooks/useIdentity', () => ({
  useProfileId: vi.fn(),
}));

vi.mock('../../hooks/useInitiatives', () => ({
  useKrInitiativesCount: vi.fn(() => ({ data: 0 })),
}));

import { useProfileId } from '@/hooks/useIdentity';

const mockUseProfileId = vi.mocked(useProfileId);

const baseKr: KeyResult = {
  id: 'org-kr-1',
  title: 'Desenvolver módulos vitais',
  baseline: 0,
  current_value: 0,
  target: 100,
  unit: '%',
  direction: 'up',
  status: 'not_started',
  updated_at: '2026-06-08T00:00:00.000Z',
  owner_user_id: 'owner-profile-id',
};

describe('KeyResultRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProfileId.mockReturnValue('victorio-profile-id');
  });

  it('renders Atualizar for org KRs when the user can check in', () => {
    const onCheckin = vi.fn();

    render(
      <KeyResultRow
        kr={baseKr}
        type="org"
        canCheckin
        onEdit={vi.fn()}
        onCheckin={onCheckin}
        onShowHistory={vi.fn()}
      />,
    );

    const updateButton = screen.getByTitle('Atualizar progresso');
    expect(updateButton).toBeInTheDocument();

    fireEvent.click(updateButton);
    expect(onCheckin).toHaveBeenCalledTimes(1);
  });
});