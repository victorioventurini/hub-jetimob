import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderProjectCommentContent } from '../ProjectCommentsSection';

describe('renderProjectCommentContent', () => {
  it('renderiza menções internas sem serializar React nodes como [object Object]', () => {
    const html = renderToStaticMarkup(
      <>{renderProjectCommentContent('Olá @[Uriel Canfield](internal:profile-1), teste')}</>
    );

    expect(html).toContain('@Uriel Canfield');
    expect(html).not.toContain('[object Object]');
  });
});