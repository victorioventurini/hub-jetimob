import { Outlet, useLocation, Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, Key, Gift, FileBarChart, Settings } from "lucide-react";
import { useAssetPermissions } from "../hooks/useAssetPermissions";

const tabs = [
  { name: "Inventário", href: "/assets/inventory", icon: Package },
  { name: "Chaves", href: "/assets/keys", icon: Key },
  { name: "Brindes", href: "/assets/gifts", icon: Gift },
  { name: "Relatórios", href: "/assets/reports", icon: FileBarChart },
  { name: "Configurações", href: "/assets/settings", icon: Settings, adminOnly: true },
];

export function AssetsLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAssetsAdmin } = useAssetPermissions();

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAssetsAdmin);
  
  // Preserve query params when navigating between tabs
  const getTabHref = (baseHref: string) => {
    const params = searchParams.toString();
    return params ? `${baseHref}?${params}` : baseHref;
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <nav className="border-b border-border">
        <div className="flex gap-6 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive =
              location.pathname === tab.href ||
              (tab.href !== "/assets" && location.pathname.startsWith(tab.href));
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
