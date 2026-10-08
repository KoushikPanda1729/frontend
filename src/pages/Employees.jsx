import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "../components/ui/sheet";
import { Plus, Users, Download } from "lucide-react";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_VARIANT = {
  ACTIVE: "success",
  ONBOARDING: "warning",
  INACTIVE: "secondary",
  EXITED: "destructive",
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeCode: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    joinDate: "",
  });

  function load() {
    api.employees().then(setEmployees).catch(() => {});
  }
  useEffect(load, []);

  async function createEmployee(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createEmployee(form);
      setOpen(false);
      setForm({ employeeCode: "", name: "", email: "", phone: "", department: "", designation: "", joinDate: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm">Employee records and documents</p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => api.downloadCsv(api.employeesExportUrl(), "employees.csv")}>
          <Download className="h-4 w-4" />Export CSV
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add employee</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Add employee</SheetTitle></SheetHeader>
            <form onSubmit={createEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Employee ID</Label>
                  <Input required value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
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
              <div className="space-y-1.5">
                <Label>Join date</Label>
                <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <SheetFooter>
                <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add employee"}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <Link key={emp.id} to={`/employees/${emp.id}`}>
            <Card className="hover:border-primary hover:shadow-sm transition-all h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                  {initials(emp.name)}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold truncate">{emp.name}</div>
                    <Badge variant={STATUS_VARIANT[emp.status] || "secondary"} className="shrink-0">{emp.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{emp.employeeCode}</div>
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {emp.designation || "No designation"} {emp.department ? `· ${emp.department}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{emp.documents?.length || 0} document(s)</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {employees.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-2">
            <Users className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No employees yet. Add one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
