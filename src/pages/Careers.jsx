import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose,
} from "../components/ui/sheet";
import { Briefcase, Upload, FileText, Building2 } from "lucide-react";

function ApplyDialog({ job }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  function onOpenChange(next) {
    setOpen(next);
    if (!next) {
      setForm({ name: "", email: "", phone: "" });
      setFile(null);
      setDone(false);
      setError("");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      setError("Attach your resume");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.applyToJob(job.id, { ...form, resume: file });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">Apply</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>Apply — {job.title}</SheetTitle></SheetHeader>
        {done ? (
          <div className="py-8 text-center space-y-2">
            <p className="font-medium">Application received.</p>
            <p className="text-sm text-muted-foreground">We'll be in touch if there's a fit.</p>
          </div>
        ) : (
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
            <div className="space-y-1.5">
              <Label>Resume (PDF, DOCX or TXT)</Label>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current.click()}>
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choose file"}
              </Button>
            </div>
            {error && <div className="text-destructive text-sm">{error}</div>}
            <SheetFooter>
              <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
              <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit application"}</Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Careers() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    api.publicJobs().then(setJobs).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Careers</h1>
            <p className="text-muted-foreground text-sm">Open roles — apply directly below</p>
          </div>
        </div>

        <div className="space-y-3">
          {jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Briefcase className="h-8 w-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No open roles right now.</p>
            </div>
          )}
          {jobs.map((j) => (
            <Card key={j.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{j.title}</CardTitle>
                  <Badge variant="outline" className="mt-1 text-[10px]">{j.sector}</Badge>
                </div>
                <ApplyDialog job={j} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{j.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
