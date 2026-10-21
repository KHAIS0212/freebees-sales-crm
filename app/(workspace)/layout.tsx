
"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Could not log out. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      console.error("Could not log out. Please check your connection.");
    }
  }

  return (
    <WorkspaceShell onLogout={() => void handleLogout()}>
      {children}
    </WorkspaceShell>
  );
}
