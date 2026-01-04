import { ReactNode, useState } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { Header } from "@/components/layout/Header";

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const [sidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className="flex flex-1 pt-16">
        <SettingsSidebar />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
