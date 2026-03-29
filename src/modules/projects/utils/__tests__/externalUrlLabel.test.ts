import { describe, it, expect } from 'vitest';
import { getExternalUrlLabel } from '../externalUrlLabel';

describe('getExternalUrlLabel', () => {
  it('returns ClickUp for clickup.com URLs', () => {
    expect(getExternalUrlLabel('https://app.clickup.com/t/abc123')).toBe('ClickUp');
  });

  it('returns Notion for notion.so URLs', () => {
    expect(getExternalUrlLabel('https://notion.so/some-page')).toBe('Notion');
  });

  it('returns Linear for linear.app URLs', () => {
    expect(getExternalUrlLabel('https://linear.app/team/issue')).toBe('Linear');
  });

  it('returns Asana for app.asana.com URLs', () => {
    expect(getExternalUrlLabel('https://app.asana.com/0/12345')).toBe('Asana');
  });

  it('returns Jira for *.atlassian.net (non-confluence)', () => {
    expect(getExternalUrlLabel('https://myorg.atlassian.net/browse/PROJ-123')).toBe('Jira');
  });

  it('returns Confluence for confluence.atlassian.net', () => {
    expect(getExternalUrlLabel('https://confluence.atlassian.net/wiki/spaces')).toBe('Confluence');
  });

  it('returns GitHub for github.com URLs', () => {
    expect(getExternalUrlLabel('https://github.com/org/repo')).toBe('GitHub');
  });

  it('returns Figma for figma.com URLs', () => {
    expect(getExternalUrlLabel('https://figma.com/file/abc')).toBe('Figma');
  });

  it('returns Miro for miro.com URLs', () => {
    expect(getExternalUrlLabel('https://miro.com/app/board/abc')).toBe('Miro');
  });

  it('returns Trello for trello.com URLs', () => {
    expect(getExternalUrlLabel('https://trello.com/b/abc')).toBe('Trello');
  });

  it('returns Monday for monday.com URLs', () => {
    expect(getExternalUrlLabel('https://monday.com/boards/123')).toBe('Monday');
  });

  it('returns GitLab for gitlab.com URLs', () => {
    expect(getExternalUrlLabel('https://gitlab.com/org/repo')).toBe('GitLab');
  });

  it('strips www prefix', () => {
    expect(getExternalUrlLabel('https://www.github.com/org/repo')).toBe('GitHub');
  });

  it('matches subdomains via partial match', () => {
    expect(getExternalUrlLabel('https://subdomain.clickup.com/t/abc')).toBe('ClickUp');
  });

  it('returns "Link externo" for unknown URLs', () => {
    expect(getExternalUrlLabel('https://example.com/path')).toBe('Link externo');
  });

  it('returns "Link externo" for invalid URLs', () => {
    expect(getExternalUrlLabel('not-a-url')).toBe('Link externo');
  });

  it('returns "Link externo" for empty string', () => {
    expect(getExternalUrlLabel('')).toBe('Link externo');
  });
});
