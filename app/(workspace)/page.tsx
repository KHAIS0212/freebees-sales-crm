
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import type { SalesActivity } from "@/features/activities/activity.types";
import type { DashboardStats } from "@/features/dashboard/dashboard.types";
import { EMPTY_STATS } from "@/features/dashboard/dashboard.constants";

import {
  ActivityTrendChart,
  type TrendRange,
} from "@/components/dashboard/activity-trend-chart";
import { ActivitySummary } from "@/components/dashboard/activity-summary";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PageFeedback } from "@/components/dashboard/page-feedback";
import { ActivityTable } from "@/components/activities/activity-table";
import { ActivityListMobile } from "@/components/activities/activity-list-mobile";
import { ActivityNotesModal } from "@/components/activities/activity-notes-modal";

type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

type SummaryResponse = Pick<
  DashboardStats,
  | "totalActivities"
  | "pendingActivities"
  | "completedActivities"
  | "followUpsRequired"
> & {
  latestActivities: SalesActivity[];
};

type TrendResponse = Pick<DashboardStats, "dailyActivityCounts"> & {
  trendRange: TrendRange;
};

function getErrorMessage(body: ApiResponse<unknown>, fallback: string) {
  return body.error || body.message || fallback;
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const summaryController = useRef<AbortController | null>(null);
  const trendController = useRef<AbortController | null>(null);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [selectedNote, setSelectedNote] = useState<{
    customerName: string;
    notes: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");

  const loadSummary = useCallback(
    async (showRefreshIndicator = false) => {
      summaryController.current?.abort();

      const controller = new AbortController();
      summaryController.current = controller;

      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setPageError("");

      try {
        const response = await fetch("/api/dashboard/summary", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

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
          (await response.json()) as ApiResponse<SummaryResponse>;

        if (!response.ok || !body.data) {
          throw new Error(
            getErrorMessage(body, "Could not load dashboard summary."),
          );
        }

        if (!Array.isArray(body.data.latestActivities)) {
          throw new Error("The server returned an unexpected summary response.");
        }

        const {
          totalActivities,
          pendingActivities,
          completedActivities,
          followUpsRequired,
          latestActivities,
        } = body.data;

        setActivities(latestActivities);

        setStats((current) => ({
          ...current,
          totalActivities,
          pendingActivities,
          completedActivities,
          followUpsRequired,
        }));
      } catch (error) {
        if (controller.signal.aborted) return;

        setPageError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the dashboard.",
        );
      } finally {
        if (summaryController.current === controller) {
          summaryController.current = null;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router],
  );

  const loadTrend = useCallback(
    async (range: TrendRange) => {
      trendController.current?.abort();

      const controller = new AbortController();
      trendController.current = controller;

      setPageError("");

      try {
        const response = await fetch(
          `/api/dashboard/trend?range=${encodeURIComponent(range)}`,
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
          (await response.json()) as ApiResponse<TrendResponse>;

        if (!response.ok || !body.data) {
          throw new Error(
            getErrorMessage(body, "Could not load activity trend."),
          );
        }

        if (!Array.isArray(body.data.dailyActivityCounts)) {
          throw new Error("The server returned an unexpected trend response.");
        }

        setStats((current) => ({
          ...current,
          dailyActivityCounts: body.data!.dailyActivityCounts,
        }));
      } catch (error) {
        if (controller.signal.aborted) return;

        setPageError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the activity trend.",
        );
      } finally {
        if (trendController.current === controller) {
          trendController.current = null;
        }
      }
    },
    [router],
  );

  
useEffect(() => {
  if (pathname !== "/") return;

  const timer = window.setTimeout(() => {
    void loadSummary(true);
    void loadTrend(trendRange);
  }, 0);

  return () => {
    window.clearTimeout(timer);
    summaryController.current?.abort();
    trendController.current?.abort();
  };
}, [pathname, loadSummary, loadTrend, trendRange]);


  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  function handleTrendRangeChange(range: TrendRange) {
    setTrendRange(range);
    void loadTrend(range);
  }

  

  return (
    <main className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full px-4 py-7 sm:px-6 sm:py-9 lg:px-10 2xl:px-12">
        <DashboardHeader />

        <PageFeedback
          pageError={pageError}
          successMessage={successMessage}
          onRetry={() => {
            void loadSummary(true);
            void loadTrend(trendRange);
          }}
          onDismissSuccess={() => setSuccessMessage("")}
        />

        <ActivitySummary stats={stats} />

        <ActivityTrendChart
          dailyActivityCounts={stats.dailyActivityCounts}
          trendRange={trendRange}
          onTrendRangeChange={handleTrendRangeChange}
        />

        <section className="crm-card mt-6 overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-2 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Recent Activities</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Your latest 10 recorded activities.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/activities")}
              className="w-fit rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--accent)]"
            >
              View all activities
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-[var(--muted)]">
              Loading recent activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-6 text-sm text-[var(--muted)]">
              No activities have been recorded yet. Visit Activity Management
              to create your first activity.
            </div>
          ) : (
            <>
              <ActivityTable
                activities={activities}
                userRole=""
                onSelectNote={(note) => setSelectedNote(note)}
                onOpenActivityMenu={() => {}}
              />

              <ActivityListMobile
                activities={activities}
                userRole=""
                onSelectNote={(note) => setSelectedNote(note)}
                onOpenActivityMenu={() => {}}
              />
            </>
          )}
        </section>

        {selectedNote && (
          <ActivityNotesModal
            customerName={selectedNote.customerName}
            notes={selectedNote.notes}
            onClose={() => setSelectedNote(null)}
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
