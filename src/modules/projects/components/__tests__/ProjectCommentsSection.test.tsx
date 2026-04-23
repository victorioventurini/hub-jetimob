import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/mentions', () => ({
  parseMentionsForDisplay: () => [<span key="mention">@Uriel Canfield</span>],
}));

import { renderProjectCommentContent } from '../../utils/commentContent';

describe('renderProjectCommentContent', () => {
  it('renderiza menções internas sem serializar React nodes como [object Object]', () => {
    const html = renderToStaticMarkup(
      <>{renderProjectCommentContent('Olá @[Uriel Canfield](internal:profile-1), teste')}</>
    );

    expect(html).toContain('@Uriel Canfield');
    expect(html).not.toContain('[object Object]');
  });
});