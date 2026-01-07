import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBu } from '@/contexts/BuContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Helper function to extract display text (without mention syntax)
export function getMentionDisplayText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

// Helper to parse mentions for display (convert @[Name](id) to clickable links)
// Returns an array with a unique key for React rendering
export function parseMentionsForDisplay(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the mention as a Link (React Router) instead of <a> to avoid full page reload
    const displayName = match[1];
    const userId = match[2];
    parts.push(
      <Link
        key={`${userId}-${match.index}`}
        to={`/users/${userId}`}
        className="text-primary font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{displayName}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch users for mention suggestions
  const { data: users = [] } = useQuery({
    queryKey: ['mention-users', currentBu?.id, searchTerm],
    queryFn: async () => {
      if (!currentBu?.id) return [];

      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          photo_url,
          team:teams(name)
        `)
        .eq('bu_id', currentBu.id)
        .eq('employment_status', 'active')
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
        team_name: (u.team as any)?.name || null,
      })) as MentionUser[];
    },
    enabled: !!currentBu?.id && showSuggestions,
  });

  // Extract mentions from text
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // user_id
    }
    return mentions;
  }, []);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = e.target.value;
    const newPosition = e.target.selectionStart;
    setCursorPosition(newPosition);

    // Convert display text back to raw format by preserving existing mentions
    // This is a simple approach - just update the raw value with new display text
    // For now, we track the actual typed text
    
    // Check if user is typing a mention
    const textBeforeCursor = newDisplayValue.slice(0, newPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @ (user is still typing the mention)
      // Also check it's not part of an existing mention (@Name format)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
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

    // For simplicity, we store the display text as the value
    // Mentions will be added in full format when selected
    const mentions = extractMentions(newDisplayValue);
    onChange(newDisplayValue, mentions);
  };

  // Handle user selection from suggestions
  const selectUser = (user: MentionUser) => {
    if (mentionStart === null || !textareaRef.current) return;

    // Get the current displayed value
    const displayValue = getMentionDisplayText(value);
    const beforeMention = displayValue.slice(0, mentionStart);
    const afterMention = displayValue.slice(cursorPosition);
    
    // Format: @[Display Name](user_id) - stored internally
    // Display: @Display Name - shown to user
    const mentionText = `@[${user.display_name}](${user.user_id}) `;
    const newValue = beforeMention + mentionText + afterMention;
    
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
    
    setShowSuggestions(false);
    setMentionStart(null);
    setSearchTerm('');

    // Focus back on textarea and set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        // Calculate position in display text
        const displayMention = `@${user.display_name} `;
        const newCursorPos = beforeMention.length + displayMention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render text with highlighted mentions
  const renderDisplayText = () => {
    // Convert @[Name](id) format to just @Name for display
    return value.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={renderDisplayText()}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
      />

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && users.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {users.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.display_name}</p>
                {user.team_name && (
                  <p className="text-xs text-muted-foreground truncate">{user.team_name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && users.length === 0 && searchTerm && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3"
        >
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
        </div>
      )}
    </div>
  );
}
