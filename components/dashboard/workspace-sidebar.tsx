
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  X,
  ShieldCheck,
  Users,
} from "lucide-react";

type WorkspaceSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  userRole: "admin" | "member" | null;
};

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    description: "Overview and sales trends",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Activity Management",
    description: "Manage customer activities",
    href: "/activities",
    icon: ClipboardList,
  },
  {
    label: "Team Management",
    description: "Manage team members and roles",
    href: "/team",
    icon: Users,
    adminOnly: true,
  },
];

export function WorkspaceSidebar({
  isOpen,
  onClose,
  userRole,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();

  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.adminOnly || userRole === "admin",
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="workspace-sidebar"
        aria-label="Workspace navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 ease-in-out md:sticky md:top-0 md:z-20 md:h-screen md:w-64 md:max-w-none md:translate-x-0 md:shrink-0 md:transition-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar heading */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9F1239] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold tracking-tight">
                FreeBees <span className="text-[#9F1239]">CRM</span>
              </p>

              <p className="text-xs text-[var(--muted)]">
                Sales workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-[var(--hover)] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Workspace
          </p>

          {visibleNavigationItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? "bg-[#9F1239]/10 text-[#9F1239]"
                    : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />

                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>

                  <span
                    className={`mt-0.5 block text-xs ${
                      isActive
                        ? "text-[#9F1239]/80"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-[var(--border)] p-4">
          <p className="text-xs text-[var(--muted)]">
            FreeBees Sales CRM
          </p>
        </div>
      </aside>
    </>
  );
}
