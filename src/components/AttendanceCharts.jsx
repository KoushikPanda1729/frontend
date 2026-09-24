import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Table2, BarChart3 } from "lucide-react";
import { cn } from "../lib/utils";

export const STATUS_ORDER = ["PRESENT", "ABSENT", "LEAVE", "HALF_DAY", "HOLIDAY", "WEEK_OFF"];

export const STATUS_META = {
  PRESENT: { label: "Present", var: "--att-present" },
  ABSENT: { label: "Absent", var: "--att-absent" },
  LEAVE: { label: "Leave", var: "--att-leave" },
  HALF_DAY: { label: "Half day", var: "--att-halfday" },
  HOLIDAY: { label: "Holiday", var: "--att-holiday" },
  WEEK_OFF: { label: "Week off", var: "--att-weekoff" },
};

export function Legend({ counts }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {STATUS_ORDER.map((key) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: `var(${STATUS_META[key].var})` }} />
          <span>
            {STATUS_META[key].label}: <span className="text-foreground font-medium">{counts[key] || 0}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

// Single horizontal stacked bar — the month's status breakdown as one glanceable shape.
export function MonthBar({ counts }) {
  const total = STATUS_ORDER.reduce((sum, k) => sum + (counts[k] || 0), 0);
  if (total === 0) return <div className="text-xs text-muted-foreground">No attendance marked yet this month.</div>;

  const segments = STATUS_ORDER.filter((k) => counts[k] > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-6 w-full rounded-full overflow-hidden gap-[2px] bg-secondary">
        {segments.map((key, i) => {
          const pct = ((counts[key] || 0) / total) * 100;
          const isLast = i === segments.length - 1;
          const isFirst = i === 0;
          return (
            <div
              key={key}
              role="img"
              aria-label={`${STATUS_META[key].label}: ${counts[key]} days`}
              title={`${STATUS_META[key].label}: ${counts[key]} days`}
              className={cn("h-full transition-opacity hover:opacity-80", isFirst && "rounded-l-full", isLast && "rounded-r-full")}
              style={{ width: `${pct}%`, backgroundColor: `var(${STATUS_META[key].var})` }}
            />
          );
        })}
      </div>
      <Legend counts={counts} />
    </div>
  );
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// Year-wide stacked bar chart, one bar per month, plus headline stat tiles and a table fallback.
export function YearOverview({ employeeId }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [monthsData, setMonthsData] = useState(null);
  const [hover, setHover] = useState(null); // { monthIdx, status, count, x, y }
  const [tableView, setTableView] = useState(false);

  useEffect(() => {
    setMonthsData(null);
    Promise.all(
      Array.from({ length: 12 }, (_, m) => api.attendance(employeeId, monthKey(year, m)))
    ).then((results) => {
      setMonthsData(
        results.map((records) => {
          const counts = {};
          for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
          return counts;
        })
      );
    });
  }, [employeeId, year]);

  const totals = useMemo(() => {
    if (!monthsData) return {};
    const t = {};
    for (const counts of monthsData) {
      for (const key of STATUS_ORDER) t[key] = (t[key] || 0) + (counts[key] || 0);
    }
    return t;
  }, [monthsData]);

  const maxDay = 31;
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">{year}</span>
          <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTableView((v) => !v)}>
          {tableView ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          {tableView ? "Chart view" : "Table view"}
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUS_ORDER.map((key) => (
          <div key={key} className="border border-border rounded-md p-2.5 text-center">
            <div className="text-xs text-muted-foreground">{STATUS_META[key].label}</div>
            <div className="text-lg font-semibold" style={{ color: `var(${STATUS_META[key].var})` }}>
              {totals[key] || 0}
            </div>
          </div>
        ))}
      </div>

      {!monthsData ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading year data...</div>
      ) : tableView ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 pr-2 font-medium text-muted-foreground">Month</th>
                {STATUS_ORDER.map((key) => (
                  <th key={key} className="text-right py-1.5 px-2 font-medium text-muted-foreground">
                    {STATUS_META[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthLabels.map((label, i) => (
                <tr key={label} className="border-b border-border/60">
                  <td className="py-1.5 pr-2">{label}</td>
                  {STATUS_ORDER.map((key) => (
                    <td key={key} className="text-right py-1.5 px-2 tabular-nums">
                      {monthsData[i][key] || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-end gap-2 h-40">
            {monthLabels.map((label, i) => {
              const counts = monthsData[i];
              const segments = STATUS_ORDER.filter((k) => counts[k] > 0);
              const total = segments.reduce((s, k) => s + counts[k], 0);
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="flex-1 w-full flex flex-col-reverse gap-[2px]" style={{ maxHeight: "100%" }}>
                    {segments.map((key, si) => {
                      const heightPct = (counts[key] / maxDay) * 100;
                      const isTop = si === segments.length - 1;
                      return (
                        <div
                          key={key}
                          tabIndex={0}
                          onMouseEnter={(e) =>
                            setHover({ month: label, status: key, count: counts[key], rect: e.currentTarget.getBoundingClientRect() })
                          }
                          onFocus={(e) =>
                            setHover({ month: label, status: key, count: counts[key], rect: e.currentTarget.getBoundingClientRect() })
                          }
                          onMouseLeave={() => setHover(null)}
                          onBlur={() => setHover(null)}
                          className={cn("w-full transition-opacity hover:opacity-80 cursor-default", isTop && "rounded-t-[4px]")}
                          style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: `var(${STATUS_META[key].var})` }}
                        />
                      );
                    })}
                  </div>
                  {total === 0 && <div className="w-full flex-1" />}
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>

          {hover && (
            <div
              className="fixed z-50 bg-popover border border-border rounded-md shadow-lg px-2.5 py-1.5 text-xs pointer-events-none"
              style={{ left: hover.rect.left + hover.rect.width / 2, top: hover.rect.top - 8, transform: "translate(-50%, -100%)" }}
            >
              <div className="font-semibold">{hover.count} {hover.count === 1 ? "day" : "days"}</div>
              <div className="text-muted-foreground">{STATUS_META[hover.status].label} &middot; {hover.month} {year}</div>
            </div>
          )}

          <Legend counts={totals} />
        </div>
      )}
    </div>
  );
}
