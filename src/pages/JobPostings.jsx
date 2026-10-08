import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose,
} from "../components/ui/sheet";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Trash2, Briefcase, Copy, Check } from "lucide-react";

export default function JobPostings() {
  const [jobs, setJobs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", sector: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  function load() {
    api.adminJobs().then(setJobs).catch(() => {});
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createJob(form);
      setOpen(false);
      setForm({ title: "", sector: "", description: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleOpen(job) {
    await api.updateJob(job.id, { isOpen: !job.isOpen });
    load();
  }

  async function confirmDelete() {
    await api.deleteJob(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  function copyLink(id) {
    navigator.clipboard.writeText(`${window.location.origin}/careers`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Job Postings</h1>
          <p className="text-muted-foreground text-sm">Open roles shown on the public careers page</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button><Plus className="h-4 w-4" />New posting</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>New job posting</SheetTitle></SheetHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input required placeholder="e.g. Math Teacher" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sector</Label>
                <Input required placeholder="e.g. Education" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <SheetFooter>
                <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create posting"}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="space-y-2">
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Briefcase className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No postings yet.</p>
          </div>
        )}
        {jobs.map((j) => (
          <Card key={j.id} className="group">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.sector}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={j.isOpen ? "success" : "secondary"} className="cursor-pointer" onClick={() => toggleOpen(j)}>
                    {j.isOpen ? "Open" : "Closed"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => copyLink(j.id)}>
                    {copiedId === j.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => setDeleteTarget(j.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{j.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this posting?"
        description="This cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
