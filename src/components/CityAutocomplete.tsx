import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-state';
import { supabase } from '@/integrations/supabase/globalClient';
import { cn } from '@/lib/utils';

interface CityPrediction {
  city: string;
  state: string;
  placeId: string;
  description: string;
}

interface CityAutocompleteProps {
  value: string;
  state?: string;
  onChange: (city: string, state: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * CityAutocomplete uses global client because it may be used during onboarding
 * before BU is selected. Cities are not BU-scoped data.
 */
export function CityAutocomplete({
  value,
  state,
  onChange,
  placeholder = "Digite o nome da cidade",
  disabled = false,
}: CityAutocompleteProps) {
  
  // Exibe "Cidade, UF" no input
  const displayValue = value && state ? `${value}, ${state}` : value || '';
  
  const [inputValue, setInputValue] = useState(displayValue);
  const [predictions, setPredictions] = useState<CityPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sincroniza o valor externo
  useEffect(() => {
    const newDisplay = value && state ? `${value}, ${state}` : value || '';
    setInputValue(newDisplay);
  }, [value, state]);

  const searchCities = useCallback(async (query: string) => {
    // Remove o estado da busca se o usuário digitou "Cidade, UF"
    const searchQuery = query.split(',')[0].trim();
    
    if (searchQuery.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-cities', {
        body: { query: searchQuery },
      });

      if (error) throw error;

      setPredictions(data?.predictions || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching cities:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Debounce para evitar muitas chamadas
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchCities(newValue);
    }, 300);
  };

  const handleSelect = (prediction: CityPrediction) => {
    const display = `${prediction.city}, ${prediction.state}`;
    setInputValue(display);
    onChange(prediction.city, prediction.state);
    setPredictions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay para permitir clique na lista
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Scroll para item selecionado
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Ao focar, se já tem valor, busca novamente
            if (inputValue.length >= 2) {
              searchCities(inputValue);
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && predictions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.placeId}
              onClick={() => handleSelect(prediction)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                selectedIndex === index && "bg-accent text-accent-foreground"
              )}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>
                <span className="font-medium">{prediction.city}</span>
                {prediction.state && (
                  <span className="text-muted-foreground">, {prediction.state}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && predictions.length === 0 && inputValue.length >= 2 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-sm text-muted-foreground">
          Nenhuma cidade encontrada
        </div>
      )}
    </div>
  );
}
