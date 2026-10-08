import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, UserCheck, CalendarClock, UserPlus, Plane, Cake, Award, FileWarning } from "lucide-react";

const STAGE_LABELS = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ONBOARDING: "Onboarding",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

function daysAwayLabel(d) {
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState({ birthdays: [], anniversaries: [] });
  const [expiringDocs, setExpiringDocs] = useState([]);

  useEffect(() => {
    api.dashboardStats().then(setStats).catch(() => {});
    api.upcomingDates().then(setUpcoming).catch(() => {});
    api.expiringDocuments().then(setExpiringDocs).catch(() => {});
  }, []);

  const cards = stats
    ? [
        { label: "Candidates", value: stats.candidateCount, icon: UserPlus, to: "/candidates" },
        { label: "Employees", value: stats.employeeCount, icon: Users, to: "/employees" },
        { label: "Active Employees", value: stats.activeEmployees, icon: UserCheck, to: "/employees" },
        { label: "Upcoming Interviews", value: stats.interviewsUpcoming, icon: CalendarClock, to: "/calendar" },
        { label: "Pending Leave Requests", value: stats.pendingLeaveRequests, icon: Plane, to: "/leave-requests" },
      ]
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of hiring and workforce activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const card = (
            <Card className={c.to ? "hover:border-primary hover:shadow-sm transition-all h-full" : "h-full"}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{c.label}</div>
                  <div className="text-2xl font-bold">{c.value}</div>
                </div>
              </CardContent>
            </Card>
          );
          return c.to ? (
            <Link key={c.label} to={c.to}>
              {card}
            </Link>
          ) : (
            <div key={c.label}>{card}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hiring pipeline by stage</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats || stats.byStage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {stats.byStage.map((s) => (
                <Link
                  key={s.stage}
                  to="/candidates"
                  className="rounded-md border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="text-xs text-muted-foreground">{STAGE_LABELS[s.stage] || s.stage}</div>
                  <div className="text-xl font-bold">{s.count}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(upcoming.birthdays.length > 0 || upcoming.anniversaries.length > 0 || expiringDocs.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          {upcoming.birthdays.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cake className="h-4 w-4" />Upcoming birthdays</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {upcoming.birthdays.map((b) => (
                  <Link key={b.id} to={`/employees/${b.id}`} className="flex items-center justify-between text-sm hover:text-primary">
                    <span>{b.name}</span>
                    <span className="text-xs text-muted-foreground">{daysAwayLabel(b.daysAway)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {upcoming.anniversaries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Work anniversaries</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {upcoming.anniversaries.map((a) => (
                  <Link key={a.id} to={`/employees/${a.id}`} className="flex items-center justify-between text-sm hover:text-primary">
                    <span>{a.name}</span>
                    <span className="text-xs text-muted-foreground">{daysAwayLabel(a.daysAway)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {expiringDocs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileWarning className="h-4 w-4" />Expiring documents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {expiringDocs.map((d) => (
                  <Link key={d.id} to={`/employees/${d.employee.id}`} className="flex items-center justify-between text-sm hover:text-primary">
                    <span>{d.employee.name} · {d.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(d.expiryDate).toLocaleDateString()}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/candidates">
          <Card className="hover:border-primary hover:shadow-sm transition-all h-full">
            <CardContent className="pt-5">
              <div className="font-semibold mb-1">Review the hiring pipeline</div>
              <p className="text-sm text-muted-foreground">Upload resumes, get AI scoring, and move candidates through interview stages.</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/assistant">
          <Card className="hover:border-primary hover:shadow-sm transition-all h-full">
            <CardContent className="pt-5">
              <div className="font-semibold mb-1">Ask the AI Assistant</div>
              <p className="text-sm text-muted-foreground">Draft job posts, interview questions, offer letters and policy text.</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/sheets">
          <Card className="hover:border-primary hover:shadow-sm transition-all h-full">
            <CardContent className="pt-5">
              <div className="font-semibold mb-1">Open your Sheets</div>
              <p className="text-sm text-muted-foreground">Payroll trackers, checklists and logs — real Google Sheets, right inside the app.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
