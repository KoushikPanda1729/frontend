import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../components/ui/dialog";
import ConfirmDialog from "../components/ConfirmDialog";
import { ArrowLeft, Upload, FileText, Trash2, CheckCircle2, XCircle } from "lucide-react";

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "ONBOARDING", "HIRED", "REJECTED"];

function scoreColor(score) {
  if (score == null) return "text-muted-foreground";
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [noteText, setNoteText] = useState("");
  const [interviewForm, setInterviewForm] = useState({ round: "", interviewer: "", scheduledAt: "" });
  const [hireOpen, setHireOpen] = useState(false);
  const [employeeCode, setEmployeeCode] = useState("");
  const [hireError, setHireError] = useState("");
  const [hiring, setHiring] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  function load() {
    api.candidate(id).then(setCandidate).catch(() => {});
  }

  useEffect(load, [id]);

  function onFileChosen(e) {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  }

  async function analyzeResume() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    try {
      await api.uploadResume(id, selectedFile, jobDescription);
      load();
      setSelectedFile(null);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changeStage(stage) {
    await api.updateCandidate(id, { stage });
    load();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await api.addCandidateNote(id, { content: noteText });
    setNoteText("");
    load();
  }

  async function addInterview(e) {
    e.preventDefault();
    if (!interviewForm.round.trim()) return;
    await api.addInterview(id, interviewForm);
    setInterviewForm({ round: "", interviewer: "", scheduledAt: "" });
    load();
  }

  async function updateInterviewStatus(interviewId, status) {
    await api.updateInterview(interviewId, { status });
    load();
  }

  async function hireCandidate(e) {
    e.preventDefault();
    if (!employeeCode.trim()) return;
    setHireError("");
    setHiring(true);
    try {
      const employee = await api.hireFromCandidate(id, { employeeCode });
      navigate(`/employees/${employee.id}`);
    } catch (err) {
      setHireError(err.message);
    } finally {
      setHiring(false);
    }
  }

  async function removeCandidate() {
    await api.deleteCandidate(id);
    navigate("/candidates");
  }

  if (!candidate) return <div className="p-6">Loading...</div>;

  const latestResume = candidate.resumes?.[0];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/candidates")}>
        <ArrowLeft className="h-4 w-4" />
        Back to pipeline
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{candidate.name}</h1>
          <p className="text-muted-foreground text-sm">
            {candidate.roleAppliedFor} &middot; {candidate.sector}
            {candidate.email ? ` · ${candidate.email}` : ""}
            {candidate.phone ? ` · ${candidate.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={candidate.stage} onValueChange={changeStage}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {candidate.stage === "HIRED" && <Button onClick={() => setHireOpen(true)}>Convert to employee</Button>}
          <Button variant="destructive" size="icon" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resume &amp; AI analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job description (optional, improves scoring accuracy)</Label>
            <Textarea
              rows={3}
              placeholder="Paste the job requirements here for a more precise fit score..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onFileChosen} />
            <Button onClick={() => fileRef.current.click()} disabled={uploading} variant="outline">
              <Upload className="h-4 w-4" />
              {selectedFile ? "Choose a different file" : "Choose resume (PDF/DOCX/TXT)"}
            </Button>
            {selectedFile && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {selectedFile.name}
              </span>
            )}
            <Button onClick={analyzeResume} disabled={uploading || !selectedFile}>
              {uploading ? "Analyzing with AI..." : "Analyze resume"}
            </Button>
          </div>
          {uploadError && <div className="text-destructive text-sm">{uploadError}</div>}

          {candidate.resumes?.length === 0 && (
            <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
          )}

          {candidate.resumes?.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => api.downloadFile("resume", r.id, r.fileName)}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {r.fileName}
                </button>
                {r.score != null && (
                  <div className={`text-xl font-bold ${scoreColor(r.score)}`}>{r.score}/100</div>
                )}
              </div>

              {r.analysis && (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Recommendation</div>
                    <Badge
                      variant={
                        r.analysis.scoring.recommendation === "Strongly Recommend" || r.analysis.scoring.recommendation === "Recommend"
                          ? "success"
                          : r.analysis.scoring.recommendation === "Consider"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {r.analysis.scoring.recommendation}
                    </Badge>
                    <p className="text-muted-foreground mt-1">{r.analysis.scoring.recommendationReason}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Sub-scores</div>
                    <div className="space-y-0.5 text-muted-foreground">
                      <div>Skills match: {r.analysis.scoring.skillsMatchScore}/100</div>
                      <div>Experience match: {r.analysis.scoring.experienceMatchScore}/100</div>
                      <div>Education match: {r.analysis.scoring.educationMatchScore}/100</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Strengths</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                      {r.analysis.scoring.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> Gaps</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                      {r.analysis.scoring.gaps?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-semibold mb-1">Suggested interview questions</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                      {r.analysis.scoring.suggestedInterviewQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interviews</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addInterview} className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1.5">
              <Label>Round</Label>
              <Input
                placeholder="e.g. Round 1 - HR"
                value={interviewForm.round}
                onChange={(e) => setInterviewForm({ ...interviewForm, round: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Interviewer</Label>
              <Input
                value={interviewForm.interviewer}
                onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="datetime-local"
                value={interviewForm.scheduledAt}
                onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
              />
            </div>
            <Button type="submit">Schedule</Button>
          </form>

          <div className="space-y-2">
            {candidate.interviews?.length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled.</p>}
            {candidate.interviews?.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm">
                <div>
                  <div className="font-medium">{iv.round}</div>
                  <div className="text-muted-foreground text-xs">
                    {iv.interviewer && `${iv.interviewer} · `}
                    {iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString() : "No date set"}
                  </div>
                </div>
                <Select value={iv.status} onValueChange={(status) => updateInterviewStatus(iv.id, status)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
              placeholder="Add a note about this candidate..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>
          <div className="space-y-2">
            {candidate.notes?.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            {candidate.notes?.map((n) => (
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

      <Dialog open={hireOpen} onOpenChange={(open) => { setHireOpen(open); if (!open) { setEmployeeCode(""); setHireError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={hireCandidate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee ID / code</Label>
              <Input autoFocus required value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="e.g. EMP-1042" />
            </div>
            {hireError && <div className="text-destructive text-sm">{hireError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={hiring}>{hiring ? "Creating..." : "Create employee"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete candidate ${candidate.name}?`}
        description="This cannot be undone."
        onConfirm={removeCandidate}
      />
    </div>
  );
}
