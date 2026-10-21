
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserX,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";


type TeamRole = "admin" | "member";

type TeamMember = {
  user_id: string;
  full_name: string | null;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  email?: string | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, string[] | undefined>;
};

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  role: "member" as TeamRole,
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(
  body: ApiResponse<unknown>,
  fallback: string,
) {
  if (body.details) {
    const firstError = Object.values(body.details)
      .flat()
      .find(Boolean);

    if (firstError) return firstError;
  }

  return body.error || body.message || fallback;
}

export default function TeamManagementPage() {
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<
    Record<string, TeamRole>
  >({});
  const [deactivatingId, setDeactivatingId] = useState<string | null>(
    null,
  );

  const loadMembers = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const response = await fetch("/api/team-members", {
        method: "GET",
        cache: "no-store",
      });

      const body =
        (await response.json()) as ApiResponse<TeamMember[]>;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        setPageError(
          "Administrator access is required to manage team members.",
        );
        return;
      }

      if (!response.ok || !Array.isArray(body.data)) {
        throw new Error(
          getErrorMessage(body, "Unable to load team members."),
        );
      }

      setMembers(body.data);
      setSelectedRoles(
        Object.fromEntries(
          body.data.map((member) => [member.user_id, member.role]),
        ),
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading team members.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const initialLoad = async () => {
      await loadMembers();
    };

    void initialLoad();
  }, [loadMembers]);

  

  const activeCount = members.filter(
    (member) => member.is_active,
  ).length;

  const inactiveCount = members.length - activeCount;

  const adminCount = members.filter(
    (member) => member.is_active && member.role === "admin",
  ).length;

  const filteredMembers = members.filter((member) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      (member.full_name || "").toLowerCase().includes(searchText) ||
      member.user_id.toLowerCase().includes(searchText) ||
      (member.email || "").toLowerCase().includes(searchText);

    const matchesRole =
      roleFilter === "all" || member.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && member.is_active) ||
      (statusFilter === "inactive" && !member.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  async function handleCreateMember(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitting(true);
    setPageError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/team-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });

      const body =
        (await response.json()) as ApiResponse<TeamMember>;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Unable to create team member."),
        );
      }

      setSuccessMessage(
        body.message || "Team member created successfully.",
      );
      setForm(initialForm);
      setFormOpen(false);

      await loadMembers(true);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to create the team member.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleUpdate(userId: string) {
    const role = selectedRoles[userId];

    if (!role) return;

    setPageError("");
    setSuccessMessage("");
    setEditingRoleId(userId);

    try {
      const response = await fetch(
        `/api/team-members/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );

      const body =
        (await response.json()) as ApiResponse<unknown>;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Unable to update member role."),
        );
      }

      setSuccessMessage("Member role updated successfully.");
      await loadMembers(true);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to update member role.",
      );
    } finally {
      setEditingRoleId(null);
    }
  }

  async function handleDeactivate(member: TeamMember) {
    const name = member.full_name || "this team member";

    const confirmed = window.confirm(
      `Deactivate ${name}? They will lose access to the team workspace.`,
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");
    setDeactivatingId(member.user_id);

    try {
      const response = await fetch(
        `/api/team-members/${encodeURIComponent(member.user_id)}`,
        {
          method: "DELETE",
        },
      );

      const body =
        (await response.json()) as ApiResponse<unknown>;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Unable to deactivate member."),
        );
      }

      setSuccessMessage(
        `${name} has been deactivated successfully.`,
      );
      await loadMembers(true);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to deactivate member.",
      );
    } finally {
      setDeactivatingId(null);
    }
  }


  async function handleReactivate(member: TeamMember) {
    const name = member.full_name || "this team member";

    const confirmed = window.confirm(
      `Reactivate ${name}? They will regain access to the team workspace.`,
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");
    setDeactivatingId(member.user_id);

    try {
      const response = await fetch(
        `/api/team-members/${encodeURIComponent(member.user_id)}/reactivate`,
        { method: "POST" },
      );

      const body =
        (await response.json()) as ApiResponse<unknown>;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Administrator access is required to manage team members.",
        );
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Unable to reactivate member."),
        );
      }

      setSuccessMessage(
        `${name} has been reactivated successfully.`,
      );
      await loadMembers(true);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to reactivate member.",
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
      <main className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto w-full px-4 py-7 sm:px-6 sm:py-9 lg:px-10 2xl:px-12">
          {/* Page heading */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                <ShieldCheck className="h-4 w-4 text-[#9F1239]" />
                Administration
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Team Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                Manage team access, member roles, and workspace accounts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadMembers(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormOpen((open) => !open);
                  setPageError("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9F1239] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#881337]"
              >
                {formOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {formOpen ? "Close form" : "Add team member"}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {pageError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p className="flex-1">{pageError}</p>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setPageError("")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p className="flex-1">{successMessage}</p>
              <button
                type="button"
                aria-label="Dismiss success message"
                onClick={() => setSuccessMessage("")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Summary cards */}
          <section
            aria-label="Team summary"
            className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              label="Total members"
              value={members.length}
              description="All registered team accounts"
              icon={Users}
            />
            <SummaryCard
              label="Active members"
              value={activeCount}
              description="Currently enabled accounts"
              icon={CheckCircle2}
            />
            <SummaryCard
              label="Administrators"
              value={adminCount}
              description="Active admin accounts"
              icon={ShieldCheck}
            />
            <SummaryCard
              label="Inactive members"
              value={inactiveCount}
              description="Accounts with access disabled"
              icon={UserX}
            />
          </section>

          {/* Create member form */}
          {formOpen && (
            <section className="crm-card mb-6 rounded-2xl p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Create team account
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  The member can use the temporary password until they
                  choose to change it.
                </p>
              </div>

              <form
                onSubmit={(event) => void handleCreateMember(event)}
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
              >
                <Field label="Full name">
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    placeholder="Enter full name"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#9F1239]"
                  />
                </Field>

                <Field label="Email address">
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#9F1239]"
                  />
                </Field>

                <Field label="Temporary password">
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="At least 12 characters"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#9F1239]"
                  />
                  <p className="mt-1.5 text-xs text-[var(--muted)]">
                    The password is sent only to the creation endpoint and
                    is not displayed in the member list.
                  </p>
                </Field>

                <Field label="Initial role">
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as TeamRole,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#9F1239]"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </Field>

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9F1239] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#881337] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" />
                    {submitting ? "Creating account..." : "Create account"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setForm(initialForm);
                    }}
                    disabled={submitting}
                    className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium transition hover:bg-[var(--hover)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Member table */}
          <section className="crm-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-semibold">Team members</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {filteredMembers.length} of {members.length} members shown
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or user ID..."
                  aria-label="Search team members"
                  className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[#9F1239]"
                />

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  aria-label="Filter by role"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[#9F1239]"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Administrators</option>
                  <option value="member">Members</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[#9F1239]"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-[var(--muted)]">
                Loading team members...
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <Users className="mb-3 h-10 w-10 text-[var(--muted)]" />
                <h3 className="font-semibold">No team members found</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Create a team account to get started.
                </p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-sm text-[var(--muted)]">
                No members match the current search and filters.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-[var(--hover)] text-xs uppercase tracking-wide text-[var(--muted)]">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Member</th>
                        <th className="px-6 py-4 font-semibold">Role</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Joined</th>
                        <th className="px-6 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredMembers.map((member) => (
                        <tr
                          key={member.user_id}
                          className="transition hover:bg-[var(--hover)]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9F1239]/10 text-[#9F1239]">
                                <UserRound className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {member.full_name || "Unnamed member"}
                                </p>
                                <p
                                  className="mt-1 max-w-[260px] truncate text-xs text-[var(--muted)]"
                                  title={member.email || member.user_id}
                                >
                                  {member.email || member.user_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <select
                              value={
                                selectedRoles[member.user_id] || member.role
                              }
                              onChange={(event) =>
                                setSelectedRoles((current) => ({
                                  ...current,
                                  [member.user_id]: event.target.value as TeamRole,
                                }))
                              }
                              aria-label={`Role for ${member.full_name || "member"}`}
                              disabled={
                                !member.is_active ||
                                editingRoleId === member.user_id
                              }
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm disabled:opacity-50"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>

                            {selectedRoles[member.user_id] !== member.role && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRoleUpdate(member.user_id)
                                }
                                disabled={editingRoleId === member.user_id}
                                className="ml-2 text-xs font-semibold text-[#9F1239] hover:underline disabled:opacity-50"
                              >
                                {editingRoleId === member.user_id
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <StatusPill active={member.is_active} />
                          </td>

                          <td className="px-6 py-4 text-[var(--muted)]">
                            {formatDate(member.created_at)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {member.is_active ? (
                              <button
                                type="button"
                                onClick={() => void handleDeactivate(member)}
                                disabled={deactivatingId === member.user_id}
                                className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-500/5 disabled:opacity-50"
                              >
                                {deactivatingId === member.user_id
                                  ? "Deactivating..."
                                  : "Deactivate"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleReactivate(member)}
                                disabled={deactivatingId === member.user_id}
                                className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-500/5 disabled:opacity-50"
                              >
                                {deactivatingId === member.user_id
                                  ? "Processing..."
                                  : "Reactivate"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile member cards */}
                <div className="divide-y divide-[var(--border)] md:hidden">
                  {filteredMembers.map((member) => (
                    <article key={member.user_id} className="space-y-4 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9F1239]/10 text-[#9F1239]">
                          <UserRound className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-medium">
                            {member.full_name || "Unnamed member"}
                          </h3>
                          <p className="mt-1 break-all text-xs text-[var(--muted)]">
                            {member.email || member.user_id}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Joined {formatDate(member.created_at)}
                          </p>
                        </div>

                        <StatusPill active={member.is_active} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`role-${member.user_id}`}
                          className="text-xs text-[var(--muted)]"
                        >
                          Role
                        </label>

                        <select
                          id={`role-${member.user_id}`}
                          value={
                            selectedRoles[member.user_id] || member.role
                          }
                          onChange={(event) =>
                            setSelectedRoles((current) => ({
                              ...current,
                              [member.user_id]: event.target.value as TeamRole,
                            }))
                          }
                          disabled={
                            !member.is_active ||
                            editingRoleId === member.user_id
                          }
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm disabled:opacity-50"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>

                        {selectedRoles[member.user_id] !== member.role && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleRoleUpdate(member.user_id)
                            }
                            disabled={editingRoleId === member.user_id}
                            className="rounded-lg bg-[#9F1239] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          >
                            {editingRoleId === member.user_id
                              ? "Saving..."
                              : "Save role"}
                          </button>
                        )}
                      </div>

                      {member.is_active ? (
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(member)}
                          disabled={deactivatingId === member.user_id}
                          className="w-full rounded-lg border border-red-500/30 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-500/5 disabled:opacity-50"
                        >
                          {deactivatingId === member.user_id
                            ? "Deactivating..."
                            : "Deactivate member"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleReactivate(member)}
                          disabled={deactivatingId === member.user_id}
                          className="w-full rounded-lg border border-emerald-500/30 px-3 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/5 disabled:opacity-50"
                        >
                          {deactivatingId === member.user_id
                            ? "Processing..."
                            : "Reactivate member"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <footer className="py-8 text-xs text-[var(--muted)]">
            FreeBees Sales CRM · Team administration
          </footer>
        </div>
      </main>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof Users;
}) {
  return (
    <div className="crm-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9F1239]/10 text-[#9F1239]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-[var(--hover)] text-[var(--muted)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-gray-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
