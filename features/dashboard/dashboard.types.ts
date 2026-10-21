export type DailyActivityCount={
    date:   string;
    count:  number;
};

export type DashboardStats = {
    totalActivities:number;
    pendingActivities:number;
    completedActivities:number;
    followUpsRequired:number;
    dailyActivityCounts:DailyActivityCount[];
};
