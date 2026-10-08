import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Check, X, CalendarDays } from "lucide-react";

const STATUS_VARIANT = { PENDING: "warning", APPROVED: "success", REJECTED: "destructive" };

function RequestCard({ r, onReviewed }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function review(status) {
    setBusy(true);
    try {
      await api.reviewLeaveRequest(r.id, { status, reviewNote: note || undefined });
      onReviewed();
    } finally {
      setBusy(false);
    }
  }

  const days = Math.round((new Date(r.endDate) - new Date(r.startDate)) / 86400000) + 1;

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to={`/employees/${r.employee.id}`} className="font-semibold hover:underline">
              {r.employee.name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {r.employee.employeeCode} {r.employee.designation ? `· ${r.employee.designation}` : ""}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
        </div>

        <div className="text-sm flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {new Date(r.startDate).toLocaleDateString()} &ndash; {new Date(r.endDate).toLocaleDateString()}
          <span className="text-muted-foreground">({days} day{days > 1 ? "s" : ""})</span>
        </div>
        <p className="text-sm text-muted-foreground">{r.reason}</p>
        {r.reviewNote && <p className="text-xs text-muted-foreground">HR note: {r.reviewNote}</p>}

        {r.status === "PENDING" && (
          <div className="space-y-2 pt-1">
            <Textarea
              rows={2}
              placeholder="Optional note for the employee..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => review("APPROVED")}>
                <Check className="h-4 w-4" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => review("REJECTED")}>
                <X className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestList({ status }) {
  const [requests, setRequests] = useState([]);

  function load() {
    api.leaveRequests(status).then(setRequests).catch(() => {});
  }
  useEffect(load, [status]);

  return (
    <div className="space-y-3">
      {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests here.</p>}
      {requests.map((r) => (
        <RequestCard key={r.id} r={r} onReviewed={load} />
      ))}
    </div>
  );
}

export default function LeaveRequests() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        <p className="text-muted-foreground text-sm">Submitted by employees via their personal request link</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><RequestList status="PENDING" /></TabsContent>
        <TabsContent value="approved"><RequestList status="APPROVED" /></TabsContent>
        <TabsContent value="rejected"><RequestList status="REJECTED" /></TabsContent>
      </Tabs>
    </div>
  );
}
