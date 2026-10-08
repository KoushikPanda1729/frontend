import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CalendarDays } from "lucide-react";

const STATUS_VARIANT = { PENDING: "warning", APPROVED: "success", REJECTED: "destructive" };

export default function LeaveRequestPublic() {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [requests, setRequests] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function load() {
    api
      .publicLeaveInfo(employeeId)
      .then((data) => {
        setEmployee(data.employee);
        setRequests(data.requests);
      })
      .catch(() => setNotFound(true));
  }
  useEffect(load, [employeeId]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.submitLeaveRequest(employeeId, form);
      setForm({ startDate: "", endDate: "", reason: "" });
      setSubmitted(true);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground px-4">
        <p className="text-muted-foreground">This leave request link is invalid.</p>
      </div>
    );
  }

  if (!employee) return <div className="h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <div className="text-xs text-muted-foreground">Leave request</div>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-muted-foreground text-sm">
            {employee.employeeCode} {employee.designation ? `· ${employee.designation}` : ""}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request time off</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted && (
              <div className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">
                Request submitted. HR will review it and you'll see the status below once updated.
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="e.g. Family function, medical, personal..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Your requests
          </div>
          {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {new Date(r.startDate).toLocaleDateString()} &ndash; {new Date(r.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.reason}</div>
                  {r.reviewNote && <div className="text-xs text-muted-foreground mt-1">HR note: {r.reviewNote}</div>}
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
