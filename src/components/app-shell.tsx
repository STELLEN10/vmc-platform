"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { PWAInstallButton } from "@/components/pwa-install-button";
import type { AppRole } from "@/lib/database.types";

export type NavigationItem = { href: string; label: string; badge?: number };

type AppShellProps = {
  children: ReactNode;
  area: "VMC Driver" | "VMC Management";
  navigation: readonly NavigationItem[];
  profile: { fullName: string; role: AppRole };
};

export function AppShell({ children, area, navigation, profile }: AppShellProps) {
  const experience = area === "VMC Driver" ? "driver" : "management";
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem("vmc-sidebar-collapsed") === "true");
      setDarkMode(window.localStorage.getItem("vmc-theme") === "dark");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("vmc-sidebar-collapsed", String(next));
      return next;
    });
  }

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      window.localStorage.setItem("vmc-theme", next ? "dark" : "light");
      return next;
    });
  }

  const notificationsHref = experience === "driver" ? "/driver/notifications" : "/management/notifications";

  return (
    <div className={`app-shell app-shell--${experience}${collapsed ? " app-shell--collapsed" : ""}${darkMode ? " theme-dark" : ""}${mobileMenuOpen ? " app-shell--mobile-open" : ""}`}>
      <aside className="app-sidebar">
        <div>
          <div className="sidebar-brand-row">
            <BrandMark compact={collapsed} href={area === "VMC Driver" ? "/driver" : "/management"} />
            <button className="shell-icon-button sidebar-collapse-button" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-pressed={collapsed}><ChevronIcon direction={collapsed ? "right" : "left"} /></button>
          </div>
          <p className="app-area">{experience === "driver" ? "HERO RIDER APP" : "VMC OPERATIONS"}</p>
          <nav className="app-navigation" aria-label={`${area} navigation`}>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <NavigationIcon href={item.href} />
                  <span className="nav-label">{item.label}</span>
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-account"><span className="account-name">{profile.fullName || "VMC account"}</span><span className="role-chip">{profile.role}</span><SignOutButton /></div>
      </aside>
      <header className="mobile-app-header"><button className="shell-icon-button" type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Open navigation" aria-expanded={mobileMenuOpen}><MenuIcon /></button><BrandMark compact href={area === "VMC Driver" ? "/driver" : "/management"} /><div className="flex items-center gap-2"><Link href={notificationsHref} className="shell-icon-button !h-8 !w-8 flex items-center justify-center rounded-lg border border-neutral-200" title="Notifications"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></Link><PWAInstallButton className="!px-2 !py-1 !text-xs !min-h-0" /><ThemeSwitch darkMode={darkMode} onToggle={toggleTheme} /></div></header>
      <main className="app-main"><div className="shell-utility-bar"><div className="flex items-center gap-3"><Link href={notificationsHref} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition" title="Notifications"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span>Alerts</span></Link><PWAInstallButton className="!px-2 !py-1 !text-xs !min-h-0" /><ThemeSwitch darkMode={darkMode} onToggle={toggleTheme} /></div></div>{children}</main>
    </div>
  );
}

function ThemeSwitch({ darkMode, onToggle }: { darkMode: boolean; onToggle: () => void }) {
  return <button className="theme-switch" type="button" role="switch" aria-checked={darkMode} onClick={onToggle} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}><SunIcon /><span className="theme-switch__track"><span /></span><MoonIcon /></button>;
}

function NavigationIcon({ href }: { href: string }) {
  if (href.endsWith("/notifications")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
  if (href.endsWith("/finance")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
  if (href.endsWith("/documents")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
  if (href.endsWith("/analytics")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  if (href.endsWith("/activity")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
  if (href.endsWith("/drivers")) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-1.5a4 4 0 0 0-3-3.87M16 2.63a4 4 0 0 1 0 7.75" /></svg>;
  if (href.endsWith("/bikes") || href.endsWith("/bike")) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="17.5" r="3" /><circle cx="18.5" cy="17.5" r="3" /><path d="m5.5 17.5 4-8h4l3 8m-10-5h7m-2-3 2-3h3" /></svg>;
  if (href.endsWith("/payments")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>;
  if (href.endsWith("/inventory")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
  if (href.endsWith("/maintenance")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
  if (href.endsWith("/emergency")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  if (href.endsWith("/services") || href.endsWith("/service-requests")) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if (href.endsWith("/releases")) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /><circle cx="12" cy="12" r="8.5" /></svg>;
  if (href.endsWith("/team")) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-1.8-5.4M18 13.5a5 5 0 0 1 3 4.5v3" /></svg>;
  if (href.endsWith("/profile")) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
  if (href.endsWith("/onboarding")) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12 11 14 15.5 9.5M5 4h14v16H5z" /></svg>;
  if (href.endsWith("/settings")) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.68 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15 1.7 1.7 0 0 0 5.46 14H5.4v-3h.06A1.7 1.7 0 0 0 7.02 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.78V4.7h3v.08A1.7 1.7 0 0 0 15.73 6.34a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 10 1.7 1.7 0 0 0 20.96 11H21v3h-.04A1.7 1.7 0 0 0 19.4 15Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={direction === "left" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} /></svg>; }
function MenuIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>; }
function SunIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function MoonIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" /></svg>; }
