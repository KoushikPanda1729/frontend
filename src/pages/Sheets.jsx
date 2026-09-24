import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "../components/ui/dialog";
import ConfirmDialog from "../components/ConfirmDialog";
import { Trash2, Table, ArrowLeft, ExternalLink, Link2, FolderOpen, FilePlus, X, Plus } from "lucide-react";
import { connectUrl, listAccounts, disconnectAccount, listSpreadsheets, createSpreadsheet } from "../lib/googleAuth";

function extractFileId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function AccountPicker({ accounts, accountId, setAccountId }) {
  if (accounts.length <= 1) return null;
  return (
    <div className="space-y-1.5">
      <Label>Google account</Label>
      <Select value={accountId} onValueChange={setAccountId}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NewSheetDialog({ accounts, onCreated }) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { url } = await createSpreadsheet(accountId, title);
      await api.createSheet({ title, url });
      setOpen(false);
      setTitle("");
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setAccountId(accounts[0]?.id); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FilePlus className="h-4 w-4" />
          New sheet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Google Sheet</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <AccountPicker accounts={accounts} accountId={accountId} setAccountId={setAccountId} />
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required autoFocus placeholder="e.g. Q4 Headcount Plan" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PickFromDriveDialog({ accounts, onDone, existingIds }) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState(null);

  function load(id) {
    setError("");
    setLoading(true);
    listSpreadsheets(id)
      .then(setFiles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function onOpenChange(next) {
    setOpen(next);
    if (next) {
      const id = accounts[0]?.id;
      setAccountId(id);
      load(id);
    }
  }

  function onAccountChange(id) {
    setAccountId(id);
    load(id);
  }

  async function add(file) {
    setAddingId(file.id);
    try {
      await api.createSheet({ title: file.name, url: file.url });
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderOpen className="h-4 w-4" />
          Pick from Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Pick a spreadsheet from Drive</DialogTitle></DialogHeader>
        <AccountPicker accounts={accounts} accountId={accountId} setAccountId={onAccountChange} />
        {loading && <p className="text-sm text-muted-foreground">Loading your spreadsheets...</p>}
        {error && <div className="text-destructive text-sm">{error}</div>}
        {!loading && !error && files.length === 0 && (
          <p className="text-sm text-muted-foreground">No spreadsheets found in this account's Drive.</p>
        )}
        <div className="max-h-80 overflow-y-auto space-y-1">
          {files.map((f) => {
            const alreadyAdded = existingIds.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => !alreadyAdded && add(f)}
                disabled={addingId === f.id || alreadyAdded}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Table className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate text-sm">{f.name}</span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {addingId === f.id ? "Adding..." : alreadyAdded ? "Added" : new Date(f.modifiedTime).toLocaleDateString()}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddSheetDrawer({ onDone, compact }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createSheet({ title, url });
      setOpen(false);
      setTitle("");
      setUrl("");
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
        <Button variant={compact ? "outline" : "default"}>
          <Link2 className="h-4 w-4" />
          Add by link
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Google Sheet</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste the share link of a Google Sheet. In Google Sheets: Share &rarr; "Anyone with the
            link" set to Editor (or Viewer) &rarr; copy link.
          </p>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required placeholder="e.g. Payroll Tracker" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Google Sheets link</Label>
            <Input
              required
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <SheetFooter>
            <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add sheet"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Sheets() {
  const [sheets, setSheets] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [checkingAccounts, setCheckingAccounts] = useState(true);
  const [connectError, setConnectError] = useState("");
  const [disconnectTarget, setDisconnectTarget] = useState(null);

  function load() {
    api.sheets().then(setSheets).catch(() => {});
  }
  useEffect(load, []);

  function loadAccounts() {
    return listAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setCheckingAccounts(false));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected")) {
      window.history.replaceState({}, "", "/sheets");
    } else if (params.get("google_error")) {
      setConnectError(params.get("google_error"));
      window.history.replaceState({}, "", "/sheets");
    }
    loadAccounts();
  }, []);

  async function confirmDisconnect() {
    const id = disconnectTarget;
    setDisconnectTarget(null);
    await disconnectAccount(id);
    loadAccounts();
  }

  async function confirmDelete() {
    await api.deleteSheet(deleteTarget);
    setDeleteTarget(null);
    if (openId === deleteTarget) setOpenId(null);
    load();
  }

  const openSheet = sheets.find((s) => s.id === openId);
  const existingFileIds = new Set(sheets.map((s) => extractFileId(s.url)).filter(Boolean));

  if (openSheet) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <span className="font-semibold truncate">{openSheet.title}</span>
          </div>
          <a href={openSheet.url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
              Open in Google Sheets
            </Button>
          </a>
        </div>
        <iframe
          src={openSheet.url}
          title={openSheet.title}
          className="flex-1 w-full border-0"
          allow="clipboard-write"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sheets</h1>
        <p className="text-muted-foreground text-sm">Your Google Sheets, right inside the platform</p>
      </div>

      {!checkingAccounts && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {accounts.length > 0 ? (
              <>
                <NewSheetDialog accounts={accounts} onCreated={load} />
                <PickFromDriveDialog accounts={accounts} onDone={load} existingIds={existingFileIds} />
                <AddSheetDrawer onDone={load} compact />
              </>
            ) : (
              <>
                <a href={connectUrl()}>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Connect Google Account
                  </Button>
                </a>
                <AddSheetDrawer onDone={load} />
              </>
            )}
          </div>

          {accounts.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 pl-3 pr-2 h-9 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="truncate max-w-[160px] text-emerald-700 dark:text-emerald-400">{a.email}</span>
                  <button
                    onClick={() => setDisconnectTarget(a.id)}
                    title="Disconnect this account"
                    className="text-emerald-700/60 dark:text-emerald-400/60 hover:text-destructive rounded p-0.5 hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <a href={connectUrl()}>
                <button
                  title="Connect another Google account"
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </a>
            </div>
          )}
        </div>
      )}

      {connectError && <div className="text-destructive text-sm">{connectError}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sheets.map((s) => (
          <Card
            key={s.id}
            className="group hover:border-primary hover:shadow-sm transition-all cursor-pointer"
            onClick={() => setOpenId(s.id)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Table className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="font-semibold truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Updated {new Date(s.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(s.id);
                }}
                className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
        {sheets.length === 0 && (
          <p className="text-sm text-muted-foreground">No sheets yet. Add one to get started.</p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove this sheet?"
        description="This only removes it from this list — the actual Google Sheet is not deleted."
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={!!disconnectTarget}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
        title="Disconnect this Google account?"
        description="You'll need to reconnect it to pick or create sheets from its Drive again. Sheets already added here stay in the list."
        confirmLabel="Disconnect"
        onConfirm={confirmDisconnect}
      />
    </div>
  );
}
