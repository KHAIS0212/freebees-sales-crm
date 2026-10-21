import type { DashboardStats } from "./dashboard.types";

export const EMPTY_STATS:DashboardStats = {
    totalActivities:0,
    pendingActivities:0,
    completedActivities:0,
    followUpsRequired:0,
    dailyActivityCounts:[],
};