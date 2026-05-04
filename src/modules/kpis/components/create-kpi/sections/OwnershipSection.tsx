import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TeamSelect, BuUserSelect } from "@/components/selects";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
  watchScope: string;
  watchLifecycleStatus: string;
}

export function OwnershipSection({ form, watchScope, watchLifecycleStatus }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {watchScope === "team" && (
        <FormField
          control={form.control}
          name="team_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Time <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <TeamSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Selecione..."
                  triggerClassName="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="owner_user_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Responsável <span className="text-destructive">*</span>
              <HelpTooltip content="Pessoa accountable pelo resultado deste indicador. Monitora desvios e age para 'mover o ponteiro'." />
            </FormLabel>
            <FormControl>
              <BuUserSelect
                value={field.value}
                onValueChange={(val) => field.onChange(val ?? undefined)}
                placeholder="Selecione..."
                className="w-full"
                excludeExternal
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="updated_by_user_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Atualizado por {watchLifecycleStatus === "active" && (
                <span className="text-destructive">*</span>
              )}
              <HelpTooltip content="Pessoa responsável por inserir/atualizar os valores deste indicador. Pode ser a mesma do Responsável." />
            </FormLabel>
            <FormControl>
              <BuUserSelect
                value={field.value}
                onValueChange={(val) => field.onChange(val ?? undefined)}
                placeholder="Selecione..."
                className="w-full"
                excludeExternal
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
