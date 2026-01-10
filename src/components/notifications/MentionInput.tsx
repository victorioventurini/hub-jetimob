import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    const userId = match[2];
    parts.push(
      <UserHoverCard key={`${userId}-${match.index}`} userId={userId}>
        <Link
          to={`/users/${userId}`}
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

  // Fetch users for mention suggestions
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['mention-users', currentBu?.id, searchTerm],
    queryFn: async () => {
      if (!currentBu?.id) return [];

      let query = supabase
        .from('v_bu_active_profiles')
        .select(`
          id,
          user_id,
          display_name,
          email,
          photo_url,
          team_name
        `)
        .eq('bu_id', currentBu.id)
        .order('display_name');

      if (searchTerm) {
        query = query.ilike('display_name', `%${searchTerm}%`);
      }

      query = query.limit(8);

      const { data, error } = await query;
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

  // Handle user selection from suggestions
  const selectUser = (user: MentionUser) => {
    if (!editorRef.current || mentionStartOffset === null) return;

    // Get current value and find the @ trigger position
    const currentValue = htmlToValue(editorRef.current.innerHTML);
    const cursorInfo = getTextBeforeCursor();
    if (!cursorInfo) return;

    const { text: textBeforeCursor } = cursorInfo;
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    // Calculate the part of current text being typed as mention
    const beforeMention = currentValue.slice(0, lastAtIndex);
    const afterMentionText = textBeforeCursor.slice(lastAtIndex + 1);
    
    // Find where the cursor is in the full value
    let fullTextLength = 0;
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let tempValue = currentValue;
    let match;
    while ((match = mentionRegex.exec(currentValue)) !== null) {
      // This is complex, let's simplify
    }

    // Simpler approach: rebuild from scratch
    const mentionDisplayName = getEmailPrefix(user.email) || user.display_name;
    const mentionFormat = `@[${mentionDisplayName}](${user.user_id})`;
    
    // Get text after what user was typing
    const afterCursor = currentValue.slice(lastAtIndex + afterMentionText.length + 1);
    
    const newValue = beforeMention + mentionFormat + ' ' + afterCursor;

    lastValueRef.current = newValue;
    editorRef.current.innerHTML = valueToHtml(newValue);
    
    // Move cursor after the inserted mention
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);

    setShowSuggestions(false);
    setMentionStartOffset(null);
    setSearchTerm('');

    // Set cursor position after mention - ensure it's in an editable text node
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const selection = window.getSelection();
        if (selection) {
          // Find the last text node in the editor (after the mention chip)
          const walker = document.createTreeWalker(
            editorRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let lastTextNode: Text | null = null;
          let node: Node | null;
          while ((node = walker.nextNode())) {
            lastTextNode = node as Text;
          }
          
          if (lastTextNode) {
            const range = document.createRange();
            range.setStart(lastTextNode, lastTextNode.length);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // Create a text node at the end if none exists
            const textNode = document.createTextNode('\u200B');
            editorRef.current.appendChild(textNode);
            const range = document.createRange();
            range.setStart(textNode, 1);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    });
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
          padding: 0 4px;
          margin: 0 1px;
          border-radius: 3px;
          background-color: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          font-size: inherit;
          font-weight: 500;
          vertical-align: baseline;
          line-height: inherit;
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
            "mention-editor flex w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-auto whitespace-pre-wrap",
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
