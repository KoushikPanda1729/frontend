import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose,
} from "../components/ui/sheet";
import ConfirmDialog from "../components/ConfirmDialog";
import AttendanceCalendar from "../components/AttendanceCalendar";
import {
  ArrowLeft, Trash2, Copy, Check, Pencil,
} from "lucide-react";

const STATUSES = ["ONBOARDING", "ACTIVE", "INACTIVE", "EXITED"];

function EditEmployeeSheet({ employee, onDone }) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function onOpenChange(next) {
    setOpen(next);
    if (next) {
      api.employees().then(setEmployees).catch(() => {});
      setForm({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        department: employee.department || "",
        designation: employee.designation || "",
        joinDate: employee.joinDate ? employee.joinDate.slice(0, 10) : "",
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
        salary: employee.salary || "",
        managerId: employee.managerId || "",
      });
      setError("");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.updateEmployee(employee.id, { ...form, managerId: form.managerId || "" });
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline"><Pencil className="h-4 w-4" />Edit</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>Edit employee</SheetTitle></SheetHeader>
        {form && (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Join date</Label>
                <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Monthly salary</Label>
              <Input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reports to</Label>
              <Select value={form.managerId || "none"} onValueChange={(v) => setForm({ ...form, managerId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {employees.filter((e) => e.id !== employee.id).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <div className="text-destructive text-sm">{error}</div>}
            <SheetFooter>
              <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function load() {
    api.employee(id).then(setEmployee).catch(() => {});
  }
  useEffect(load, [id]);

  async function changeStatus(status) {
    await api.updateEmployee(id, { status });
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

  function copyLeaveLink() {
    const url = `${window.location.origin}/leave-request/${id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
          {employee.manager && (
            <p className="text-muted-foreground text-xs mt-1">Reports to {employee.manager.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EditEmployeeSheet employee={employee} onDone={load} />
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

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Leave request link</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Send this link to {employee.name.split(" ")[0]} — they can submit time-off requests without logging in.
                Approved requests automatically mark those days as leave in attendance.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate text-xs bg-secondary rounded-md px-3 py-2">
                  {window.location.origin}/leave-request/{id}
                </code>
                <Button variant="outline" size="sm" onClick={copyLeaveLink}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {linkCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {employee.reports?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Direct reports</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {employee.reports.map((r) => (
                  <div key={r.id} className="text-sm border border-border rounded-md px-3 py-2">
                    {r.name} {r.designation && <span className="text-muted-foreground">· {r.designation}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceCalendar employeeId={id} />
        </TabsContent>
      </Tabs>

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
