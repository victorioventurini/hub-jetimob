// Teams module hooks barrel export

export { 
  useTeams, 
  useTeam, 
  useTeamTree,
  useHierarchicalTeamList,
  useCreateTeam, 
  useUpdateTeam, 
  useDeactivateTeam,
  useDeleteTeam,
  useAvailableLeaders,
  useTeamStats,
  type UseTeamsOptions,
  type FlatTeamItem,
} from "./useTeams";

export { 
  useSquads, 
  useSquad, 
  useCreateSquad, 
  useUpdateSquad, 
  useDeleteSquad,
  useDeactivateSquad,
  useAddSquadMember,
  useUpdateSquadMember,
  useRemoveSquadMember,
} from "./useSquads";
