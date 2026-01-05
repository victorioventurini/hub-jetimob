import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { List, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { name: "Tickets", href: "/tickets", icon: List, exact: true },
  { name: "Configurações", href: "/tickets/settings", icon: Settings, adminOnly: true },
];

export function TicketsLayout() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <nav className="border-b border-border">
        <div className="flex gap-6 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive = tab.exact 
              ? location.pathname === tab.href
              : location.pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <Outlet />
    </div>
  );
}
