import type { ReactNode } from 'react';
import { parseMentionsForDisplay } from '@/lib/mentions';

export function renderProjectCommentContent(text: string): ReactNode {
  return <>{parseMentionsForDisplay(text)}</>;
}