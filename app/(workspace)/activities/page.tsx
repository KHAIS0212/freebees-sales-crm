"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useWorkspaceRole } from "@/components/dashboard/workspace-role-context";
import type {
  ActivityType,
  ActivityStatus,
  SalesActivity,
} from "@/features/activities/activity.types";

import {
  PAGE_SIZE,
} from "@/features/activities/activity.constants";

import { ActivityFilters } from "@/components/activities/activity-filters";
import { ActivityTable } from "@/components/activities/activity-table";
import { ActivityListMobile } from "@/components/activities/activity-list-mobile";
import { ActivitySectionHeader } from "@/components/activities/activity-section-header";
import { ActivityEmptyState } from "@/components/activities/activity-empty-state";
import { ActivityLoadingState } from "@/components/activities/activity-loading-state";
import { ActivityPagination } from "@/components/activities/activity-pagination";
import ActivityForm from "@/components/activities/activity-form";
import { ActivityNotesModal } from "@/components/activities/activity-notes-modal";
import { DeleteActivityModal } from "@/components/activities/delete-activity-modal";
import { ActivityContextMenu } from "@/components/activities/activity-context-menu";
import { PageFeedback } from "@/components/dashboard/page-feedback";

type BranchAction = "use_existing" | "create_branch";
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

function getErrorMessage(
  body: ApiResponse<unknown>,
  fallback: string,
) {
  return body.error || body.message || fallback;
}

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [selectedNote, setSelectedNote] = useState<{
    customerName: string;
    notes: string;
  } | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<SalesActivity | null>(null);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [matchingActivityCount, setMatchingActivityCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activityTypeFilter, setActivityTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const userRole = useWorkspaceRole();  const [actingActivityId, setActingActivityId] =
    useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    activity: SalesActivity;
    x: number;
    y: number;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [customerLocation, setCustomerLocation] = useState("");
  const [activityType, setActivityType] =
    useState<ActivityType>("CALL");
  const [status, setStatus] =
    useState<ActivityStatus>("PENDING");
  const [notes, setNotes] = useState("");

  const activitiesRequestController = useRef<AbortController | null>(null);
  const loadMoreRequestController = useRef<AbortController | null>(null);
  const loadActivities = useCallback(async () => {
    // Cancel pagination before replacing the list with a new filter/search result.
    loadMoreRequestController.current?.abort();
    loadMoreRequestController.current = null;
    setLoadingMore(false);
    activitiesRequestController.current?.abort();
    const controller = new AbortController();
    activitiesRequestController.current = controller;

    setLoading(true);
    setPageError("");
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: "0",
      });
      if (debouncedSearchTerm.trim()) {
        params.set("q", debouncedSearchTerm.trim());
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (activityTypeFilter !== "ALL") {
        params.set("activityType", activityTypeFilter);
      }
      if (dateFrom) {
        params.set("from", dateFrom);
      }
      if (dateTo) {
        params.set("to", dateTo);
      }
      const response = await fetch(
        `/api/activities?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        throw new Error(
          "Your account does not have active team access. Please contact your administrator.",
        );
      }
      const body =
        (await response.json()) as ApiResponse<SalesActivity[]>;
      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Could not load activities."),
        );
      }
      if (!Array.isArray(body.data)) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }
      setActivities(body.data);
      setMatchingActivityCount(
        body.pagination?.total ?? body.data.length,
      );
      setHasMoreActivities(body.pagination?.hasMore ?? false);
    } catch (error) {
      // Aborted requests are expected when search terms or filters change.
      if (controller.signal.aborted) return;

      setPageError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading activities.",
      );
    } finally {
      // An older request must not clear the loading state for a newer request.
      if (activitiesRequestController.current === controller) {
        activitiesRequestController.current = null;
        setLoading(false);
      }
    }
  }, [
    router,
    debouncedSearchTerm,
    statusFilter,
    activityTypeFilter,
    dateFrom,
    dateTo,
  ]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

  return () => window.clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(
      () => setSuccessMessage(""),
      3500,
    );

  return () => window.clearTimeout(timer);
  }, [successMessage]);
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelectedNote(null);
      setDeleteCandidate(null);
      setContextMenu(null);
      if (!saving) {
        setShowForm(false);
      }
    }
    window.addEventListener("keydown", handleEscape);

  return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [saving]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadActivities();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      activitiesRequestController.current?.abort();
      loadMoreRequestController.current?.abort();
    };
  }, [loadActivities]);

  async function handleLoadMore() {
    if (
      loadingMore ||
      !hasMoreActivities ||
      loadMoreRequestController.current
    ) {
      return;
    }

    const controller = new AbortController();
    loadMoreRequestController.current = controller;

    setLoadingMore(true);
    setPageError("");

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(activities.length),
      });

      if (debouncedSearchTerm.trim()) {
        params.set("q", debouncedSearchTerm.trim());
      }

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (activityTypeFilter !== "ALL") {
        params.set("activityType", activityTypeFilter);
      }

      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const response = await fetch(
        `/api/activities?${params.toString()}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) return;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Your account does not have active team access.",
        );
      }

      const body =
        (await response.json()) as ApiResponse<SalesActivity[]>;

      if (
        controller.signal.aborted ||
        loadMoreRequestController.current !== controller
      ) {
        return;
      }

      if (!response.ok || !Array.isArray(body.data)) {
        throw new Error(
          getErrorMessage(body, "Could not load more activities."),
        );
      }

      setActivities((current) => {
        const knownIds = new Set(
          current.map((activity) => activity.id),
        );

        return [
          ...current,
          ...body.data!.filter(
            (activity) => !knownIds.has(activity.id),
          ),
        ];
      });

      setMatchingActivityCount(
        body.pagination?.total ?? matchingActivityCount,
      );

      setHasMoreActivities(body.pagination?.hasMore ?? false);
    } catch (error) {
      if (controller.signal.aborted) return;

      setPageError(
        error instanceof Error
          ? error.message
          : "Could not load more activities.",
      );
    } finally {
      if (loadMoreRequestController.current === controller) {
        loadMoreRequestController.current = null;
        setLoadingMore(false);
      }
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
    if (
      action === "status" &&
      (!nextStatus || nextStatus === activity.status)
    ) {
      return;
    }
    if (action === "delete" && !confirmedDelete) {
      setDeleteCandidate(activity);
      return;
    }
    setActingActivityId(activity.id);
    setPageError("");
    setSuccessMessage("");
    try {
      const response =
        action === "status"
          ? await fetch("/api/activities", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: activity.id,
                status: nextStatus,
              }),
            })
          : await fetch(
              `/api/activities?id=${encodeURIComponent(activity.id)}`,
              { method: "DELETE" },
            );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const body =
        (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body,
            action === "status"
              ? "Could not update the activity status."
              : "Could not delete the activity.",
          ),
        );
      }
      if (action === "delete") {
        setDeleteCandidate(null);
        // Remove the deleted activity without reloading the list.
        setActivities((current) =>
          current.filter((item) => item.id !== activity.id),
        );
        // Keep the total matching count in sync.
        setMatchingActivityCount((current) =>
          Math.max(0, current - 1),
        );
      } else {
        if (!body.data || !nextStatus) {
          throw new Error(
            "The server returned an unexpected response.",
          );
        }
        const updatedActivity =
          body.data as SalesActivity;
        setActivities((current) => {
          if (
            statusFilter !== "ALL" &&
            updatedActivity.status !== statusFilter
          ) {
            return current.filter(
              (item) => item.id !== updatedActivity.id,
            );
          }
          return current.map((item) =>
            item.id === updatedActivity.id
              ? {
                  ...item,
                  ...updatedActivity,
                }
              : item,
          );
        });
        if (
          statusFilter !== "ALL" &&
          updatedActivity.status !== statusFilter
        ) {
          setMatchingActivityCount((current) =>
            Math.max(0, current - 1),
          );
        }
      }
    }catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the activity.",
      );
    } finally {
      setActingActivityId(null);
    }
  }

  function openActivityMenu(
    event: React.MouseEvent,
    activity: SalesActivity,
  ) {
    if (userRole !== "admin") return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({
      activity,
      x: Math.max(
        8,
        Math.min(rect.right - 208, window.innerWidth - 216),
      ),
      y: Math.max(
        8,
        Math.min(rect.bottom + 4, window.innerHeight - 240),
      ),
    });
  }

  async function handleSubmit(branchAction?: BranchAction) {
    setFormError("");
    setSuccessMessage("");
    const trimmedName = customerName.trim();
    const trimmedNotes = notes.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedEmail = customerEmail.trim();
    if (!trimmedName) {
      setFormError(
        "Please enter a customer or restaurant name.",
      );
      return;
    }
    if (trimmedName.length > 120) {
      setFormError("The name must not exceed 120 characters.");
      return;
    }
    if (trimmedPhone.length > 30) {
      setFormError(
        "Phone number must not exceed 30 characters.",
      );
      return;
    }
    if (
      trimmedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (trimmedEmail.length > 254) {
      setFormError(
        "Email address must not exceed 254 characters.",
      );
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            customerName: trimmedName,
            customerPhone: trimmedPhone,
            customerEmail: trimmedEmail,
            customerId,
            brandId,
            customerLocation: customerLocation.trim(),
            branchAction,
            activityType,
            status,
            notes: trimmedNotes,
          }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const body =
        (await response.json()) as ApiResponse<SalesActivity>;
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "Your account does not have active team access.",
          );
        }
        throw new Error(
          getErrorMessage(
            body,
            "The activity could not be saved.",
          ),
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
      setCustomerId(null);
      setBrandId(null);
      setCustomerLocation("");
      await loadActivities();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the activity.",
      );
    } finally {
      setSaving(false);
    }
  }



  return (
      <main className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto w-full px-4 py-7 sm:px-6 sm:py-9 lg:px-10 2xl:px-12">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#9F1239]">
                Sales workspace
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Activity Management
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
                Create, search, and manage customer activities and follow-ups.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm((current) => !current);
                setFormError("");
                setSuccessMessage("");
              }}
              className="w-fit rounded-lg bg-[#9F1239] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {showForm ? "Cancel" : "Add activity"}
            </button>
          </div>
          <PageFeedback
            pageError={pageError}
            successMessage={successMessage}
            onRetry={() => void loadActivities()}
            onDismissSuccess={() => setSuccessMessage("")}
          />
          {showForm && (
            <ActivityForm
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerEmail={customerEmail}
              setCustomerEmail={setCustomerEmail}
                customerId={customerId}
                setCustomerId={setCustomerId}
                brandId={brandId}
                setBrandId={setBrandId}
                customerLocation={customerLocation}
  setCustomerLocation={setCustomerLocation}
              activityType={activityType}
              setActivityType={setActivityType}
              status={status}
              setStatus={setStatus}
              notes={notes}
              setNotes={setNotes}
              formError={formError}
              saving={saving}
              handleSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setFormError("");
              }}
            />
          )}
          <section className="crm-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <ActivitySectionHeader />
              <ActivityFilters
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                activityTypeFilter={activityTypeFilter}
                onActivityTypeFilterChange={setActivityTypeFilter}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                debouncedSearchTerm={debouncedSearchTerm}
              />
            </div>
            {loading ? (
              <ActivityLoadingState />
            ) : activities.length === 0 ? (
              <ActivityEmptyState
                hasNoActivities={activities.length === 0}
                matchingActivityCount={matchingActivityCount}
                debouncedSearchTerm={debouncedSearchTerm}
                statusFilter={statusFilter}
              />
            ) : (
              <>
                <ActivityTable
                  activities={activities}
                  userRole={userRole}
                  onSelectNote={setSelectedNote}
                  onOpenActivityMenu={openActivityMenu}
                />
                <ActivityListMobile
                  activities={activities}
                  userRole={userRole}
                  onSelectNote={setSelectedNote}
                  onOpenActivityMenu={openActivityMenu}
                />
              </>
            )}
            {!loading && activities.length > 0 && (
              <ActivityPagination
                activityCount={activities.length}
                matchingActivityCount={matchingActivityCount}
                hasMoreActivities={hasMoreActivities}
                loadingMore={loadingMore}
                onLoadMore={() => void handleLoadMore()}
              />
            )}
          </section>
          {selectedNote && (
            <ActivityNotesModal
              customerName={selectedNote.customerName}
              notes={selectedNote.notes}
              onClose={() => setSelectedNote(null)}
            />
          )}
          {deleteCandidate && userRole === "admin" && (
            <DeleteActivityModal
              activity={deleteCandidate}
              actingActivityId={actingActivityId}
              onCancel={() => setDeleteCandidate(null)}
              onConfirm={() =>
                void handleActivityAction(
                  deleteCandidate,
                  "delete",
                  undefined,
                  true,
                )
              }
            />
          )}
          {contextMenu && userRole === "admin" && (
            <ActivityContextMenu
              activity={contextMenu.activity}
              x={contextMenu.x}
              y={contextMenu.y}
              actingActivityId={actingActivityId}
              onClose={() => setContextMenu(null)}
              onChangeStatus={(nextStatus) =>
                void handleActivityAction(
                  contextMenu.activity,
                  "status",
                  nextStatus,
                )
              }
              onDelete={() =>
                void handleActivityAction(
                  contextMenu.activity,
                  "delete",
                )
              }
            />
          )}
          <footer className="flex flex-col gap-2 py-8 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>FreeBees Sales CRM</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#9F1239]" />
              Protected team workspace
            </p>
          </footer>
        </div>
      </main>
  );
}
