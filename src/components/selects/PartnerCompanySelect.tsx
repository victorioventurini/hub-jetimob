import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { usePartnerCompanies } from "@/modules/tickets/hooks/usePartners";

interface PartnerCompany {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface PartnerCompanySelectProps {
  value: string | "all";
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  /** Only show active companies */
  activeOnly?: boolean;
  showIcon?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** External companies data (skip fetching) */
  companies?: PartnerCompany[];
}

/**
 * Centralized partner company select component.
 * Fetches partner companies from the database and displays them.
 * 
 * @example
 * // Filter usage
 * <PartnerCompanySelect value={filter} onValueChange={setFilter} includeAll />
 * 
 * // Form usage
 * <PartnerCompanySelect value={companyId} onValueChange={setCompanyId} />
 */
export function PartnerCompanySelect({
  value,
  onValueChange,
  placeholder = "Empresa parceira",
  includeAll = false,
  allLabel = "Todas as empresas",
  activeOnly = true,
  showIcon = true,
  disabled = false,
  className,
  triggerClassName,
  companies: externalCompanies,
}: PartnerCompanySelectProps) {
  const { data: fetchedCompanies = [], isLoading } = usePartnerCompanies();
  
  const allCompanies = externalCompanies ?? fetchedCompanies;
  const companies = activeOnly 
    ? allCompanies.filter(c => c.status === 'active')
    : allCompanies;

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-[200px]", triggerClassName, className)}>
        <span className="flex items-center gap-2">
          {showIcon && (
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <span className="flex items-center gap-2">
              {showIcon && (
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {company.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
