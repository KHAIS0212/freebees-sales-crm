
"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export type WorkspaceRole = "admin" | "member";

const WorkspaceRoleContext = createContext<WorkspaceRole | null>(null);

export function WorkspaceRoleProvider({
  role,
  children,
}: {
  role: WorkspaceRole | null;
  children: ReactNode;
}) {
  return (
    <WorkspaceRoleContext.Provider value={role}>
      {children}
    </WorkspaceRoleContext.Provider>
  );
}

export function useWorkspaceRole() {
  return useContext(WorkspaceRoleContext);
}
