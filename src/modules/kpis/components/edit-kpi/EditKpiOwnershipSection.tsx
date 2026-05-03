/**
 * EditKpiOwnershipSection — Time, Responsável e Atualizado por
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 * v2.92.0 — Adiciona campo "Atualizado por" (data_entry contributor).
 */
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { BuUserSelect, TeamSelect } from '@/components/selects';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import type { EditKpiFormValues } from './editKpiSchema';

interface EditKpiOwnershipSectionProps {
  form: UseFormReturn<EditKpiFormValues>;
  allowedTeamIds: string[];
}

export function EditKpiOwnershipSection({
  form,
  allowedTeamIds,
}: EditKpiOwnershipSectionProps) {
  const watchScope = form.watch('scope');
  const watchLifecycleStatus = form.watch('lifecycle_status');
  const requiresActive = watchLifecycleStatus === 'active';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {watchScope === 'team' && (
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
                  filterTeamIds={allowedTeamIds.length > 0 ? allowedTeamIds : undefined}
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
              Atualizado por {requiresActive && <span className="text-destructive">*</span>}
              <HelpTooltip content="Pessoa responsável por inserir/atualizar os valores deste indicador. Pode ser a mesma do Responsável ou alguém diferente." />
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
