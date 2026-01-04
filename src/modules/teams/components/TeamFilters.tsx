import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  parentTeamId: string | null;
  onParentTeamChange: (value: string | null) => void;
  leaderId: string | null;
  onLeaderChange: (value: string | null) => void;
  parentTeams: { id: string; name: string }[];
  leaders: { id: string; display_name: string }[];
}

export function TeamFilters({
  search,
  onSearchChange,
  parentTeamId,
  onParentTeamChange,
  leaderId,
  onLeaderChange,
  parentTeams,
  leaders,
}: TeamFiltersProps) {
  const hasFilters = search || parentTeamId || leaderId;

  const clearFilters = () => {
    onSearchChange("");
    onParentTeamChange(null);
    onLeaderChange(null);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar time..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

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
