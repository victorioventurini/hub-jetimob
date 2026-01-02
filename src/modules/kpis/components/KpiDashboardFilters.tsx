import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiCategory, CATEGORY_LABELS } from "../types";

interface KpiDashboardFiltersProps {
  category: KpiCategory | "all";
  teamId: string | "all";
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
}

export function KpiDashboardFilters({
  category,
  teamId,
  onCategoryChange,
  onTeamChange,
}: KpiDashboardFiltersProps) {
  const { data: teams } = useQuery({
    queryKey: ["teams-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={category}
        onValueChange={(value) => onCategoryChange(value as KpiCategory | "all")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {(Object.keys(CATEGORY_LABELS) as KpiCategory[]).map((cat) => (
            <SelectItem key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={teamId}
        onValueChange={(value) => onTeamChange(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os times</SelectItem>
          {teams?.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
