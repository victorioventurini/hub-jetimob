const knownHosts: Record<string, string> = {
  'clickup.com': 'ClickUp',
  'app.clickup.com': 'ClickUp',
  'notion.so': 'Notion',
  'notion.site': 'Notion',
  'linear.app': 'Linear',
  'asana.com': 'Asana',
  'app.asana.com': 'Asana',
  'trello.com': 'Trello',
  'monday.com': 'Monday',
  'github.com': 'GitHub',
  'gitlab.com': 'GitLab',
  'figma.com': 'Figma',
  'miro.com': 'Miro',
  'confluence.atlassian.net': 'Confluence',
};

export function getExternalUrlLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    // Direct match
    if (knownHosts[hostname]) return knownHosts[hostname];

    // Jira: *.atlassian.net (but not confluence)
    if (hostname.endsWith('.atlassian.net') && !hostname.startsWith('confluence')) return 'Jira';

    // Partial match (e.g. subdomain.clickup.com)
    for (const [host, label] of Object.entries(knownHosts)) {
      if (hostname.endsWith(`.${host}`)) return label;
    }

    return 'Link externo';
  } catch {
    return 'Link externo';
  }
}
