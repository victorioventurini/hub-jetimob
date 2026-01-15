import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrlSearchInput } from "@/shared/filters/UrlSearchInput";

interface TeamFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  parentTeamId: string | null;
  onParentTeamChange: (value: string | null) => void;
  leaderId: string | null;
  onLeaderChange: (value: string | null) => void;
  areaId: string | null;
  onAreaChange: (value: string | null) => void;
  parentTeams: { id: string; name: string }[];
  leaders: { id: string; display_name: string }[];
  areas: { id: string; name: string; color: string | null }[];
}

export function TeamFilters({
  search,
  onSearchChange,
  parentTeamId,
  onParentTeamChange,
  leaderId,
  onLeaderChange,
  areaId,
  onAreaChange,
  parentTeams,
  leaders,
  areas,
}: TeamFiltersProps) {
  const hasFilters = search || parentTeamId || leaderId || areaId;

  const clearFilters = () => {
    onSearchChange("");
    onParentTeamChange(null);
    onLeaderChange(null);
    onAreaChange(null);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      {/* Search */}
      <UrlSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar time..."
        className="flex-1 max-w-xs"
        debounceMs={300}
      />

      {/* Area Filter */}
      <Select
        value={areaId || "all"}
        onValueChange={(v) => onAreaChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          <SelectItem value="none">Sem área</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              <div className="flex items-center gap-2">
                <Building2
                  className="h-3.5 w-3.5"
                  style={{ color: area.color || "currentColor" }}
                />
                <span>{area.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Parent Team Filter */}
      <Select
        value={parentTeamId || "all"}
        onValueChange={(v) => onParentTeamChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Time pai" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os times</SelectItem>
          <SelectItem value="root">Apenas times pai</SelectItem>
          {parentTeams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Leader Filter */}
      <Select
        value={leaderId || "all"}
        onValueChange={(v) => onLeaderChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Gestor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os gestores</SelectItem>
          <SelectItem value="none">Sem gestor</SelectItem>
          {leaders.map((leader) => (
            <SelectItem key={leader.id} value={leader.id}>
              {leader.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1.5"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
