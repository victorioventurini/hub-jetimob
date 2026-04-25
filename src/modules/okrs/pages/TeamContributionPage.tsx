import { Navigate, useParams } from "react-router-dom";

/**
 * Legacy route /okrs/team-contribution/:teamId
 *
 * A partir da v3.x, a visão de contribuição passou a viver dentro da aba
 * "Contribuição" da página do time (/teams/:id?tab=contribution). Esta rota
 * permanece como redirecionamento para preservar deep-links externos.
 *
 * Mantemos a sub-tab "org-contribution" como padrão para preservar o
 * comportamento original da página standalone (lista de Objetivos Org. impactados).
 */
export default function TeamContributionPage() {
  const { teamId } = useParams<{ teamId: string }>();

  if (!teamId) {
    return <Navigate to="/teams" replace />;
  }

  return (
    <Navigate
      to={`/teams/${teamId}?tab=contribution&subtab=org-contribution`}
      replace
    />
  );
}
