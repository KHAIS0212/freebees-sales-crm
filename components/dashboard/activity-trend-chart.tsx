
"use client";

import type { DailyActivityCount } from "@/features/dashboard/dashboard.types";

export type TrendRange =
  | "7d"
  | "30d"
  | "6m"
  | "9m"
  | "1y"
  | "2y"
  | "3y"
  | "4y"
  | "5y";

type ActivityTrendChartProps = {
  dailyActivityCounts: DailyActivityCount[];
  trendRange: TrendRange;
  onTrendRangeChange: (range: TrendRange) => void;
};

const RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "9m", label: "Last 9 months" },
  { value: "1y", label: "Last 1 year" },
  { value: "2y", label: "Last 2 years" },
  { value: "3y", label: "Last 3 years" },
  { value: "4y", label: "Last 4 years" },
  { value: "5y", label: "Last 5 years" },
];

function formatDate(dateValue: string, monthly: boolean) {
  const date = new Date(`${dateValue}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat("en-IN", {
    ...(monthly
      ? { month: "short", year: "2-digit" }
      : { day: "numeric", month: "short" }),
    timeZone: "UTC",
  }).format(date);
}

function getRangeLabel(range: TrendRange) {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label
    ?? "Last 7 days";
}

export function ActivityTrendChart({
  dailyActivityCounts,
  trendRange,
  onTrendRangeChange,
}: ActivityTrendChartProps) {
  const points = dailyActivityCounts;
  const isMonthly = !["7d", "30d"].includes(trendRange);
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

  const y = (count: number) =>
    top + plotHeight - (count / maxCount) * plotHeight;

  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.count)}`,
    )
    .join(" ");

  const area = points.length
    ? `${line} L ${x(points.length - 1)} ${top + plotHeight} L ${x(0)} ${top + plotHeight} Z`
    : "";

  const labelIndexes =
    points.length <= 7
      ? points.map((_, index) => index)
      : [
          0,
          Math.round((points.length - 1) / 3),
          Math.round(((points.length - 1) * 2) / 3),
          points.length - 1,
        ].filter(
          (value, index, array) => array.indexOf(value) === index,
        );

  const totalInPeriod = points.reduce(
    (sum, point) => sum + point.count,
    0,
  );

  return (
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
            {getRangeLabel(trendRange)}
          </h3>

          <p className="mt-1 text-sm text-[var(--muted)]">
            {isMonthly
              ? "Monthly activity totals"
              : "Daily interactions recorded in your CRM"}
          </p>
        </div>

        <label className="flex w-full flex-col gap-1.5 text-sm font-medium sm:w-52">
          <span className="text-[var(--muted)]">Time period</span>
          <select
            value={trendRange}
            onChange={(event) =>
              onTrendRangeChange(event.target.value as TrendRange)
            }
            aria-label="Activity trend time period"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/15"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-[var(--muted)]">
          {totalInPeriod.toLocaleString("en-IN")} activities in this period
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
            aria-label={`Line chart showing activity counts for ${getRangeLabel(trendRange).toLowerCase()}`}
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
                <title>
                  {`${formatDate(point.date, isMonthly)}: ${point.count} activities`}
                </title>
              </circle>
            ))}

            {labelIndexes.map((index) => (
              <text
                key={points[index].date}
                x={x(index)}
                y={height - 8}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                fontSize="11"
                fill="currentColor"
                opacity="0.65"
              >
                {formatDate(points[index].date, isMonthly)}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

