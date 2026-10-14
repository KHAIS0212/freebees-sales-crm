"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import {

  Activity,

  AlertCircle,

  ArrowDownRight,

  Check,

  CheckCircle2,

  ChevronDown,

  Clock3,

  Coffee,

  LoaderCircle,

  LogOut,

  Mail,

  MessageCircle,

  MoreHorizontal,

  Plus,

  RefreshCw,

  RotateCcw,

  Search,

  ShieldCheck,

  Trash2,

  Users,

  X,

} from "lucide-react";

type ActivityType = "CALL" | "RESTAURANT_VISIT" | "MEETING" | "EMAIL";

type ActivityStatus = "PENDING" | "COMPLETED" | "FOLLOW_UP_REQUIRED";

type SalesActivity = {

  id: string;

  customer_name: string;

  customer_phone?: string | null;

  customer_email?: string | null;

  activity_type: ActivityType;

  status: ActivityStatus;

  notes: string;

  created_at: string;

};

type DailyActivityCount = { date: string; count: number };

type DashboardStats = {

  totalActivities: number;

  pendingActivities: number;

  completedActivities: number;

  followUpsRequired: number;

  dailyActivityCounts: DailyActivityCount[];

};

type ApiResponse<T> = {

  data?: T;

  error?: string;

  message?: string;

  pagination?: {

    limit: number;

    offset: number;

    total: number;

    hasMore: boolean;

  };

};

const PAGE_SIZE = 20;

const EMPTY_STATS: DashboardStats = {

  totalActivities: 0,

  pendingActivities: 0,

  completedActivities: 0,

  followUpsRequired: 0,

  dailyActivityCounts: [],

};

const ACTIVITY_TYPES: {

  value: ActivityType;

  label: string;

}[] = [

  { value: "CALL", label: "Call" },

  { value: "RESTAURANT_VISIT", label: "Restaurant visit" },

  { value: "MEETING", label: "Meeting" },

  { value: "EMAIL", label: "Email" },

];

const ACTIVITY_STATUSES: {

  value: ActivityStatus;

  label: string;

}[] = [

  { value: "PENDING", label: "Pending" },

  { value: "COMPLETED", label: "Completed" },

  { value: "FOLLOW_UP_REQUIRED", label: "Follow-up required" },

];

function getErrorMessage(body: ApiResponse<unknown>, fallback: string) {

  return body.error || body.message || fallback;

}

function formatDate(date: string) {

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {

    return "Date unavailable";

  }

  return new Intl.DateTimeFormat("en-IN", {

    day: "numeric",

    month: "short",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",

  }).format(parsed);

}

function typeLabel(type: ActivityType) {

  return ACTIVITY_TYPES.find((item) => item.value === type)?.label ?? type;

}

function statusLabel(status: ActivityStatus) {

  return (

    ACTIVITY_STATUSES.find((item) => item.value === status)?.label ?? status

  );

}

function TypeIcon({ type }: { type: ActivityType }) {

  const iconClass = "h-4 w-4";

  switch (type) {

    case "CALL":

      return <MessageCircle className={iconClass} />;

    case "RESTAURANT_VISIT":

      return <Coffee className={iconClass} />;

    case "MEETING":

      return <Users className={iconClass} />;

    case "EMAIL":

      return <Mail className={iconClass} />;

  }

}

function StatusBadge({ status }: { status: ActivityStatus }) {

  const styles: Record<ActivityStatus, string> = {

    PENDING: "border-amber-300 bg-amber-50 text-amber-800",

    COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-800",

    FOLLOW_UP_REQUIRED:

      "border-violet-300 bg-violet-50 text-violet-800",

  };

  return (

    <span

      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}

    >

      {status === "COMPLETED" ? (

        <CheckCircle2 className="h-3.5 w-3.5" />

      ) : status === "PENDING" ? (

        <Clock3 className="h-3.5 w-3.5" />

      ) : (

        <AlertCircle className="h-3.5 w-3.5" />

      )}

      {statusLabel(status)}

    </span>

  );

}

function StatCard({

  label,

  value,

  description,

  icon,

  accent,

}: {

  label: string;

  value: number;

  description: string;

  icon: React.ReactNode;

  accent: string;

}) {

  return (

    <div className="crm-card group rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-6">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>

          <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">

            {value.toLocaleString("en-IN")}

          </p>

        </div>

        <div className={`rounded-xl p-3 ${accent}`}>{icon}</div>

      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{description}</p>

    </div>

  );

}

export default function Home() {

  const router = useRouter();

  const [activities, setActivities] = useState<SalesActivity[]>([]);

  const [selectedNote, setSelectedNote] = useState<{ customerName: string; notes: string } | null>(null);

  const [deleteCandidate, setDeleteCandidate] = useState<SalesActivity | null>(null);

  const [hasMoreActivities, setHasMoreActivities] = useState(false);

  const [matchingActivityCount, setMatchingActivityCount] = useState(0);

  const [loadingMore, setLoadingMore] = useState(false);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [pageError, setPageError] = useState("");

  const [formError, setFormError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [activityTypeFilter, setActivityTypeFilter] = useState("ALL");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");
  const [trendRange, setTrendRange] = useState<"7d" | "30d" | "all">("7d");

  const [showForm, setShowForm] = useState(false);

  const [userRole, setUserRole] = useState<string | null>(null);

  const [actingActivityId, setActingActivityId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{

    activity: SalesActivity;

    x: number;

    y: number;

  } | null>(null);

  const [customerName, setCustomerName] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");

  const [customerEmail, setCustomerEmail] = useState("");

  const [activityType, setActivityType] = useState<ActivityType>("CALL");

  const [status, setStatus] = useState<ActivityStatus>("PENDING");

  const [notes, setNotes] = useState("");

  const loadDashboard = useCallback(

    async (showRefreshIndicator = false) => {

      if (showRefreshIndicator) {

        setRefreshing(true);

      } else {

        setLoading(true);

      }

      setPageError("");

      try {

        const params = new URLSearchParams({

          limit: String(PAGE_SIZE),

          offset: "0",

        });

        if (debouncedSearchTerm.trim()) params.set("q", debouncedSearchTerm.trim());

        if (statusFilter !== "ALL") params.set("status", statusFilter);

        if (activityTypeFilter !== "ALL") params.set("activityType", activityTypeFilter);

        if (dateFrom) params.set("from", dateFrom);

        if (dateTo) params.set("to", dateTo);

        const [activitiesResponse, statsResponse] = await Promise.all([

          fetch(`/api/activities?${params.toString()}`, {

            method: "GET",

            cache: "no-store",

          }),

          fetch(`/api/dashboard/stats?range=${trendRange}`, {
            method: "GET",
            cache: "no-store",
          }),

        ]);

        if (activitiesResponse.status === 401 || statsResponse.status === 401) {

          router.replace("/login");

          return;

        }

        if (activitiesResponse.status === 403 || statsResponse.status === 403) {

          throw new Error(

            "Your account does not have active team access. Please contact your administrator.",

          );

        }

        const activitiesBody = (await activitiesResponse.json()) as ApiResponse<SalesActivity[]>;

        const statsBody = (await statsResponse.json()) as ApiResponse<DashboardStats>;

        if (!activitiesResponse.ok) {

          throw new Error(getErrorMessage(activitiesBody, "Could not load activities."));

        }

        if (!statsResponse.ok) {

          throw new Error(getErrorMessage(statsBody, "Could not load dashboard statistics."));

        }

        if (!Array.isArray(activitiesBody.data) || !statsBody.data) {

          throw new Error("The server returned an unexpected response.");

        }

        setActivities(activitiesBody.data);

        setMatchingActivityCount(activitiesBody.pagination?.total ?? activitiesBody.data.length);

        setHasMoreActivities(activitiesBody.pagination?.hasMore ?? false);

        setStats(statsBody.data);

      } catch (error) {

        setPageError(

          error instanceof Error

            ? error.message

            : "Something went wrong while loading the dashboard.",

        );

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    },

    [router, debouncedSearchTerm, statusFilter, activityTypeFilter, dateFrom, dateTo, trendRange],

  );

  useEffect(() => {

    const timer = window.setTimeout(() => {

      setDebouncedSearchTerm(searchTerm);

    }, 300);

    return () => window.clearTimeout(timer);

  }, [searchTerm]);

  useEffect(() => {

    if (!successMessage) return;

    const timer = window.setTimeout(() => setSuccessMessage(""), 3500);

    return () => window.clearTimeout(timer);

  }, [successMessage]);

  useEffect(() => {

    function handleEscape(event: KeyboardEvent) {

      if (event.key !== "Escape") return;

      setSelectedNote(null);

      setDeleteCandidate(null);

      setContextMenu(null);

      if (!saving) setShowForm(false);

    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);

  }, [saving]);

  useEffect(() => {

    void loadDashboard();

  }, [loadDashboard]);

  useEffect(() => {

    let cancelled = false;

    async function loadSessionRole() {

      try {

        const response = await fetch("/api/auth/session", { cache: "no-store" });

        if (response.status === 401) {

          router.replace("/login");

          return;

        }

        if (!response.ok) return;

        const body = (await response.json()) as {

          authenticated?: boolean;

          role?: string;

        };

        if (!cancelled && body.authenticated && body.role) {

          setUserRole(body.role);

        }

      } catch {

        // Fail closed: admin controls remain hidden if role verification fails.

      }

    }

    void loadSessionRole();

    return () => { cancelled = true; };

  }, [router]);

  async function handleLoadMore() {

    if (loadingMore || !hasMoreActivities) return;

    setLoadingMore(true);

    setPageError("");

    try {

      const params = new URLSearchParams({

        limit: String(PAGE_SIZE),

        offset: String(activities.length),

      });

      if (debouncedSearchTerm.trim()) params.set("q", debouncedSearchTerm.trim());

      if (statusFilter !== "ALL") params.set("status", statusFilter);

      if (activityTypeFilter !== "ALL") params.set("activityType", activityTypeFilter);

      if (dateFrom) params.set("from", dateFrom);

      if (dateTo) params.set("to", dateTo);

      const response = await fetch(`/api/activities?${params.toString()}`, {

        cache: "no-store",

      });

      if (response.status === 401) {

        router.replace("/login");

        return;

      }

      const body = (await response.json()) as ApiResponse<SalesActivity[]>;

      if (!response.ok || !Array.isArray(body.data)) {

        throw new Error(getErrorMessage(body, "Could not load more activities."));

      }

      setActivities((current) => {

        const knownIds = new Set(current.map((activity) => activity.id));

        return [...current, ...body.data!.filter((activity) => !knownIds.has(activity.id))];

      });

      setMatchingActivityCount(body.pagination?.total ?? matchingActivityCount);

      setHasMoreActivities(body.pagination?.hasMore ?? false);

    } catch (error) {

      setPageError(error instanceof Error ? error.message : "Could not load more activities.");

    } finally {

      setLoadingMore(false);

    }

  }

  async function handleActivityAction(

    activity: SalesActivity,

    action: "status" | "delete",

    nextStatus?: ActivityStatus,

    confirmedDelete = false,

  ) {

    if (actingActivityId) return;

    setContextMenu(null);

    if (action === "status" && (!nextStatus || nextStatus === activity.status)) return;

    if (action === "delete" && !confirmedDelete) {

      setDeleteCandidate(activity);

      return;

    }

    setActingActivityId(activity.id);

    setPageError("");

    setSuccessMessage("");

    try {

      const response = action === "status"

        ? await fetch("/api/activities", {

            method: "PATCH",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ id: activity.id, status: nextStatus }),

          })

        : await fetch(`/api/activities?id=${encodeURIComponent(activity.id)}`, {

            method: "DELETE",

          });

      if (response.status === 401) {

        router.replace("/login");

        return;

      }

      const body = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok) {

        throw new Error(getErrorMessage(

          body,

          action === "status" ? "Could not update the activity status." : "Could not delete the activity.",

        ));

      }

      if (action === "delete") setDeleteCandidate(null);

      setSuccessMessage(action === "status"

        ? `Activity status changed to ${ACTIVITY_STATUSES.find((item) => item.value === nextStatus)?.label ?? nextStatus}.`

        : "Activity deleted successfully.");

      await loadDashboard(true);

    } catch (error) {

      setPageError(error instanceof Error

        ? error.message

        : "Something went wrong while updating the activity.");

    } finally {

      setActingActivityId(null);

    }

  }

  function openActivityMenu(event: React.MouseEvent, activity: SalesActivity) {

    if (userRole !== "admin") return;

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();

    setContextMenu({

      activity,

      x: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)),

      y: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 240)),

    });

  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setFormError("");

    setSuccessMessage("");

    const trimmedName = customerName.trim();

    const trimmedNotes = notes.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedEmail = customerEmail.trim();

    if (!trimmedName) {

      setFormError("Please enter a customer or restaurant name.");

      return;

    }

    if (trimmedName.length > 120) {

      setFormError("The name must not exceed 120 characters.");

      return;

    }

    if (trimmedPhone.length > 30) {
      setFormError("Phone number must not exceed 30 characters.");
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (trimmedEmail.length > 254) {
      setFormError("Email address must not exceed 254 characters.");
      return;
    }
    if (trimmedNotes.length > 2000) {

      setFormError("Notes must not exceed 2,000 characters.");

      return;

    }

    setSaving(true);

    try {

      const response = await fetch("/api/activities", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          customerName: trimmedName,

          customerPhone: trimmedPhone,

          customerEmail: trimmedEmail,

          activityType,

          status,

          notes: trimmedNotes,

        }),

      });

      if (response.status === 401) {

        router.replace("/login");

        return;

      }

      const body = (await response.json()) as ApiResponse<SalesActivity>;

      if (!response.ok) {

        if (response.status === 403) {

          throw new Error(

            "Your account does not have active team access."

          );

        }

        throw new Error(

          getErrorMessage(body, "The activity could not be saved.")

        );

      }

      setCustomerName("");

      setCustomerPhone("");

      setCustomerEmail("");

      setActivityType("CALL");

      setStatus("PENDING");

      setNotes("");

      setShowForm(false);

      setSuccessMessage("Activity saved successfully.");

      await loadDashboard();

    } catch (error) {

      setFormError(

        error instanceof Error

          ? error.message

          : "Something went wrong while saving the activity."

      );

    } finally {

      setSaving(false);

    }

  }

  async function handleLogout() {

    try {

      const response = await fetch("/api/auth/logout", {

        method: "POST",

      });

      if (!response.ok) {

        setPageError("Could not log out. Please try again.");

        return;

      }

      router.replace("/login");

      router.refresh();

    } catch {

      setPageError("Could not log out. Please check your connection.");

    }

  }

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl">

        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10 2xl:px-12">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#9F1239] text-white shadow-sm shadow-emerald-600/20">

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

              onClick={handleLogout}

              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--hover)]"

            >

              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">Log out</span>

            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto w-full px-4 py-7 sm:px-6 sm:py-9 lg:px-10 2xl:px-12">

        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#9F1239]">

              <Activity className="h-4 w-4" />

              Sales overview

            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">

              Your activity dashboard

            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">

              Keep track of customer conversations, restaurant visits, and

              follow-ups in one place.

            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button

              type="button"

              onClick={() => void loadDashboard(true)}

              disabled={loading || refreshing}

              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium transition hover:bg-[var(--hover)] disabled:opacity-50"

            >

              <RefreshCw

                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}

              />

              Refresh

            </button>

            <button

              type="button"

              onClick={() => {

                setShowForm((current) => !current);

                setFormError("");

                setSuccessMessage("");

              }}

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9F1239] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#881337]"

            >

              {showForm ? (

                <X className="h-4 w-4" />

              ) : (

                <Plus className="h-4 w-4" />

              )}

              {showForm ? "Close form" : "Add activity"}

            </button>

          </div>

        </section>

        {pageError && (

          <div

            role="alert"

            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"

          >

            <div className="flex items-start gap-2">

              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p>{pageError}</p>

            </div>

            <button

              type="button"

              onClick={() => void loadDashboard(true)}

              className="self-start font-semibold underline underline-offset-4 sm:self-auto"

            >

              Try again

            </button>

          </div>

        )}

        {successMessage && (

          <div

            role="status"

            aria-live="polite"

            className="fixed bottom-5 right-5 z-[80] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-xl shadow-slate-900/10"

          >

            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

            <p>{successMessage}</p>

            <button

              type="button"

              aria-label="Dismiss notification"

              onClick={() => setSuccessMessage("")}

              className="ml-1 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"

            >

              <X className="h-4 w-4" />

            </button>

          </div>

        )}

        {showForm && (

          <section className="crm-card mb-8 rounded-2xl p-5 sm:p-7">

            <div className="mb-6 flex items-start gap-3">

              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-[#9F1239]">

                <Plus className="h-5 w-5" />

              </div>

              <div>

                <h3 className="text-lg font-semibold">Record an activity</h3>

                <p className="mt-1 text-sm text-[var(--muted)]">

                  Add a customer interaction to your sales history.

                </p>

              </div>

            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label htmlFor="customerName" className="crm-label">

                    Customer / restaurant name

                  </label>

                  <input

                    id="customerName"

                    name="customerName"

                    type="text"

                    required

                    maxLength={120}

                    value={customerName}

                    onChange={(event) => setCustomerName(event.target.value)}

                    placeholder="e.g. Malabar Kitchen"

                    className="crm-input"

                  />

                  <p className="mt-1.5 text-xs text-[var(--muted)]">

                    Maximum 120 characters.

                  </p>

                </div>
                <div>
                  <label htmlFor="customerPhone" className="crm-label">
                    Contact phone <span className="font-normal text-[var(--muted)]">(optional)</span>
                  </label>
                  <input id="customerPhone" name="customerPhone" type="tel" autoComplete="tel" maxLength={30} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="e.g. +91 98765 43210" className="crm-input" />
                </div>
                <div>
                  <label htmlFor="customerEmail" className="crm-label">
                    Contact email <span className="font-normal text-[var(--muted)]">(optional)</span>
                  </label>
                  <input id="customerEmail" name="customerEmail" type="email" autoComplete="email" maxLength={254} value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="e.g. contact@restaurant.com" className="crm-input" />
                </div>

                <div>

                  <label htmlFor="activityType" className="crm-label">

                    Activity type

                  </label>

                  <div className="relative">

                    <select

                      id="activityType"

                      name="activityType"

                      value={activityType}

                      onChange={(event) =>

                        setActivityType(event.target.value as ActivityType)

                      }

                      className="crm-input appearance-none pr-10"

                    >

                      {ACTIVITY_TYPES.map((item) => (

                        <option key={item.value} value={item.value}>

                          {item.label}

                        </option>

                      ))}

                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                  </div>

                </div>

                <div>

                  <label htmlFor="status" className="crm-label">

                    Status

                  </label>

                  <div className="relative">

                    <select

                      id="status"

                      name="status"

                      value={status}

                      onChange={(event) =>

                        setStatus(event.target.value as ActivityStatus)

                      }

                      className="crm-input appearance-none pr-10"

                    >

                      {ACTIVITY_STATUSES.map((item) => (

                        <option key={item.value} value={item.value}>

                          {item.label}

                        </option>

                      ))}

                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                  </div>

                </div>

                <div>

                  <label htmlFor="notes" className="crm-label">

                    Notes <span className="font-normal text-[var(--muted)]">(optional)</span>

                  </label>

                  <textarea

                    id="notes"

                    name="notes"

                    rows={3}

                    maxLength={2000}

                    value={notes}

                    onChange={(event) => setNotes(event.target.value)}

                    placeholder="Discussed pricing, menu, or next steps..."

                    className="crm-input min-h-24 resize-y"

                  />

                  <p className="mt-1.5 text-right text-xs text-[var(--muted)]">

                    {notes.length}/2000

                  </p>

                </div>

              </div>

              {formError && (

                <div

                  role="alert"

                  className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300"

                >

                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  {formError}

                </div>

              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">

                <button

                  type="button"

                  onClick={() => {

                    setShowForm(false);

                    setFormError("");

                  }}

                  disabled={saving}

                  className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium transition hover:bg-[var(--hover)] disabled:opacity-50"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9F1239] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#881337] disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {saving ? (

                    <>

                      <LoaderCircle className="h-4 w-4 animate-spin" />

                      Saving activity...

                    </>

                  ) : (

                    <>

                      <Check className="h-4 w-4" />

                      Save activity

                    </>

                  )}

                </button>

              </div>

            </form>

          </section>

        )}

        <section aria-label="Sales statistics" className="mb-8">

          <div className="mb-4 flex items-center justify-between">

            <h3 className="text-base font-semibold">Activity summary</h3>

            <span className="text-xs text-[var(--muted)]">

              Live database counts

            </span>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard

              label="Total activities"

              value={stats.totalActivities}

              description="All recorded interactions"

              icon={<Activity className="h-5 w-5" />}

              accent="bg-[#9F1239]/10 text-[#9F1239]"

            />

            <StatCard

              label="Pending"

              value={stats.pendingActivities}

              description="Activities awaiting completion"

              icon={<Clock3 className="h-5 w-5" />}

              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"

            />

            <StatCard

              label="Completed"

              value={stats.completedActivities}

              description="Successfully completed activities"

              icon={<CheckCircle2 className="h-5 w-5" />}

              accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"

            />

            <StatCard

              label="Follow-ups"

              value={stats.followUpsRequired}

              description="Requiring another interaction"

              icon={<ArrowDownRight className="h-5 w-5" />}

              accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"

            />

          </div>

        </section>

        <section
          aria-label="Sales activity trend"
          className="crm-card mb-8 rounded-2xl p-5 sm:p-6 lg:p-7"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9F1239]">
                Sales activity trend
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">
                {trendRange === "7d" ? "Last 7 days" : trendRange === "30d" ? "Last 30 days" : "All time"}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {trendRange === "all" ? "Monthly activity history" : "Daily interactions recorded in your CRM"}
              </p>
            </div>
            <div
              className="inline-flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
              role="group"
              aria-label="Activity trend time range"
            >
              {([
                { value: "7d", label: "7 days" },
                { value: "30d", label: "30 days" },
                { value: "all", label: "All time" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={trendRange === option.value}
                  onClick={() => setTrendRange(option.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    trendRange === option.value
                      ? "bg-[#9F1239] text-white shadow-sm"
                      : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const points = stats.dailyActivityCounts;
            const maxCount = Math.max(1, ...points.map((point) => point.count));
            const width = 760;
            const height = 250;
            const left = 34;
            const right = 16;
            const top = 20;
            const bottom = 34;
            const plotWidth = width - left - right;
            const plotHeight = height - top - bottom;
            const x = (index: number) =>
              points.length <= 1
                ? left + plotWidth / 2
                : left + (index / (points.length - 1)) * plotWidth;
            const y = (count: number) => top + plotHeight - (count / maxCount) * plotHeight;
            const line = points
              .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.count)}`)
              .join(" ");
            const area = points.length
              ? `${line} L ${x(points.length - 1)} ${top + plotHeight} L ${x(0)} ${top + plotHeight} Z`
              : "";
            const labelIndexes =
              points.length <= 7
                ? points.map((_, index) => index)
                : [0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1]
                    .filter((value, index, array) => array.indexOf(value) === index);

            const labelFor = (dateValue: string) => {
              const date = new Date(`${dateValue}T12:00:00Z`);
              if (Number.isNaN(date.getTime())) return dateValue;
              return new Intl.DateTimeFormat(
                "en-IN",
                trendRange === "all"
                  ? { month: "short", year: "2-digit", timeZone: "UTC" }
                  : { day: "numeric", month: "short", timeZone: "UTC" },
              ).format(date);
            };

            return (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-[var(--muted)]">
                    {points.reduce((sum, point) => sum + point.count, 0).toLocaleString("en-IN")} activities in this period
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#9F1239]" />
                    Activities created
                  </span>
                </div>

                {points.length === 0 ? (
                  <div className="flex h-56 items-center justify-center rounded-xl bg-[var(--hover)] text-sm text-[var(--muted)]">
                    No activity data available yet.
                  </div>
                ) : (
                  <div className="w-full">
                    <svg
                      viewBox={`0 0 ${width} ${height}`}
                      role="img"
                      aria-label={`Line chart showing activity counts for ${
                        trendRange === "7d" ? "the last seven days" :
                        trendRange === "30d" ? "the last thirty days" : "all available months"
                      }`}
                      className="h-56 w-full overflow-visible"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {[0, 0.5, 1].map((fraction) => {
                        const gridY = top + plotHeight * fraction;
                        const value = Math.round(maxCount * (1 - fraction));
                        return (
                          <g key={fraction}>
                            <line
                              x1={left}
                              y1={gridY}
                              x2={width - right}
                              y2={gridY}
                              stroke="currentColor"
                              strokeOpacity="0.10"
                              strokeDasharray="4 5"
                            />
                            <text
                              x={left - 9}
                              y={gridY + 4}
                              textAnchor="end"
                              fontSize="11"
                              fill="currentColor"
                              opacity="0.6"
                            >
                              {value}
                            </text>
                          </g>
                        );
                      })}

                      <path d={area} fill="#9F1239" fillOpacity="0.10" />
                      <path
                        d={line}
                        fill="none"
                        stroke="#9F1239"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />

                      {points.map((point, index) => (
                        <circle
                          key={point.date}
                          cx={x(index)}
                          cy={y(point.count)}
                          r={points.length <= 30 ? 4 : 2.5}
                          fill="#9F1239"
                          stroke="var(--surface)"
                          strokeWidth="2"
                        >
                          <title>{`${labelFor(point.date)}: ${point.count} activities`}</title>
                        </circle>
                      ))}

                      {labelIndexes.map((index) => (
                        <text
                          key={points[index].date}
                          x={x(index)}
                          y={height - 8}
                          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                          fontSize="11"
                          fill="currentColor"
                          opacity="0.65"
                        >
                          {labelFor(points[index].date)}
                        </text>
                      ))}
                    </svg>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        <section className="crm-card overflow-hidden rounded-2xl">

          <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h3 className="text-lg font-semibold">Activities</h3>

              <p className="mt-1 text-sm text-[var(--muted)]">

                Review your latest customer interactions.

              </p>

            </div>

            <div className="space-y-3">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

                <div className="relative min-w-0">

                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                  <input

                    type="search"

                    aria-label="Search activities"

                    placeholder="Search customers or notes"

                    value={searchTerm}

                    onChange={(event) => setSearchTerm(event.target.value)}

                    className="crm-input crm-input-search"

                  />

                </div>

                <div className="relative min-w-0">

                  <select

                    aria-label="Filter activities by status"

                    value={statusFilter}

                    onChange={(event) => setStatusFilter(event.target.value)}

                    className="crm-input appearance-none pr-10"

                  >

                    <option value="ALL">All statuses</option>

                    {ACTIVITY_STATUSES.map((item) => (

                      <option key={item.value} value={item.value}>{item.label}</option>

                    ))}

                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                </div>

                <div className="relative min-w-0">

                  <select

                    aria-label="Filter activities by type"

                    value={activityTypeFilter}

                    onChange={(event) => setActivityTypeFilter(event.target.value)}

                    className="crm-input appearance-none pr-10"

                  >

                    <option value="ALL">All activity types</option>

                    {ACTIVITY_TYPES.map((item) => (

                      <option key={item.value} value={item.value}>{item.label}</option>

                    ))}

                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                </div>

                <button

                  type="button"

                  onClick={() => {

                    setSearchTerm("");

                    setDebouncedSearchTerm("");

                    setStatusFilter("ALL");

                    setActivityTypeFilter("ALL");

                    setDateFrom("");

                    setDateTo("");

                  }}

                  disabled={!searchTerm && !debouncedSearchTerm && statusFilter === "ALL" && activityTypeFilter === "ALL" && !dateFrom && !dateTo}

                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-medium transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-45"

                >

                  <RotateCcw className="h-4 w-4" />

                  Clear filters

                </button>

              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--muted)]">

                  Created from

                  <input

                    type="date"

                    aria-label="Filter activities from date"

                    value={dateFrom}

                    max={dateTo || undefined}

                    onChange={(event) => setDateFrom(event.target.value)}

                    className="crm-input"

                  />

                </label>

                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--muted)]">

                  Created to

                  <input

                    type="date"

                    aria-label="Filter activities to date"

                    value={dateTo}

                    min={dateFrom || undefined}

                    onChange={(event) => setDateTo(event.target.value)}

                    className="crm-input"

                  />

                </label>

              </div>

            </div>

          </div>

          {loading ? (

            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">

              <LoaderCircle className="h-7 w-7 animate-spin text-[#9F1239]" />

              <p className="text-sm text-[var(--muted)]">

                Loading your sales activities...

              </p>

            </div>

          ) : activities.length === 0 ? (

            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">

              <div className="mb-4 rounded-2xl bg-[var(--hover)] p-4 text-[var(--muted)]">

                {matchingActivityCount === 0 ? (

                  <Activity className="h-7 w-7" />

                ) : (

                  <Search className="h-7 w-7" />

                )}

              </div>

              <h4 className="font-semibold">

                {activities.length === 0

                  ? "No activities yet"

                  : "No matching activities"}

              </h4>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">

                {activities.length === 0

                  ? "Start by recording your first customer interaction. Your saved activities will appear here."

                  : "Try another search term or adjust your status, activity type, or date filters."}

              </p>

              {matchingActivityCount === 0 && !debouncedSearchTerm && statusFilter === "ALL" && (

                <button

                  type="button"

                  onClick={() => setShowForm(true)}

                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#9F1239] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#881337]"

                >

                  <Plus className="h-4 w-4" />

                  Add your first activity

                </button>

              )}

            </div>

          ) : (

            <>

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full text-left text-sm">

                  <thead className="bg-[var(--hover)] text-xs uppercase tracking-wide text-[var(--muted)]">

                    <tr>

                      <th className="px-6 py-4 font-medium">Customer</th>

                      <th className="px-6 py-4 font-medium">Activity</th>

                      <th className="px-6 py-4 font-medium">Status</th>

                      <th className="px-6 py-4 font-medium">Notes</th>

                      <th className="px-6 py-4 font-medium">Created</th>

                      {userRole === "admin" && <th className="px-4 py-4 text-right font-medium">Actions</th>}

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-[var(--border)]">

                    {activities.map((activity) => (

                      <tr

                        key={activity.id}

                        className="transition hover:bg-[var(--hover)]"

                      >

                        <td className="px-6 py-4">

                          <div className="min-w-0">
                            <span className="font-medium">{activity.customer_name}</span>
                            {activity.customer_phone && (
                              <a href={`tel:${activity.customer_phone}`} className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[#9F1239]">
                                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                                {activity.customer_phone}
                              </a>
                            )}
                            {activity.customer_email && (
                              <a href={`mailto:${activity.customer_email}`} className="mt-1 flex items-center gap-1.5 break-all text-xs text-[var(--muted)] hover:text-[#9F1239]">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {activity.customer_email}
                              </a>
                            )}
                          </div>

                        </td>

                        <td className="px-6 py-4">

                          <span className="inline-flex items-center gap-2 text-[var(--muted)]">

                            <TypeIcon type={activity.activity_type} />

                            {typeLabel(activity.activity_type)}

                          </span>

                        </td>

                        <td className="px-6 py-4">

                          <StatusBadge status={activity.status} />

                        </td>

                        <td className="max-w-64 px-6 py-4 text-[var(--muted)]">

                          {activity.notes ? (

                            <button

                              type="button"

                              onClick={() => setSelectedNote({ customerName: activity.customer_name, notes: activity.notes })}

                              className="line-clamp-2 w-full cursor-pointer whitespace-pre-wrap break-words text-left underline-offset-2 hover:text-[#9F1239] hover:underline"

                              aria-label={`Read full notes for ${activity.customer_name}`}

                              title="Click to read the full note"

                            >

                              {activity.notes}

                            </button>

                          ) : (

                            <span>—</span>

                          )}

                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-xs text-[var(--muted)]">

                          {formatDate(activity.created_at)}

                        </td>

                        {userRole === "admin" && (

                          <td className="px-4 py-3 text-right">

                            <button

                              type="button"

                              aria-label={`Actions for ${activity.customer_name}`}

                              aria-haspopup="menu"

                              onClick={(event) => openActivityMenu(event, activity)}

                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[#9F1239]"

                            >

                              <MoreHorizontal className="h-5 w-5" />

                            </button>

                          </td>

                        )}

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <div className="divide-y divide-[var(--border)] md:hidden">

                {activities.map((activity) => (

                  <article key={activity.id} className="space-y-3 p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h4 className="break-words font-semibold">

                          {activity.customer_name}

                        </h4>
                          {activity.customer_phone && (
                            <a href={`tel:${activity.customer_phone}`} className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[#9F1239]">
                              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                              {activity.customer_phone}
                            </a>
                          )}
                          {activity.customer_email && (
                            <a href={`mailto:${activity.customer_email}`} className="mt-1 flex items-center gap-1.5 break-all text-xs text-[var(--muted)] hover:text-[#9F1239]">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              {activity.customer_email}
                            </a>
                          )}

                        <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">

                          <TypeIcon type={activity.activity_type} />

                          {typeLabel(activity.activity_type)}

                        </p>

                      </div>

                      <div className="flex shrink-0 items-center gap-2">

                        <StatusBadge status={activity.status} />

                        {userRole === "admin" && (

                          <button

                            type="button"

                            aria-label={`Actions for ${activity.customer_name}`}

                            aria-haspopup="menu"

                            onClick={(event) => openActivityMenu(event, activity)}

                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[#9F1239]"

                          >

                            <MoreHorizontal className="h-5 w-5" />

                          </button>

                        )}

                      </div>

                    </div>

                    {activity.notes && (

                      <button

                        type="button"

                        onClick={() => setSelectedNote({ customerName: activity.customer_name, notes: activity.notes })}

                        className="line-clamp-2 w-full cursor-pointer break-words whitespace-pre-wrap text-left text-sm leading-6 text-[var(--muted)] hover:text-[#9F1239]"

                        aria-label={`Read full notes for ${activity.customer_name}`}

                        title="Tap to read the full note"

                      >

                        {activity.notes}

                      </button>

                    )}

                    <p className="text-xs text-[var(--muted)]">

                      {formatDate(activity.created_at)}

                    </p>

</article>

                ))}

              </div>

            </>

          )}

          {!loading && activities.length > 0 && (

            <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:justify-between sm:px-6">

              <p className="text-xs text-[var(--muted)]">

                Showing {activities.length} of {matchingActivityCount} matching activities

              </p>

              {hasMoreActivities && (

                <button

                  type="button"

                  onClick={() => void handleLoadMore()}

                  disabled={loadingMore || loading}

                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {loadingMore ? (

                    <>

                      <LoaderCircle className="h-4 w-4 animate-spin" />

                      Loading...

                    </>

                  ) : (

                    "Load more"

                  )}

                </button>

              )}

            </div>

          )}

        </section>

        {selectedNote && (

          <div

            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"

            onMouseDown={(event) => {

              if (event.target === event.currentTarget) setSelectedNote(null);

            }}

            role="presentation"

          >

            <section

              role="dialog"

              aria-modal="true"

              aria-labelledby="full-note-title"

              className="crm-card max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"

            >

              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">

                <div className="min-w-0">

                  <h3 id="full-note-title" className="text-lg font-semibold">Activity notes</h3>

                  <p className="mt-1 break-words text-sm text-[var(--muted)]">{selectedNote.customerName}</p>

                </div>

                <button

                  type="button"

                  onClick={() => setSelectedNote(null)}

                  aria-label="Close full note"

                  className="shrink-0 rounded-lg p-2 transition hover:bg-[var(--hover)]"

                >

                  <X className="h-5 w-5" />

                </button>

              </div>

              <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6">

                <p className="whitespace-pre-wrap break-words text-sm leading-7">{selectedNote.notes}</p>

              </div>

              <div className="flex justify-end border-t border-[var(--border)] p-4 sm:px-6">

                <button

                  type="button"

                  onClick={() => setSelectedNote(null)}

                  className="rounded-xl bg-[#9F1239] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#881337]"

                >

                  Close

                </button>

              </div>

            </section>

          </div>

        )}

        {deleteCandidate && userRole === "admin" && (

          <div

            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"

            role="presentation"

            onMouseDown={(event) => {

              if (event.target === event.currentTarget && !actingActivityId) setDeleteCandidate(null);

            }}

          >

            <section

              role="alertdialog"

              aria-modal="true"

              aria-labelledby="delete-activity-title"

              aria-describedby="delete-activity-description"

              className="crm-card w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"

            >

              <div className="p-6">

                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">

                    <Trash2 className="h-5 w-5" />

                  </div>

                  <div className="min-w-0">

                    <h3 id="delete-activity-title" className="text-lg font-semibold">Delete activity?</h3>

                    <p id="delete-activity-description" className="mt-2 text-sm leading-6 text-[var(--muted)]">

                      Are you sure you want to delete the activity for <span className="font-semibold text-[var(--foreground)]">{deleteCandidate.customer_name}</span>? This action cannot be undone.

                    </p>

                  </div>

                </div>

              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:justify-end sm:px-6">

                <button

                  type="button"

                  disabled={actingActivityId !== null}

                  onClick={() => setDeleteCandidate(null)}

                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--hover)] disabled:opacity-50"

                >

                  Cancel

                </button>

                <button

                  type="button"

                  disabled={actingActivityId !== null}

                  onClick={() => void handleActivityAction(deleteCandidate, "delete", undefined, true)}

                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {actingActivityId === deleteCandidate.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}

                  {actingActivityId === deleteCandidate.id ? "Deleting..." : "Delete activity"}

                </button>

              </div>

            </section>

          </div>

        )}

        {contextMenu && userRole === "admin" && (

          <>

            <button

              type="button"

              aria-label="Close activity menu"

              className="fixed inset-0 z-40 cursor-default"

              onClick={() => setContextMenu(null)}

            />

            <div

              role="menu"

              aria-label={`Actions for ${contextMenu.activity.customer_name}`}

              className="fixed z-50 min-w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-xl"

              style={{

                left: Math.min(contextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1024) - 220),

                top: Math.min(contextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 768) - 230),

              }}

              onContextMenu={(event) => event.preventDefault()}

            >

              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">

                Change status

              </p>

              {ACTIVITY_STATUSES.map((item) => (

                <button

                  key={item.value}

                  type="button"

                  role="menuitem"

                  disabled={actingActivityId !== null || contextMenu.activity.status === item.value}

                  onClick={() => void handleActivityAction(contextMenu.activity, "status", item.value)}

                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[#FFF1F2] disabled:cursor-default disabled:opacity-45"

                >

                  <span>{item.label}</span>

                  {contextMenu.activity.status === item.value && <Check className="h-4 w-4 text-[#9F1239]" />}

                </button>

              ))}

              <div className="my-1 border-t border-[var(--border)]" />

              <button

                type="button"

                role="menuitem"

                disabled={actingActivityId !== null}

                onClick={() => void handleActivityAction(contextMenu.activity, "delete")}

                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"

              >

                <Trash2 className="h-4 w-4" />

                Delete activity

              </button>

            </div>

          </>

        )}

        <footer className="flex flex-col gap-2 py-8 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">

          <p>FreeBees Sales CRM </p>

          <p className="flex items-center gap-1.5">

            <ShieldCheck className="h-3.5 w-3.5 text-[#9F1239]" />

            Protected team workspace

          </p>

        </footer>

      </div>

    </main>

  );

}
