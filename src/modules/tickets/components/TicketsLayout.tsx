/**
 * TicketsLayout - Simple layout wrapper for tickets module
 * Renders child routes directly without tabs (filters handle navigation)
 */

import { Outlet } from "react-router-dom";

export function TicketsLayout() {
  return <Outlet />;
}
