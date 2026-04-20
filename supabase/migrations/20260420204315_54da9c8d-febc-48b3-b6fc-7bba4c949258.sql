create or replace function public.validate_team_objectives_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  objective_count integer;
begin
  select count(*) into objective_count
  from public.okr_team_objectives
  where team_id = new.team_id
    and cycle_id = new.cycle_id
    and status not in ('cancelled', 'discarded', 'completed')
    and deleted_at is null
    and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if objective_count >= 4 then
    raise exception 'Limite atingido: um Time pode ter no máximo 4 objetivos por ciclo.';
  end if;

  return new;
end;
$$;