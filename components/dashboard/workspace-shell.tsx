
"use client";

import { WorkspaceRoleProvider } from "./workspace-role-context";
import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/dashboard/app-header";
import { WorkspaceSidebar } from "@/components/dashboard/workspace-sidebar";

type WorkspaceShellProps = {
  children: ReactNode;
  onLogout: () => void;
};

type SessionResponse = {
  authenticated?: boolean;
  role?: "admin" | "member";
};

export function WorkspaceShell({
  children,
  onLogout,
}: WorkspaceShellProps) {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "member" | null>(
    null,
  );

  const sessionRequestStarted = useRef(false);

  useEffect(() => {
    if (sessionRequestStarted.current) return;

    sessionRequestStarted.current = true;
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          setUserRole(null);
          return;
        }

        if (!response.ok) return;

        const session =
          (await response.json()) as SessionResponse;

        if (
          !cancelled &&
          session.authenticated &&
          (session.role === "admin" || session.role === "member")
        ) {
          setUserRole(session.role);
        }
      } catch {
        // Keep admin-only navigation hidden if session verification fails.
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function closeSidebar() {
    setSidebarOpen(false);
  }

return (
  <WorkspaceRoleProvider role={userRole}>
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)] md:flex-row">
      <WorkspaceSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        userRole={userRole}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  </WorkspaceRoleProvider>
);
}
