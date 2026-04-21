/**
 * Testes do dispatcher SnapshotReportView.
 *
 * Cobre:
 * - Roteamento por wizardType para o renderer correto.
 * - Fallback amigável para personas sem renderer.
 * - Compatibilidade transparente entre v1 e v2+ (mesmo shape de dados).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SnapshotReportView } from '../SnapshotReportView';
import type { WizardPersona } from '../../../types/wizard';

// Mocka todos os renderers para asserts simples e isolar o dispatcher.
vi.mock('../renderers/CollaboratorReport', () => ({
  CollaboratorReport: ({ data }: { data: Record<string, any> }) => (
    <div data-testid="renderer-collaborator">{JSON.stringify(data)}</div>
  ),
}));
vi.mock('../renderers/LeaderPrepReport', () => ({
  LeaderPrepReport: () => <div data-testid="renderer-leader-prep" />,
}));
vi.mock('../renderers/TeamCheckinReport', () => ({
  TeamCheckinReport: () => <div data-testid="renderer-team-checkin" />,
}));
vi.mock('../renderers/ManagersCheckinReport', () => ({
  ManagersCheckinReport: () => <div data-testid="renderer-managers-checkin" />,
}));
vi.mock('../renderers/CLevelCheckinReport', () => ({
  CLevelCheckinReport: () => <div data-testid="renderer-clevel-checkin" />,
}));
vi.mock('../renderers/MbrReport', () => ({
  MbrReport: () => <div data-testid="renderer-mbr" />,
}));
vi.mock('../renderers/MbrPreReport', () => ({
  MbrPreReport: () => <div data-testid="renderer-mbr-pre" />,
}));
vi.mock('../renderers/QbrPreReport', () => ({
  QbrPreReport: () => <div data-testid="renderer-qbr-pre" />,
}));
vi.mock('../renderers/QbrCLevelReport', () => ({
  QbrCLevelReport: () => <div data-testid="renderer-qbr-pre-clevel" />,
}));
vi.mock('../renderers/QbrMeetingReport', () => ({
  QbrMeetingReport: () => <div data-testid="renderer-qbr-meeting" />,
}));
vi.mock('../renderers/QbrPostReport', () => ({
  QbrPostReport: () => <div data-testid="renderer-qbr-post" />,
}));

describe('SnapshotReportView — dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const cases: Array<{ persona: WizardPersona; testId: string }> = [
    { persona: 'collaborator', testId: 'renderer-collaborator' },
    { persona: 'leader-prep', testId: 'renderer-leader-prep' },
    { persona: 'team-checkin', testId: 'renderer-team-checkin' },
    { persona: 'managers-checkin', testId: 'renderer-managers-checkin' },
    { persona: 'clevel-checkin', testId: 'renderer-clevel-checkin' },
    { persona: 'mbr', testId: 'renderer-mbr' },
    { persona: 'mbr-pre', testId: 'renderer-mbr-pre' },
    { persona: 'qbr-pre', testId: 'renderer-qbr-pre' },
    { persona: 'qbr-pre-clevel', testId: 'renderer-qbr-pre-clevel' },
    { persona: 'qbr-meeting', testId: 'renderer-qbr-meeting' },
    { persona: 'qbr-post', testId: 'renderer-qbr-post' },
  ];

  it.each(cases)('roteia $persona para o renderer correto', ({ persona, testId }) => {
    render(<SnapshotReportView wizardType={persona} data={{}} />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('repassa o objeto `data` para o renderer escolhido (shape preservado)', () => {
    const data = { results: [{ krId: 'kr-1', newValue: 42 }] };
    render(<SnapshotReportView wizardType="collaborator" data={data} />);
    expect(screen.getByTestId('renderer-collaborator').textContent).toBe(
      JSON.stringify(data),
    );
  });

  it('renderiza fallback amigável para persona sem renderer registrado', () => {
    // `team-okr-creation` não é um rito de retrospectiva — sem renderer.
    render(
      <SnapshotReportView wizardType={'team-okr-creation' as WizardPersona} data={{}} />,
    );
    expect(
      screen.getByText(/Visualização detalhada indisponível/i),
    ).toBeInTheDocument();
  });

  it('aceita structureVersion sem alterar o roteamento (compatibilidade v1/v2+)', () => {
    const { rerender } = render(
      <SnapshotReportView wizardType="collaborator" data={{}} structureVersion="v1" />,
    );
    expect(screen.getByTestId('renderer-collaborator')).toBeInTheDocument();

    rerender(
      <SnapshotReportView wizardType="collaborator" data={{}} structureVersion="v2" />,
    );
    expect(screen.getByTestId('renderer-collaborator')).toBeInTheDocument();
  });

  it('usa default structureVersion=v1 quando prop omitida (retrocompat)', () => {
    render(<SnapshotReportView wizardType="mbr" data={{}} />);
    expect(screen.getByTestId('renderer-mbr')).toBeInTheDocument();
  });
});
