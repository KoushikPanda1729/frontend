import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { STATUS_META, MonthBar, YearOverview } from "./AttendanceCharts";
import { cn } from "../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendanceCalendar({ employeeId }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [records, setRecords] = useState([]);
  const [editDate, setEditDate] = useState(null);
  const [editStatus, setEditStatus] = useState("PRESENT");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.attendance(employeeId, monthKey(monthCursor)).then(setRecords).catch(() => {});
  }
  useEffect(load, [employeeId, monthCursor]);

  const recordByDate = Object.fromEntries(records.map((r) => [r.date.slice(0, 10), r]));

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  function openDay(day) {
    const d = new Date(year, month, day);
    const key = isoDate(d);
    const existing = recordByDate[key];
    setEditDate(key);
    setEditStatus(existing?.status || "PRESENT");
    setEditNote(existing?.note || "");
  }

  async function saveDay() {
    setSaving(true);
    try {
      await api.markAttendance(employeeId, { date: editDate, status: editStatus, note: editNote });
      setEditDate(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function clearDay() {
    setSaving(true);
    try {
      await api.clearAttendance(employeeId, editDate);
      setEditDate(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="month">
          <TabsList>
            <TabsTrigger value="month">This month</TabsTrigger>
            <TabsTrigger value="year">Year overview</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="space-y-4">
            <div className="flex items-center justify-between">
              <MonthBar counts={summary} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-32 text-center">
                {monthCursor.toLocaleDateString([], { month: "long", year: "numeric" })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const key = isoDate(new Date(year, month, day));
                const record = recordByDate[key];
                const isToday = key === isoDate(new Date());
                return (
                  <button
                    key={i}
                    onClick={() => openDay(day)}
                    className={cn(
                      "aspect-square rounded-md border text-xs flex flex-col items-center justify-center gap-0.5 hover:border-primary transition-colors",
                      isToday ? "border-primary" : "border-border"
                    )}
                  >
                    <span>{day}</span>
                    {record && (
                      <span className="flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: `var(${STATUS_META[record.status].var})` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{STATUS_META[record.status].label}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="year">
            <YearOverview employeeId={employeeId} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={!!editDate} onOpenChange={(open) => !open && setEditDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDate &&
                new Date(editDate).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              placeholder="Note (optional)"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            {recordByDate[editDate] && (
              <Button type="button" variant="outline" onClick={clearDay} disabled={saving}>
                Clear
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveDay} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
