import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to extract display text (without mention syntax)
export function getMentionDisplayText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

// Helper to parse mentions for display (convert @[Name](id) to clickable links)
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
      <Link
        key={`${userId}-${match.index}`}
        to={`/users/${userId}`}
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        @{displayName}
      </Link>
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
  photo_url: string | null;
  team_name: string | null;
}

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
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Convert raw value to HTML for contentEditable
  const valueToHtml = useCallback((rawValue: string): string => {
    if (!rawValue) return '';
    
    // Replace @[Name](id) with styled span chips
    return rawValue.replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      '<span class="mention-chip" contenteditable="false" data-user-id="$2" data-display-name="$1">@$1</span>'
    );
  }, []);

  // Convert HTML from contentEditable to raw value
  const htmlToValue = useCallback((html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    let result = '';
    temp.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.classList.contains('mention-chip')) {
          const userId = element.dataset.userId;
          const displayName = element.dataset.displayName;
          result += `@[${displayName}](${userId})`;
        } else if (element.tagName === 'BR') {
          result += '\n';
        } else {
          result += element.textContent || '';
        }
      }
    });
    
    return result;
  }, []);

  // Get plain text content for cursor position calculations
  const getPlainText = useCallback((): string => {
    if (!editorRef.current) return '';
    return editorRef.current.innerText || '';
  }, []);

  // Get cursor position in plain text
  const getCursorPosition = useCallback((): number => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  }, []);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const html = editorRef.current.innerHTML;
    const newValue = htmlToValue(html);
    const cursorPos = getCursorPosition();
    const plainText = getPlainText();
    
    // Check if user is typing a mention
    const textBeforeCursor = plainText.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if it's not part of an existing mention chip
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n') && textAfterAt.length < 30) {
        setMentionStart(lastAtIndex);
        setSearchTerm(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionStart(null);
      }
    } else {
      setShowSuggestions(false);
      setMentionStart(null);
    }
    
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
  }, [htmlToValue, getCursorPosition, getPlainText, extractMentions, onChange]);

  // Handle user selection from suggestions
  const selectUser = useCallback((user: MentionUser) => {
    if (mentionStart === null || !editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    // Get current HTML and convert to find the @ position
    const plainText = getPlainText();
    const cursorPos = getCursorPosition();
    
    // Find the @ in the current text
    const textBeforeCursor = plainText.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;
    
    // Calculate how many characters to remove (@ + search term)
    const charsToRemove = cursorPos - lastAtIndex;
    
    // Create the mention chip HTML
    const chipHtml = `<span class="mention-chip" contenteditable="false" data-user-id="${user.user_id}" data-display-name="${user.display_name}">@${user.display_name}</span>&nbsp;`;
    
    // We need to manipulate the DOM directly
    // First, delete the @ and search term
    for (let i = 0; i < charsToRemove; i++) {
      document.execCommand('delete', false);
    }
    
    // Insert the chip
    document.execCommand('insertHTML', false, chipHtml);
    
    // Update value
    const html = editorRef.current.innerHTML;
    const newValue = htmlToValue(html);
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
    
    setShowSuggestions(false);
    setMentionStart(null);
    setSearchTerm('');
  }, [mentionStart, getPlainText, getCursorPosition, htmlToValue, extractMentions, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showSuggestions || users.length === 0) {
      return;
    }

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
        e.preventDefault();
        selectUser(users[selectedIndex]);
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
  }, [showSuggestions, users, selectedIndex, selectUser]);

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

  // Sync external value changes to editor
  useEffect(() => {
    if (!editorRef.current) return;
    
    const currentHtml = editorRef.current.innerHTML;
    const currentValue = htmlToValue(currentHtml);
    
    // Only update if value actually changed from outside
    if (currentValue !== value) {
      const newHtml = valueToHtml(value);
      editorRef.current.innerHTML = newHtml;
    }
  }, [value, htmlToValue, valueToHtml]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const minHeight = rows * 24 + 16; // Approximate line height + padding

  return (
    <div className="relative">
      {/* Styles for mention chips */}
      <style>{`
        .mention-chip {
          display: inline-flex;
          align-items: center;
          padding: 1px 6px;
          margin: 0 1px;
          border-radius: 4px;
          background-color: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
          font-weight: 500;
          font-size: 0.875rem;
          user-select: all;
          cursor: default;
        }
        .mention-chip:hover {
          background-color: hsl(var(--primary) / 0.25);
        }
        .mention-editor:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .mention-editor:focus {
          outline: none;
        }
      `}</style>

      {/* ContentEditable editor */}
      <div className="relative">
        <div
          ref={editorRef}
          id={id}
          contentEditable
          role="textbox"
          aria-required={required}
          aria-multiline="true"
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={cn(
            "mention-editor flex w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-auto",
            showSuggestions && "ring-2 ring-primary/50",
            className
          )}
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: valueToHtml(value) }}
          suppressContentEditableWarning
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
                    "hover:bg-accent",
                    index === selectedIndex && "bg-accent"
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
