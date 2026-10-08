import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollText } from "lucide-react";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.auditLog().then(setLogs).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground text-sm">Who changed what, across the last 500 actions</p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <ScrollText className="h-8 w-8 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{l.actor}</span>{" "}
                  <span className="text-muted-foreground">{l.action}</span>
                  {l.detail && <span className="text-muted-foreground"> — {l.detail}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{l.entityType}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
