import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = value
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      )
    : suggestions;

  const showSuggestions = isOpen && filteredSuggestions.length > 0;

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [value]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {showSuggestions && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                index === highlightedIndex && "bg-accent text-accent-foreground"
              )}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
