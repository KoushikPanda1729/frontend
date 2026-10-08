import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose,
} from "../components/ui/sheet";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Trash2, CalendarHeart } from "lucide-react";

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", date: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    api.holidays().then(setHolidays).catch(() => {});
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.addHoliday(form);
      setOpen(false);
      setForm({ name: "", date: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    await api.deleteHoliday(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Holiday Calendar</h1>
          <p className="text-muted-foreground text-sm">Company holidays — added here, every active employee's attendance is auto-marked</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add holiday</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Add holiday</SheetTitle></SheetHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required placeholder="e.g. Diwali" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <SheetFooter>
                <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add holiday"}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="space-y-2">
        {holidays.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <CalendarHeart className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No holidays added yet.</p>
          </div>
        )}
        {holidays.map((h) => (
          <Card key={h.id} className="group">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{h.name}</div>
                <div className="text-sm text-muted-foreground">{new Date(h.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => setDeleteTarget(h.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this holiday?"
        description="This does not undo attendance already marked."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
