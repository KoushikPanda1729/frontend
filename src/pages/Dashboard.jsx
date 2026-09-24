import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, UserCheck, CalendarClock, UserPlus } from "lucide-react";

const STAGE_LABELS = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ONBOARDING: "Onboarding",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.dashboardStats().then(setStats).catch(() => {});
  }, []);

  const cards = stats
    ? [
        { label: "Candidates", value: stats.candidateCount, icon: UserPlus },
        { label: "Employees", value: stats.employeeCount, icon: Users },
        { label: "Active Employees", value: stats.activeEmployees, icon: UserCheck },
        { label: "Upcoming Interviews", value: stats.interviewsUpcoming, icon: CalendarClock, to: "/calendar" },
      ]
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of hiring and workforce activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const card = (
            <Card className={c.to ? "hover:border-primary transition-colors" : undefined}>
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="text-2xl font-bold">{c.value}</div>
                </div>
                <c.icon className="h-6 w-6 text-primary" />
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

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/candidates">
          <Card className="hover:border-primary transition-colors h-full">
            <CardContent className="pt-5">
              <div className="font-semibold mb-1">Review the hiring pipeline</div>
              <p className="text-sm text-muted-foreground">Upload resumes, get AI scoring, and move candidates through interview stages.</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/assistant">
          <Card className="hover:border-primary transition-colors h-full">
            <CardContent className="pt-5">
              <div className="font-semibold mb-1">Ask the AI Assistant</div>
              <p className="text-sm text-muted-foreground">Draft job posts, interview questions, offer letters and policy text.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
