import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLocations, type BuLocationOption } from "@/modules/assets/hooks";

interface FlatLocation {
  id: string;
  name: string;
  level: number;
}

function buildFlatLocationList(locations: BuLocationOption[]): FlatLocation[] {
  const result: FlatLocation[] = [];
  
  const childrenMap = new Map<string | null, BuLocationOption[]>();
  locations.forEach((loc) => {
    const parentId = loc.parent_location_id || null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(loc);
  });

  function addWithLevel(parentId: string | null, level: number) {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const child of children) {
      result.push({
        id: child.id,
        name: child.name,
        level,
      });
      addWithLevel(child.id, level + 1);
    }
  }

  addWithLevel(null, 0);
  return result;
}

interface BuLocationSelectProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  includeNone?: boolean;
  noneLabel?: string;
  /** Only show root locations (headquarters) */
  rootOnly?: boolean;
  /** Only show children of this parent */
  parentId?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** External locations data (skip fetching) */
  locations?: BuLocationOption[];
}

/**
 * Centralized location select component.
 * Displays locations hierarchically with visual indentation.
 * 
 * @example
 * // Basic usage
 * <BuLocationSelect value={locationId} onValueChange={setLocationId} />
 * 
 * // With "all" option for filters
 * <BuLocationSelect value={filter} onValueChange={setFilter} includeAll allLabel="Todas as localizações" />
 * 
 * // Root locations only (for headquarters selection)
 * <BuLocationSelect value={hqId} onValueChange={setHqId} rootOnly />
 */
export function BuLocationSelect({
  value,
  onValueChange,
  placeholder = "Selecione localização",
  includeAll = false,
  allLabel = "Todas as localizações",
  includeNone = false,
  noneLabel = "Sem localização",
  rootOnly = false,
  parentId,
  disabled = false,
  className,
  triggerClassName,
  locations: externalLocations,
}: BuLocationSelectProps) {
  const { locations: fetchedLocations, isLoading } = useLocations();
  
  const locations = externalLocations ?? fetchedLocations;
  
  // Filter locations based on props
  let filteredLocations = locations;
  if (rootOnly) {
    filteredLocations = locations.filter(l => !l.parent_location_id);
  } else if (parentId) {
    filteredLocations = locations.filter(l => l.parent_location_id === parentId);
  }
  
  const flatLocations = rootOnly || parentId 
    ? filteredLocations.map(l => ({ id: l.id, name: l.name, level: 0 }))
    : buildFlatLocationList(filteredLocations);

  const handleChange = (val: string) => {
    if (val === "__all__") {
      onValueChange(undefined);
    } else if (val === "__none__") {
      onValueChange(undefined);
    } else {
      onValueChange(val);
    }
  };

  // Map value for select
  const selectValue = value ?? (includeAll ? "__all__" : "");

  return (
    <Select 
      value={selectValue} 
      onValueChange={handleChange} 
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-[200px]", triggerClassName, className)}>
        <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="__all__" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {includeNone && (
          <SelectItem value="__none__" className="text-muted-foreground">
            {noneLabel}
          </SelectItem>
        )}
        {flatLocations.map((loc) => (
          <SelectItem
            key={loc.id}
            value={loc.id}
            className={cn(
              loc.level === 0 && "font-medium",
              loc.level > 0 && "text-[13px] text-muted-foreground"
            )}
          >
            <span 
              className="flex items-center"
              style={{ paddingLeft: `${loc.level * 16}px` }}
            >
              {loc.level > 0 && (
                <span className="mr-1.5 text-muted-foreground/50">└</span>
              )}
              {loc.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
