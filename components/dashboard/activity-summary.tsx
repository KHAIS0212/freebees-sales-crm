
import { Activity, ArrowDownRight, CheckCircle2, Clock3 } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import type { DashboardStats } from "@/features/dashboard/dashboard.types";

type ActivitySummaryProps = {
  stats: DashboardStats;
};

export function ActivitySummary({ stats }: ActivitySummaryProps) {
  return (
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
  );
}
