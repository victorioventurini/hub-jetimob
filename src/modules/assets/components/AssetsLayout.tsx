import { Outlet, useLocation, Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, Key, Gift, FileBarChart, Settings } from "lucide-react";
import { useAssetPermissionsV2 } from "../hooks";

/**
 * Tab definitions com permission check baseado em V2.
 * `permissionCheck` é a função do hook que determina visibilidade.
 */
type TabDef = {
  name: string;
  href: string;
  icon: typeof Package;
  permissionKey: 
    | "canAccessInventoryTab" 
    | "canAccessKeysTab" 
    | "canAccessGiftsTab" 
    | "canAccessReportsTab" 
    | "canAccessSettingsTab";
};

const tabs: TabDef[] = [
  { name: "Inventário", href: "/assets/inventory", icon: Package, permissionKey: "canAccessInventoryTab" },
  { name: "Chaves", href: "/assets/keys", icon: Key, permissionKey: "canAccessKeysTab" },
  { name: "Brindes", href: "/assets/gifts", icon: Gift, permissionKey: "canAccessGiftsTab" },
  { name: "Relatórios", href: "/assets/reports", icon: FileBarChart, permissionKey: "canAccessReportsTab" },
  { name: "Configurações", href: "/assets/settings", icon: Settings, permissionKey: "canAccessSettingsTab" },
];

export function AssetsLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const permissions = useAssetPermissionsV2();

  // Filter tabs based on V2 permissions
  const visibleTabs = tabs.filter((tab) => permissions[tab.permissionKey]);
  
  // Preserve query params when navigating between tabs
  const getTabHref = (baseHref: string) => {
    const params = searchParams.toString();
    return params ? `${baseHref}?${params}` : baseHref;
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <nav className="border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 sm:gap-6 overflow-x-auto scrollbar-hide">
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
                  "flex items-center gap-2 py-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  "min-h-[44px]", // Touch target
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.name}</span>
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
