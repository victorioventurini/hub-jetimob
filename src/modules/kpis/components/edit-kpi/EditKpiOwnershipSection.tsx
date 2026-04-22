/**
 * EditKpiOwnershipSection — Time e Responsável
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
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

  return (
    <div className="grid grid-cols-2 gap-4">
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
            <FormLabel>
              Responsável{' '}
              {watchLifecycleStatus === 'active' && (
                <span className="text-destructive">*</span>
              )}
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
