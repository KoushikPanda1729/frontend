import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { CalendarDays, User } from "lucide-react";

const STATUS_VARIANT = {
  SCHEDULED: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

function dayLabel(date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDay - startOfToday) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    api.candidates().then((candidates) => {
      const flat = candidates.flatMap((c) =>
        (c.interviews || []).map((iv) => ({ ...iv, candidate: c }))
      );
      flat.sort((a, b) => {
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return new Date(a.scheduledAt) - new Date(b.scheduledAt);
      });
      setInterviews(flat);
    });
  }, []);

  const withDate = interviews.filter((iv) => iv.scheduledAt);
  const noDate = interviews.filter((iv) => !iv.scheduledAt);

  const groups = [];
  let lastKey = null;
  for (const iv of withDate) {
    const d = new Date(iv.scheduledAt);
    const key = d.toDateString();
    if (key !== lastKey) {
      groups.push({ key, date: d, items: [] });
      lastKey = key;
    }
    groups[groups.length - 1].items.push(iv);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview Calendar</h1>
        <p className="text-muted-foreground text-sm">Every scheduled interview across all candidates, in order</p>
      </div>

      {interviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <CalendarDays className="h-8 w-8 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              {dayLabel(group.date)}
            </div>
            <div className="space-y-2">
              {group.items.map((iv) => (
                <Link key={iv.id} to={`/candidates/${iv.candidate.id}`}>
                  <Card className="hover:border-primary hover:shadow-sm transition-all">
                    <CardContent className="pt-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm">{iv.round}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {iv.candidate.name} &middot; {iv.candidate.roleAppliedFor}
                          {iv.interviewer ? ` · with ${iv.interviewer}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(iv.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <Badge variant={STATUS_VARIANT[iv.status] || "secondary"}>{iv.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {noDate.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-muted-foreground">
              No date set
            </div>
            <div className="space-y-2">
              {noDate.map((iv) => (
                <Link key={iv.id} to={`/candidates/${iv.candidate.id}`}>
                  <Card className="hover:border-primary hover:shadow-sm transition-all">
                    <CardContent className="pt-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm">{iv.round}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {iv.candidate.name} &middot; {iv.candidate.roleAppliedFor}
                        </div>
                      </div>
                      <Badge variant={STATUS_VARIANT[iv.status] || "secondary"}>{iv.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
