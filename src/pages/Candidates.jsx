import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "../components/ui/sheet";
import { Plus, Upload, FileText, CheckCircle2, XCircle, X } from "lucide-react";

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "ONBOARDING", "HIRED", "REJECTED"];
const STAGE_LABELS = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ONBOARDING: "Onboarding",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

function scoreVariant(score) {
  if (score == null) return "secondary";
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}

function UploadResumesDialog({ open, setOpen, onDone }) {
  const [role, setRole] = useState("");
  const [sector, setSector] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();

  function reset() {
    setRole("");
    setSector("");
    setJobDescription("");
    setFiles([]);
    setResults(null);
    setError("");
  }

  function onOpenChange(next) {
    setOpen(next);
    if (!next) {
      reset();
      onDone();
    }
  }

  function addFiles(fileList) {
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Add at least one resume file");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const response = await api.bulkUploadResumes({ roleAppliedFor: role, sector, jobDescription, files });
      setResults(response);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Upload className="h-4 w-4" />
          Upload resumes
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Upload resumes</SheetTitle>
        </SheetHeader>

        {!results ? (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Drop one or more resumes for a role. A candidate is created automatically for each
              one, with the name, email and phone read straight off the resume, plus a full AI fit score.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Role you're hiring for</Label>
                <Input required placeholder="e.g. Math Teacher, Sales Executive" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sector / industry</Label>
                <Input required placeholder="e.g. Education, Retail, IT" value={sector} onChange={(e) => setSector(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Job description (optional, improves scoring accuracy)</Label>
              <Textarea rows={3} placeholder="Paste the job requirements here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Resume files (PDF, DOCX or TXT — select multiple)</Label>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current.click()}>
                <Upload className="h-4 w-4" />
                Choose resume files
              </Button>
              {files.length > 0 && (
                <div className="space-y-1 mt-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-1.5">
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <button type="button" onClick={() => removeFile(i)}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={uploading}>
                {uploading ? `Analyzing ${files.length} resume(s) with AI...` : `Upload & analyze ${files.length || ""}`}
              </Button>
            </SheetFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    {r.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span className="truncate">{r.ok ? r.candidate.name : r.fileName}</span>
                  </span>
                  {r.ok ? (
                    <Badge variant={scoreVariant(r.score)}>{r.score}/100</Badge>
                  ) : (
                    <span className="text-destructive text-xs">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
            <SheetFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AddCandidateDialog({ onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", roleAppliedFor: "", sector: "", source: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createCandidate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createCandidate(form);
      setOpen(false);
      setForm({ name: "", email: "", phone: "", roleAppliedFor: "", sector: "", source: "" });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Add manually
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add candidate manually</SheetTitle>
        </SheetHeader>
        <form onSubmit={createCandidate} className="space-y-3">
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
              <Label>Role applied for</Label>
              <Input
                required
                placeholder="e.g. Math Teacher, Sales Executive"
                value={form.roleAppliedFor}
                onChange={(e) => setForm({ ...form, roleAppliedFor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sector / industry</Label>
              <Input
                required
                placeholder="e.g. Education, Retail, IT"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Source (optional)</Label>
            <Input
              placeholder="e.g. LinkedIn, Referral, Walk-in"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add candidate"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  function load() {
    api.candidates().then(setCandidates).catch(() => {});
  }

  useEffect(load, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Hiring Pipeline</h1>
          <p className="text-muted-foreground text-sm">Track candidates from application through onboarding</p>
        </div>
        <div className="flex items-center gap-2">
          <AddCandidateDialog onDone={load} />
          <UploadResumesDialog open={uploadOpen} setOpen={setUploadOpen} onDone={load} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STAGES.map((stage) => {
          const items = candidates.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="min-w-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-semibold text-sm">{STAGE_LABELS[stage]}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((c) => {
                  const latestScore = c.resumes?.[0]?.score;
                  return (
                    <Link key={c.id} to={`/candidates/${c.id}`}>
                      <Card className="hover:border-primary transition-colors">
                        <CardContent className="p-3 space-y-1.5">
                          <div className="font-medium text-sm truncate" title={c.name}>{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate" title={c.roleAppliedFor}>{c.roleAppliedFor}</div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">{c.sector}</Badge>
                            {latestScore != null && (
                              <Badge variant={scoreVariant(latestScore)} className="text-[10px]">
                                {latestScore}/100
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3 text-center">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
