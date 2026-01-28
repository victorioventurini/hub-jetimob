/**
 * SupplierCombobox - Autocomplete para seleção de fornecedor
 * Busca em external_companies e auto-ativa como supplier na BU
 */

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSuppliers, useSearchExternalCompany, useEnsureSupplierInBu } from "@/modules/suppliers";

// Formata documento para exibição
function formatDocument(doc: string | null): string {
  if (!doc) return "";
  if (doc.length === 11) {
    // CPF: 000.000.000-00
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (doc.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
}

interface SupplierComboboxProps {
  value: string | null;
  onChange: (supplierId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SupplierCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = "Buscar fornecedor...",
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  // Fornecedores já ativados na BU
  const { data: buSuppliers = [], isLoading: isLoadingBu } = useSuppliers();

  // Busca global por nome/CNPJ
  const { data: searchResults = [], isLoading: isSearching } = useSearchExternalCompany(
    debouncedSearch.length >= 3 ? debouncedSearch : null
  );

  // Mutation para ativar como supplier
  const { mutateAsync: ensureInBu, isPending: isActivating } = useEnsureSupplierInBu();

  // Nome do fornecedor selecionado
  const selectedSupplier = useMemo(() => {
    if (!value) return null;
    
    // Procura nos suppliers da BU
    const fromBu = buSuppliers.find((s) => s.external_company?.id === value);
    if (fromBu) return fromBu.external_company;
    
    // Procura nos resultados da busca
    const fromSearch = searchResults.find((s) => s.id === value);
    if (fromSearch) return fromSearch;
    
    return null;
  }, [value, buSuppliers, searchResults]);

  // Lista combinada para exibição
  const displayList = useMemo(() => {
    if (debouncedSearch.length >= 3) {
      // Mostra resultados da busca global
      return searchResults.map((company) => ({
        id: company.id,
        name: company.name,
        document: company.document,
        isFromBu: buSuppliers.some((s) => s.external_company?.id === company.id),
      }));
    }
    
    // Mostra suppliers da BU
    return buSuppliers
      .filter((s) => s.external_company)
      .map((s) => ({
        id: s.external_company!.id,
        name: s.external_company!.name,
        document: s.external_company!.document,
        isFromBu: true,
      }));
  }, [buSuppliers, searchResults, debouncedSearch]);

  const handleSelect = async (companyId: string) => {
    try {
      // Garante que está ativado na BU
      await ensureInBu(companyId);
      onChange(companyId);
      setOpen(false);
      setSearch("");
    } catch (error) {
      console.error("Erro ao selecionar fornecedor:", error);
    }
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
  };

  const isLoading = isLoadingBu || isSearching || isActivating;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedSupplier && "text-muted-foreground"
          )}
        >
          {selectedSupplier ? (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedSupplier.name}</span>
              {selectedSupplier.document && (
                <span className="text-xs text-muted-foreground">
                  ({formatDocument(selectedSupplier.document)})
                </span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            )}
            
            {!isLoading && displayList.length === 0 && (
              <CommandEmpty>
                {debouncedSearch.length >= 3
                  ? "Nenhum fornecedor encontrado"
                  : "Digite ao menos 3 caracteres para buscar"}
              </CommandEmpty>
            )}

            {!isLoading && displayList.length > 0 && (
              <CommandGroup 
                heading={debouncedSearch.length >= 3 ? "Resultados da busca" : "Fornecedores cadastrados"}
              >
                {displayList.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.document && (
                        <span className="text-xs text-muted-foreground">
                          {formatDocument(item.document)}
                        </span>
                      )}
                      {value === item.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {value && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleClear}
                  className="text-muted-foreground"
                >
                  Limpar seleção
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
