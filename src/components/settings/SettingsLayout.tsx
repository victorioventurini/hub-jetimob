import { ReactNode } from "react";
import { SettingsSidebar } from "./SettingsSidebar";

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <SettingsSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
