
"use client";

import { LogOut, Menu, ShieldCheck } from "lucide-react";

type AppHeaderProps = {
  onLogout: () => void;
  onMenuClick?: () => void;
};

export function AppHeader({
  onLogout,
  onMenuClick,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10 2xl:px-12">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile navigation button */}
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-controls="workspace-sidebar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] transition hover:bg-[var(--hover)] md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#9F1239] text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              FreeBees <span className="text-[#9F1239]">CRM</span>
            </h1>

            <p className="text-xs text-[var(--muted)]">
              Sales activity workspace
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--hover)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
