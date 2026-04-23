/**
 * Wave 2 — Tests for misc query keys (home/search/external/users/mentions/cycles).
 */
import { describe, it, expect } from 'vitest';
import {
  homeKeys,
  searchKeys,
  externalKeys,
  usersKeys,
  mentionsKeys,
  cyclesKeys,
} from './misc';

describe('homeKeys', () => {
  it('dashboard/birthdays/anniversaries', () => {
    expect(homeKeys.dashboard('bu1', 'u1')).toEqual(['home', 'dashboard', 'bu1', 'u1']);
    expect(homeKeys.birthdays('bu1', 30)).toEqual(['birthdays', 'bu1', 30]);
    expect(homeKeys.anniversaries('bu1', 'year')).toEqual([
      'work-anniversaries', 'bu1', 'year',
    ]);
    expect(homeKeys.newJetimobers('bu1', 5)).toEqual(['new-jetimobers', 'bu1', 5]);
    expect(homeKeys.cultureMessage()).toEqual(['home', 'culture-message']);
  });

  it('leader namespaces', () => {
    expect(homeKeys.leaderSummary('bu1', 't1')).toEqual([
      'home', 'leader-summary', 'bu1', 't1',
    ]);
    expect(homeKeys.leaderFocus('bu1', 't1')).toEqual([
      'home', 'leader-focus', 'bu1', 't1',
    ]);
    expect(homeKeys.leaderTeams('bu1', 'u1')).toEqual([
      'home', 'leader-teams', 'bu1', 'u1',
    ]);
  });

  it('myTicketsHome com impersonation opcional', () => {
    expect(homeKeys.myTicketsHome('bu1', 'u1')).toEqual([
      'home', 'my-tickets', 'bu1', 'u1', undefined,
    ]);
    expect(homeKeys.myTicketsHome('bu1', 'u1', 'imp1')).toEqual([
      'home', 'my-tickets', 'bu1', 'u1', 'imp1',
    ]);
  });

  it('kpiSummary com scope', () => {
    expect(homeKeys.kpiSummary('bu1', 'leader', 't1')).toEqual([
      'home', 'kpi-summary', 'bu1', 'leader', 't1',
    ]);
    expect(homeKeys.kpiSummary('bu1', 'admin')).toEqual([
      'home', 'kpi-summary', 'bu1', 'admin', undefined,
    ]);
  });
});

describe('searchKeys', () => {
  it('global e page', () => {
    expect(searchKeys.global('bu1', 'foo')).toEqual(['search', 'global', 'bu1', 'foo']);
    expect(searchKeys.page('bu1', 'foo', 'tickets')).toEqual([
      'search', 'page', 'bu1', 'foo', 'tickets',
    ]);
  });
});

describe('externalKeys', () => {
  it('contatos externos', () => {
    expect(externalKeys.tickets('c1')).toEqual(['external', 'tickets', 'c1']);
    expect(externalKeys.stats('c1')).toEqual(['external', 'stats', 'c1']);
    expect(externalKeys.companyContext('co1')).toEqual([
      'external', 'company-context', 'co1',
    ]);
    expect(externalKeys.userInfo('u1')).toEqual(['external', 'user-info', 'u1']);
  });
});

describe('usersKeys', () => {
  it('all e prefix', () => {
    expect(usersKeys.all()).toEqual(['users']);
    expect(usersKeys.directoryPrefix('bu1')).toEqual(['users', 'directory', 'bu1']);
  });

  it('directory com filtros', () => {
    expect(usersKeys.directory('bu1', { q: 'maria', page: 2 })).toEqual([
      'users', 'directory', 'bu1', { q: 'maria', page: 2 },
    ]);
  });

  it('selectOptions/mention/global', () => {
    expect(usersKeys.selectOptions('bu1')).toEqual(['users', 'select-options', 'bu1']);
    expect(usersKeys.mentionCandidates('bu1', 'foo')).toEqual([
      'users', 'mention-candidates', 'bu1', { q: 'foo' },
    ]);
    expect(usersKeys.ticketMentionCandidates('bu1', 'co1', 'foo')).toEqual([
      'users', 'ticket-mention-candidates', 'bu1', 'co1', { q: 'foo' },
    ]);
    expect(usersKeys.globalList({ buId: 'bu1' })).toEqual([
      'users', 'global-list', { buId: 'bu1' },
    ]);
    expect(usersKeys.globalDetail('p1')).toEqual(['users', 'global-detail', 'p1']);
  });
});

describe('mentionsKeys', () => {
  it('candidates internal/external', () => {
    expect(mentionsKeys.candidates('bu1', 'ticket', 'co1', 'foo')).toEqual([
      'mentions', 'candidates', 'bu1', 'ticket', 'co1', { q: 'foo' },
    ]);
    expect(mentionsKeys.internalCandidates('bu1', 'foo')).toEqual([
      'mentions', 'internal-candidates', 'bu1', { q: 'foo' },
    ]);
    expect(mentionsKeys.byEntity('checkin', 'c1')).toEqual([
      'mentions', 'by-entity', 'checkin', 'c1',
    ]);
  });
});

describe('cyclesKeys', () => {
  it('list', () => {
    expect(cyclesKeys.list()).toEqual(['cycles-list']);
  });
});
