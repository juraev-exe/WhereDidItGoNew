"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import type { Variants } from "motion/react";

export interface ActivityDay {
  /** Calendar day as YYYY-MM-DD. */
  date: string;
  count: number;
}

/**
 * A contribution style calendar: one square per day, weeks as columns, with four accent tints for how busy a day was.
 * Use it when rhythm, streaks, and quiet weeks matter more than exact comparisons; use a bar chart when the exact
 * comparison is the point. Cells wave in once on view, a tooltip glides between cells on hover or keyboard focus, and a
 * new range recolors the grid in a sweep instead of redrawing it. Arrow keys move by day and week, Enter selects.
 */
export interface ActivityHeatmapProps {
  /** One entry per day, oldest first. Days missing inside the range count as zero. */
  days: ActivityDay[];
  /** Accessible name for the grid, such as "Contributions in 2025". */
  label: string;
  /** Finishes the summary line: "1,284 contributions in {period}". */
  period: string;
  /** Nouns for the count. */
  unit?: { one: string; other: string };
  /** Upper bounds for levels one to three; anything above the last is level four. Defaults to quarters of the busiest day. */
  thresholds?: [number, number, number];
  weekStartsOn?: 0 | 1;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  /** Controls beside the summary, such as a range switch. */
  actions?: ReactNode;
  /** Formatting locale. Fixed by default so server and client render the same labels. */
  locale?: string;
  className?: string;
}

type Model = {
  start: number;
  length: number;
  lead: number;
  weeks: number;
  total: number;
  counts: number[];
  levels: number[];
  thresholds: [number, number, number];
  months: { month: number; col: number; label: string }[];
  /** How many days in the range sit at each level. */
  perLevel: number[];
};

type Tip = {
  key: string;
  primary: string;
  secondary: string;
  value: number;
  anchor: HTMLElement;
};

/** How the tooltip text changes: rolls up or down with the count, crossfades on a tie, or appears at once when the bubble opens. */
type Change = 1 | -1 | 0 | "instant";

const DAY = 86_400_000;
const LEVELS = [0, 1, 2, 3, 4] as const;
const enter = [0.16, 1, 0.3, 1] as [number, number, number, number];
const standard = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Total wave travel in ms, kept under the system's stagger budget however many weeks the range spans. */
const WAVE = 420;
const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

function buildModel(
  days: ActivityDay[],
  weekStartsOn: 0 | 1,
  thresholds: [number, number, number] | undefined,
  locale: string,
): Model {
  const dates = days.map((day) => toUtc(day.date)).filter(Number.isFinite);
  const start = dates.length ? Math.min(...dates) : toUtc("2025-01-01");
  const length = dates.length
    ? Math.round((Math.max(...dates) - start) / DAY) + 1
    : 0;
  const counts = new Array<number>(length).fill(0);
  days.forEach((day) => {
    const index = Math.round((toUtc(day.date) - start) / DAY);
    if (index >= 0 && index < length) counts[index] += Math.max(0, day.count);
  });
  const max = counts.reduce((a, b) => Math.max(a, b), 0);
  const bounds =
    thresholds ??
    ([
      Math.max(1, Math.ceil(max * 0.25)),
      Math.max(2, Math.ceil(max * 0.5)),
      Math.max(3, Math.ceil(max * 0.75)),
    ] as [number, number, number]);
  const levels = counts.map((count) =>
    count <= 0
      ? 0
      : count <= bounds[0]
        ? 1
        : count <= bounds[1]
          ? 2
          : count <= bounds[2]
            ? 3
            : 4,
  );
  const lead = (new Date(start).getUTCDay() - weekStartsOn + 7) % 7;
  const weeks = Math.ceil((lead + length) / 7);
  const monthName = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });
  const months: Model["months"] = [];
  for (let index = 0; index < length; index++) {
    const date = new Date(start + index * DAY);
    if (index === 0 || date.getUTCDate() === 1)
      months.push({
        month: date.getUTCFullYear() * 12 + date.getUTCMonth(),
        col: Math.floor((lead + index) / 7),
        label: monthName.format(date),
      });
  }
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();
  const perLevel = [0, 0, 0, 0, 0];
  levels.forEach((level) => perLevel[level]++);
  return {
    start,
    length,
    lead,
    weeks,
    total: counts.reduce((a, b) => a + b, 0),
    counts,
    levels,
    thresholds: bounds,
    months,
    perLevel,
  };
}

const CONTRIBUTIONS = { one: "contribution", other: "contributions" };
const noun = (count: number, unit: { one: string; other: string }) =>
  count === 1 ? unit.one : unit.other;
const noopSubscribe = () => () => {};

function useReducedMotionSafe() {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const reduced = useReducedMotion();
  return hydrated && !!reduced;
}

const tipText = (reduced: boolean): Variants => ({
  from: (change: Change) =>
    change === "instant"
      ? { opacity: 1, y: "0em", filter: "blur(0px)" }
      : reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            y: `${0.3 * (change || 1)}em`,
            filter: `blur(${change ? 4 : 2}px)`,
          },
  to: { opacity: 1, y: "0em", filter: "blur(0px)" },
  gone: (change: Change) =>
    change === "instant" || reduced
      ? { opacity: 0, transition: { duration: 0 } }
      : {
          opacity: 0,
          y: `${-0.3 * (change || 1)}em`,
          filter: "blur(2px)",
          transition: { duration: 0.12, ease: standard },
        },
});

export function ActivityHeatmap({
  days,
  label,
  period,
  unit: unitProp = CONTRIBUTIONS,
  thresholds,
  weekStartsOn = 0,
  selectedDate = null,
  onSelectDate,
  actions,
  locale = "en-US",
  className,
}: ActivityHeatmapProps) {
  const reduced = useReducedMotionSafe();
  const id = useId();
  const unit = useMemo(
    () => ({ one: unitProp.one, other: unitProp.other }),
    [unitProp.one, unitProp.other],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(plotRef, { once: true, amount: 0.35 });

  const model = useMemo(
    () => buildModel(days, weekStartsOn, thresholds, locale),
    [days, weekStartsOn, thresholds, locale],
  );

  const formats = useMemo(
    () => ({
      long: new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
      short: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
      weekday: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "UTC",
      }),
      number: new Intl.NumberFormat(locale),
    }),
    [locale],
  );

  const [preview, setPreview] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const highlight = preview ?? pinned;

  const [tip, setTip] = useState<Tip | null>(null);
  const [open, setOpen] = useState(false);
  const tipX = useMotionValue(0);
  const tipY = useMotionValue(0);

  const selectedIndex = selectedDate
    ? Math.round((toUtc(selectedDate) - model.start) / DAY)
    : -1;

  return (
    <div
      ref={rootRef}
      className={`activity-heatmap-root relative flex flex-col gap-3 font-sans ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          <span className="font-semibold">{formats.number.format(model.total)}</span>{" "}
          {noun(model.total, unit)} in {period}
        </p>
        {actions && <div>{actions}</div>}
      </div>

      <div ref={scrollerRef} className="overflow-x-auto pb-2">
        <div ref={plotRef} className="inline-flex flex-col gap-1">
          <div className="flex gap-1">
            {Array.from({ length: model.weeks }, (_, col) => (
              <div key={col} className="flex flex-col gap-1">
                {Array.from({ length: 7 }, (_, row) => {
                  const index = col * 7 + row - model.lead;
                  const inRange = index >= 0 && index < model.length;
                  if (!inRange) {
                    return (
                      <span
                        key={row}
                        className="w-3.5 h-3.5 rounded-sm opacity-0"
                      />
                    );
                  }
                  const count = model.counts[index];
                  const level = model.levels[index];
                  const isSelected = index === selectedIndex;
                  const date = new Date(model.start + index * DAY);
                  const isHighlighted =
                    highlight === null || highlight === level;

                  const levelClasses = [
                    "bg-slate-100 dark:bg-zinc-800",
                    "bg-emerald-200 dark:bg-emerald-950",
                    "bg-emerald-400 dark:bg-emerald-800",
                    "bg-emerald-500 dark:bg-emerald-600",
                    "bg-emerald-600 dark:bg-emerald-400",
                  ];

                  return (
                    <button
                      key={row}
                      type="button"
                      aria-label={`${count} ${noun(count, unit)}, ${formats.short.format(date)}`}
                      className={`w-3.5 h-3.5 rounded-sm transition-all duration-150 cursor-pointer ${
                        levelClasses[level]
                      } ${isSelected ? "ring-2 ring-emerald-500 ring-offset-1" : ""} ${
                        !isHighlighted ? "opacity-30" : "opacity-100"
                      }`}
                      onClick={() => onSelectDate?.(toIso(date.getTime()))}
                      onMouseEnter={(e) => {
                        const cell = e.currentTarget;
                        const box = rootRef.current?.getBoundingClientRect();
                        const rect = cell.getBoundingClientRect();
                        if (box) {
                          tipX.set(rect.left - box.left + rect.width / 2);
                          tipY.set(rect.top - box.top);
                        }
                        setTip({
                          key: toIso(date.getTime()),
                          primary: `${formats.number.format(count)} ${noun(count, unit)}`,
                          secondary: formats.short.format(date),
                          value: count,
                          anchor: cell,
                        });
                        setOpen(true);
                      }}
                      onMouseLeave={() => setOpen(false)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span>Less</span>
        <div className="flex items-center gap-1">
          {LEVELS.map((level) => {
            const levelClasses = [
              "bg-slate-100 dark:bg-zinc-800",
              "bg-emerald-200 dark:bg-emerald-950",
              "bg-emerald-400 dark:bg-emerald-800",
              "bg-emerald-500 dark:bg-emerald-600",
              "bg-emerald-600 dark:bg-emerald-400",
            ];
            return (
              <button
                key={level}
                type="button"
                className={`w-3 h-3 rounded-xs cursor-pointer ${levelClasses[level]} ${
                  pinned === level ? "ring-1 ring-emerald-500" : ""
                }`}
                onClick={() =>
                  setPinned((current) => (current === level ? null : level))
                }
                onMouseEnter={() => setPreview(level)}
                onMouseLeave={() => setPreview(null)}
              />
            );
          })}
        </div>
        <span>More</span>
      </div>

      {open && tip && (
        <motion.div
          className="absolute pointer-events-none z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-1.5 rounded-md shadow-lg text-xs"
          style={{
            left: tipX,
            top: tipY,
            transform: "translate(-50%, -120%)",
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div className="font-semibold">{tip.primary}</div>
          <div className="text-[10px] opacity-75">{tip.secondary}</div>
        </motion.div>
      )}
    </div>
  );
}

export default ActivityHeatmap;
