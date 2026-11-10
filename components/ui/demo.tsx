"use client";

import ActivityHeatmap, {
  type ActivityDay,
} from "@/components/ui/activity-heatmap";
import { useMemo, useState } from "react";

function generateDays(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const end = new Date("2025-01-04T00:00:00Z");
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    const roll = rand();
    const count =
      roll > 0.72
        ? Math.floor(roll * 12)
        : roll > 0.4
          ? Math.floor(roll * 4)
          : 0;
    days.push({ date: new Date(t).toISOString().slice(0, 10), count });
  }
  return days;
}

export default function ActivityHeatmapDemo() {
  const days = useMemo(generateDays, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick stats computed from the dataset
  const activeDays = useMemo(
    () => days.filter((d) => d.count > 0).length,
    [days],
  );
  const totalCount = useMemo(
    () => days.reduce((acc, d) => acc + d.count, 0),
    [days],
  );

  return (
    <div className="w-full max-w-4xl p-6 md:p-10 font-sans">
      {/* Outer Card: rounded-2xl (16px) with p-6 (24px) padding following Rule 14 */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header with specific headline (Rule 9) & tabular numbers (Rule 18) */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Activity & Consistency
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Daily recorded activity across the trailing 12-month period
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Loading state toggle testing Rule 19 */}
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              onClick={() => setLoading((l) => !l)}
            >
              {loading ? "Show Live Data" : "Simulate Loading"}
            </button>
            {selected && (
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                onClick={() => setSelected(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Hero Feature: Heatmap (Rule 7) */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/40">
          <ActivityHeatmap
            days={days}
            label="Contributions in the last year"
            period="the last year"
            selectedDate={selected}
            onSelectDate={setSelected}
            loading={loading}
          />
        </div>

        {/* Footer Metrics with Tabular Numbers (Rule 18) and Grouped Spacing (Rule 8) */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Total Recorded
            </span>
            <p className="text-base font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-100">
              {totalCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Active Days
            </span>
            <p className="text-base font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-100">
              {activeDays} <span className="text-xs font-normal text-slate-400">/ 365</span>
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1 dark:bg-zinc-900/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Selected Day
            </span>
            <p className="text-base font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-100">
              {selected ?? "None"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
