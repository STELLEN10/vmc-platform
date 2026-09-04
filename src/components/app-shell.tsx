import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import type { AppRole } from "@/lib/database.types";

export type NavigationItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  children: ReactNode;
  area: "VMC Driver" | "VMC Management";
  navigation: readonly NavigationItem[];
  profile: { fullName: string; role: AppRole };
};

export function AppShell({ children, area, navigation, profile }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <BrandMark href={area === "VMC Driver" ? "/driver" : "/management"} />
          <p className="app-area">{area}</p>
          <nav className="app-navigation" aria-label={`${area} navigation`}>
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-account">
          <span className="account-name">{profile.fullName || "VMC account"}</span>
          <span className="role-chip">{profile.role}</span>
          <SignOutButton />
        </div>
      </aside>
      <header className="mobile-app-header">
        <BrandMark compact href={area === "VMC Driver" ? "/driver" : "/management"} />
        <span>{area}</span>
        <SignOutButton />
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
