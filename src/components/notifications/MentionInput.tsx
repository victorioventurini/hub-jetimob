import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { UserHoverCard } from '@/components/user/UserHoverCard';

// Helper function to extract display text (without mention syntax)
export function getMentionDisplayText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

// Helper to parse mentions for display (convert @[Name](id) to styled chips with hover)
export function parseMentionsForDisplay(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const displayName = match[1];
    // The ID stored in mentions is profiles.id (domain identity), not auth.users.id
    const profileId = match[2];
    parts.push(
      <UserHoverCard key={`${profileId}-${match.index}`} profileId={profileId}>
        <Link
          to={`/users/${profileId}`}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          @{displayName}
        </Link>
      </UserHoverCard>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface MentionUser {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  photo_url: string | null;
  team_name: string | null;
}

// Helper to extract email prefix (before @)
function getEmailPrefix(email: string | null): string | null {
  if (!email) return null;
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.slice(0, atIndex) : null;
}

// Mention chip marker for contenteditable
const MENTION_MARKER_START = '\u200B\u2063'; // Zero-width space + invisible separator
const MENTION_MARKER_END = '\u2063\u200B';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
  id?: string;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  required,
  id,
}: MentionInputProps) {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mentionStartOffset, setMentionStartOffset] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value);

  // Fetch users for mention suggestions (accent-insensitive search)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: queryKeys.users.mentionCandidates(currentBu?.id ?? null, searchTerm),
    queryFn: async () => {
      if (!currentBu?.id) return [];

      const { data, error } = await supabase.rpc('search_bu_users_for_mention', {
        p_bu_id: currentBu.id,
        p_search_term: searchTerm || null,
        p_limit: 8,
      });

      if (error) throw error;

      return (data || []).map(u => ({
        id: u.id,
        user_id: u.user_id,
        display_name: u.display_name,
        email: u.email || null,
        photo_url: u.photo_url,
        team_name: u.team_name || null,
      })) as MentionUser[];
    },
    enabled: !!currentBu?.id && showSuggestions,
  });

  // Count mentions in text
  const mentionCount = useMemo(() => {
    const regex = /@\[([^\]]+)\]\([^)]+\)/g;
    return (value.match(regex) || []).length;
  }, [value]);

  // Extract mentions from text
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]);
    }
    return mentions;
  }, []);

  // Convert internal value to HTML for contenteditable
  const valueToHtml = useCallback((val: string): string => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(val)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        result += escapeHtml(val.slice(lastIndex, match.index));
      }

      const displayName = match[1];
      const userId = match[2];
      // Add mention chip as non-editable span with zero-width space after for cursor positioning
      result += `<span contenteditable="false" data-mention-id="${userId}" class="mention-chip">@${escapeHtml(displayName)}</span>\u200B`;

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < val.length) {
      result += escapeHtml(val.slice(lastIndex));
    }

    return result || '<br>';
  }, []);

  // Convert HTML from contenteditable back to internal value
  const htmlToValue = useCallback((html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let result = '';
    
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        if (element.classList.contains('mention-chip')) {
          const userId = element.getAttribute('data-mention-id');
          const displayText = element.textContent?.replace('@', '') || '';
          if (userId) {
            result += `@[${displayText}](${userId})`;
          }
        } else if (element.tagName === 'BR') {
          result += '\n';
        } else if (element.tagName === 'DIV' || element.tagName === 'P') {
          if (result.length > 0 && !result.endsWith('\n')) {
            result += '\n';
          }
          element.childNodes.forEach(processNode);
        } else {
          element.childNodes.forEach(processNode);
        }
      }
    };

    tempDiv.childNodes.forEach(processNode);
    
    return result.trim();
  }, []);

  // Escape HTML special characters
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  };

  // Update editor HTML when value changes externally
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      const html = valueToHtml(value);
      editorRef.current.innerHTML = html;
      lastValueRef.current = value;
    }
  }, [value, valueToHtml]);

  // Initialize editor on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = valueToHtml(value);
    }
  }, []);

  // Get text before cursor for mention detection
  const getTextBeforeCursor = (): { text: string; offset: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.startContainer)) return null;

    // Clone range to start of editor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    // Get text content before cursor
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(preCaretRange.cloneContents());
    
    let text = '';
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.classList.contains('mention-chip')) {
          text += `@${element.textContent?.replace('@', '') || ''}`;
        } else if (element.tagName === 'BR') {
          text += '\n';
        } else {
          element.childNodes.forEach(processNode);
        }
      }
    };
    tempDiv.childNodes.forEach(processNode);

    return { text, offset: text.length };
  };

  // Handle input in contenteditable
  const handleInput = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const newValue = htmlToValue(html);
    
    // Check for mention trigger
    const cursorInfo = getTextBeforeCursor();
    if (cursorInfo) {
      const { text } = cursorInfo;
      const lastAtIndex = text.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = text.slice(lastAtIndex + 1);
        // Check if there's no space/newline after @ and it's not too long
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n') && textAfterAt.length < 30) {
          setMentionStartOffset(lastAtIndex);
          setSearchTerm(textAfterAt);
          setShowSuggestions(true);
          setSelectedIndex(0);
        } else {
          setShowSuggestions(false);
          setMentionStartOffset(null);
        }
      } else {
        setShowSuggestions(false);
        setMentionStartOffset(null);
      }
    }

    lastValueRef.current = newValue;
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
  };

  // Handle user selection from suggestions using DOM-based insertion
  const selectUser = (user: MentionUser) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) return;

    // Find the @ trigger in current text node and delete it along with search term
    const cursorInfo = getTextBeforeCursor();
    if (!cursorInfo) return;

    const { text: textBeforeCursor } = cursorInfo;
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    const searchLength = textBeforeCursor.length - lastAtIndex; // includes @ + typed chars

    // Delete the "@searchTerm" by moving range back and deleting
    const deleteRange = document.createRange();
    let charsToDelete = searchLength;
    let currentNode = range.startContainer;
    let currentOffset = range.startOffset;

    // Walk backwards to find where @ starts
    const deleteStart = { node: currentNode, offset: currentOffset };
    
    // Simple approach: work within current text node if possible
    if (currentNode.nodeType === Node.TEXT_NODE && currentOffset >= charsToDelete) {
      deleteStart.offset = currentOffset - charsToDelete;
    } else {
      // Fallback: just delete from current position (may not be perfect but safer)
      charsToDelete = Math.min(charsToDelete, currentOffset);
      deleteStart.offset = currentOffset - charsToDelete;
    }

    deleteRange.setStart(deleteStart.node, deleteStart.offset);
    deleteRange.setEnd(range.startContainer, range.startOffset);
    deleteRange.deleteContents();

    // Create mention chip element
    // CRITICAL: Store profiles.id (domain identity), not user.user_id (auth identity)
    const mentionDisplayName = getEmailPrefix(user.email) || user.display_name;
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.setAttribute('data-mention-id', user.id); // user.id = profiles.id (domain identity)
    chip.className = 'mention-chip';
    chip.textContent = `@${mentionDisplayName}`;

    // Insert chip at cursor
    const insertRange = selection.getRangeAt(0);
    insertRange.insertNode(chip);

    // Add space after chip for continued typing
    const spaceNode = document.createTextNode('\u00A0'); // non-breaking space
    chip.after(spaceNode);

    // Move cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Sync internal value
    const newValue = htmlToValue(editorRef.current.innerHTML);
    lastValueRef.current = newValue;
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);

    setShowSuggestions(false);
    setMentionStartOffset(null);
    setSearchTerm('');

    editorRef.current.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!showSuggestions || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % users.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          selectUser(users[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (showSuggestions) {
          e.preventDefault();
          selectUser(users[selectedIndex]);
        }
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const minHeight = rows * 24; // Approximate line height

  return (
    <div className="relative">
      <style>{`
        .mention-chip {
          display: inline;
          padding: 1px 4px;
          margin: 0 2px;
          border-radius: 4px;
          background-color: hsl(var(--primary) / 0.12);
          color: hsl(var(--primary));
          font-size: 0.875em;
          font-weight: 500;
          white-space: nowrap;
        }
        .mention-chip:hover {
          background-color: hsl(var(--primary) / 0.2);
        }
        .mention-editor:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .mention-editor:focus:empty::before {
          content: attr(data-placeholder);
        }
      `}</style>
      
      <div className="relative">
        <div
          ref={editorRef}
          id={id}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className={cn(
            "mention-editor block w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm leading-5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-auto whitespace-pre-wrap",
            showSuggestions && "ring-2 ring-primary/50",
            className
          )}
          style={{ minHeight: `${minHeight}px` }}
          role="textbox"
          aria-required={required}
          aria-multiline="true"
        />

        {/* Mention indicator */}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {mentionCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-1">
              <AtSign className="w-3 h-3" />
              {mentionCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className={cn(
            "absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          {users.length > 0 ? (
            <div className="max-h-48 overflow-y-auto py-1">
              {users.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    "hover:bg-primary/10",
                    index === selectedIndex && "bg-primary/10"
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.photo_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate flex-1">{user.display_name}</span>
                </button>
              ))}
            </div>
          ) : !isLoadingUsers && searchTerm ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : isLoadingUsers ? (
            <div className="px-3 py-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
