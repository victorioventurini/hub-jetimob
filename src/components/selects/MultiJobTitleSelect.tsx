/**
 * MultiJobTitleSelect Component
 * 
 * Multi-select for job titles. Based on MultiTeamSelect pattern.
 * Used for selecting applicable job titles in Equipment Recommendations.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveJobTitles } from "@/modules/settings/hooks";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Briefcase } from "lucide-react";

interface MultiJobTitleSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  excludeJobTitleIds?: string[];
  disabled?: boolean;
  className?: string;
}

/**
 * Multi-select component for job titles.
 * Used for selecting applicable job titles in Equipment Recommendations.
 */
export function MultiJobTitleSelect({
  value,
  onValueChange,
  placeholder = "Selecione cargos",
  excludeJobTitleIds = [],
  disabled = false,
  className,
}: MultiJobTitleSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: jobTitles = [], isLoading } = useActiveJobTitles();

  const filteredJobTitles = jobTitles.filter(jt => !excludeJobTitleIds.includes(jt.id));
  const selectedJobTitles = filteredJobTitles.filter(jt => value.includes(jt.id));

  const handleToggle = (jobTitleId: string) => {
    if (value.includes(jobTitleId)) {
      onValueChange(value.filter(id => id !== jobTitleId));
    } else {
      onValueChange([...value, jobTitleId]);
    }
  };

  const handleRemove = (jobTitleId: string) => {
    onValueChange(value.filter(id => id !== jobTitleId));
  };

  const handleClear = () => {
    onValueChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-[40px] h-auto",
            !value.length && "text-muted-foreground",
            className
          )}
          disabled={disabled || isLoading}
        >
          <div className="flex flex-wrap gap-1 items-center flex-1">
            {selectedJobTitles.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedJobTitles.length <= 2 ? (
              selectedJobTitles.map(jt => (
                <Badge 
                  key={jt.id} 
                  variant="secondary" 
                  className="mr-1"
                >
                  {jt.name}
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(jt.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedJobTitles.length} cargos selecionados
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium">Cargos aplicáveis</span>
          {value.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 text-xs"
            >
              Limpar
            </Button>
          )}
        </div>
        <ScrollArea className="h-[250px]">
          <div className="p-2 space-y-1">
            {filteredJobTitles.map((jobTitle) => (
              <div
                key={jobTitle.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                  value.includes(jobTitle.id) && "bg-muted"
                )}
                onClick={() => handleToggle(jobTitle.id)}
              >
                <Checkbox
                  checked={value.includes(jobTitle.id)}
                  onCheckedChange={() => handleToggle(jobTitle.id)}
                />
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{jobTitle.name}</span>
              </div>
            ))}
            {filteredJobTitles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cargo disponível
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
