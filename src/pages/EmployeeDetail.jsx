import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import ConfirmDialog from "../components/ConfirmDialog";
import AttendanceCalendar from "../components/AttendanceCalendar";
import { ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";

const STATUSES = ["ONBOARDING", "ACTIVE", "INACTIVE", "EXITED"];

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [docDeleteTarget, setDocDeleteTarget] = useState(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState(false);
  const fileRef = useRef();

  function load() {
    api.employee(id).then(setEmployee).catch(() => {});
  }
  useEffect(load, [id]);

  async function onUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadDocument(id, file, file.name);
      load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changeStatus(status) {
    await api.updateEmployee(id, { status });
    load();
  }

  async function confirmRemoveDocument() {
    await api.deleteDocument(docDeleteTarget);
    setDocDeleteTarget(null);
    load();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await api.addEmployeeNote(id, { content: noteText });
    setNoteText("");
    load();
  }

  async function confirmRemoveEmployee() {
    await api.deleteEmployee(id);
    navigate("/employees");
  }

  if (!employee) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/employees")}>
        <ArrowLeft className="h-4 w-4" />Back to employees
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-muted-foreground text-sm">
            {employee.employeeCode} &middot; {employee.designation || "No designation"}
            {employee.department ? ` · ${employee.department}` : ""}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {employee.email} {employee.phone ? `· ${employee.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={employee.status} onValueChange={changeStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="icon" onClick={() => setConfirmDeleteEmployee(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AttendanceCalendar employeeId={id} />

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input ref={fileRef} type="file" className="hidden" onChange={onUpload} />
          <Button onClick={() => fileRef.current.click()} disabled={uploading} variant="outline">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload document"}
          </Button>
          <div className="space-y-2">
            {employee.documents?.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
            {employee.documents?.map((d) => (
              <div key={d.id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm">
                <button
                  onClick={() => api.downloadFile("document", d.id, d.name)}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {d.name}
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{new Date(d.uploadedAt).toLocaleDateString()}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => setDocDeleteTarget(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>HR notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addNote} className="flex gap-2">
            <Textarea
              rows={2}
              placeholder="Add a note about this employee..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>
          <div className="space-y-2">
            {employee.notes?.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            {employee.notes?.map((n) => (
              <div key={n.id} className="border border-border rounded-md p-3 text-sm">
                <p>{n.content}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {n.author} &middot; {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!docDeleteTarget}
        onOpenChange={(open) => !open && setDocDeleteTarget(null)}
        title="Delete this document?"
        description="This cannot be undone."
        onConfirm={confirmRemoveDocument}
      />
      <ConfirmDialog
        open={confirmDeleteEmployee}
        onOpenChange={setConfirmDeleteEmployee}
        title={`Delete employee ${employee.name}?`}
        description="This cannot be undone."
        onConfirm={confirmRemoveEmployee}
      />
    </div>
  );
}
