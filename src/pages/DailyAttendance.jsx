import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { STATUS_ORDER, STATUS_META } from "../components/AttendanceCharts";
import { cn } from "../lib/utils";
import { CheckCircle2, Users } from "lucide-react";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DailyAttendance() {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    setRows(null);
    api.attendanceDay(date).then(setRows).catch(() => {});
  }
  useEffect(load, [date]);

  function setStatus(employeeId, status) {
    setRows((prev) => prev.map((r) => (r.id === employeeId ? { ...r, status } : r)));
    setSaved(false);
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: "PRESENT" })));
    setSaved(false);
  }

  async function saveAll() {
    setSaving(true);
    try {
      const records = rows.filter((r) => r.status).map((r) => ({ employeeId: r.id, status: r.status }));
      await api.markAttendanceDay(date, records);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const markedCount = rows?.filter((r) => r.status).length || 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-muted-foreground text-sm">Mark everyone for one day in a single pass</p>
        </div>
        <Input type="date" className="w-[180px]" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {rows && rows.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            <CheckCircle2 className="h-4 w-4" />Mark all present
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{markedCount}/{rows.length} marked</span>
            <Button onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved" : "Save all"}
            </Button>
          </div>
        </div>
      )}

      {rows === null && <p className="text-sm text-muted-foreground">Loading...</p>}

      {rows && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Users className="h-8 w-8 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No employees yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {rows?.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <Link to={`/employees/${r.id}`} className="min-w-0 hover:text-primary">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.employeeCode}{r.department ? ` · ${r.department}` : ""}
                </div>
              </Link>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r.id, s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      r.status === s ? "border-transparent text-white" : "border-border text-muted-foreground hover:border-primary"
                    )}
                    style={r.status === s ? { backgroundColor: `var(${STATUS_META[s].var})` } : undefined}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
