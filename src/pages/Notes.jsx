import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import ConfirmDialog from "../components/ConfirmDialog";
import { cn } from "../lib/utils";
import { Plus, Trash2, StickyNote } from "lucide-react";

function looksLikeHtml(str) {
  return /<[a-z][\s\S]*>/i.test(str || "");
}

// Turns a note's stored content (plain text from before rich text, or HTML from the editor) into plain text for previews/empty-checks.
function stripHtmlToText(html) {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

function listPreviewTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fullTimestamp(iso) {
  return new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByDate(notes) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
  for (const n of notes) {
    const d = new Date(n.updatedAt);
    if (d >= startOfToday) groups.Today.push(n);
    else if (d >= startOfYesterday) groups.Yesterday.push(n);
    else if (d >= sevenDaysAgo) groups["Previous 7 Days"].push(n);
    else groups.Older.push(n);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function Notepad() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedUpdatedAt, setSelectedUpdatedAt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mentionables, setMentionables] = useState([]);
  const [mention, setMention] = useState(null); // { query, node, offset, matchLen, rect, index }
  const saveTimer = useRef();
  const editorRef = useRef();

  function load(selectAfter) {
    api.generalNotes().then((list) => {
      setNotes(list);
      if (selectAfter) select(selectAfter, list);
      else if (!selectedId && list.length > 0) select(list[0].id, list);
    });
  }

  useEffect(load, []);

  useEffect(() => {
    Promise.all([api.candidates().catch(() => []), api.employees().catch(() => [])]).then(
      ([candidates, employees]) => {
        setMentionables([
          ...candidates.map((c) => ({ id: c.id, name: c.name, type: "candidate", path: `/candidates/${c.id}` })),
          ...employees.map((e) => ({ id: e.id, name: e.name, type: "employee", path: `/employees/${e.id}` })),
        ]);
      }
    );
  }, []);

  function select(id, list = notes) {
    const note = list.find((n) => n.id === id);
    if (!note) return;
    setSelectedId(id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setSelectedUpdatedAt(note.updatedAt);
    setMention(null);
  }

  // contentEditable is uncontrolled — push the note's saved content into the DOM only when the selection changes.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || !selectedId) return;
    if (looksLikeHtml(content)) el.innerHTML = content;
    else el.textContent = content;
  }, [selectedId]);

  async function newNote() {
    // Reuse an already-empty, unused "New Note" instead of piling up duplicates.
    const existingEmpty = notes.find((n) => (n.title === "New Note" || !n.title) && !stripHtmlToText(n.content));
    if (existingEmpty) {
      select(existingEmpty.id);
      return;
    }
    const note = await api.createGeneralNote({ title: "New Note", content: "" });
    setNotes((prev) => [note, ...prev]);
    select(note.id, [note, ...notes]);
  }

  function onEdit(nextTitle, nextContent) {
    setTitle(nextTitle);
    setContent(nextContent);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = await api.updateGeneralNote(selectedId, { title: nextTitle, content: nextContent });
      setSelectedUpdatedAt(updated.updatedAt);
      setNotes((prev) => {
        const rest = prev.filter((n) => n.id !== selectedId);
        return [updated, ...rest];
      });
    }, 600);
  }

  function detectMention() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) {
      setMention(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      setMention(null);
      return;
    }
    const before = node.textContent.slice(0, range.startOffset);
    const match = before.match(/@([a-zA-Z0-9_]{0,24})$/);
    if (!match) {
      setMention(null);
      return;
    }
    const rect = range.getClientRects()[0] || editorRef.current.getBoundingClientRect();
    setMention({ query: match[1], node, offset: range.startOffset, matchLen: match[0].length, rect, index: 0 });
  }

  const HEADING_SIZE = { 1: "1.5rem", 2: "1.25rem", 3: "1.1rem" };

  function isLineStart(node) {
    const prev = node.previousSibling;
    return !prev || prev.nodeName === "BR";
  }

  // Notion/Bear-style shortcuts: typing **text**/*text* converts to bold/italic, and "# "/"## "/"### " at line start starts a heading.
  function tryAutoFormat() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const offset = range.startOffset;
    const text = node.textContent.slice(0, offset);

    // "# " (empty, type the heading after) or "#Hello " / "# Hello " (word typed first, then space).
    const emptyHeadingMatch = text.match(/^(#{1,3}) $/);
    const wordHeadingMatch = !emptyHeadingMatch && text.match(/^(#{1,3})\s?(\S+) $/);
    const headingMatch = emptyHeadingMatch || wordHeadingMatch;
    if (headingMatch && isLineStart(node)) {
      const level = headingMatch[1].length;
      const headingText = wordHeadingMatch ? wordHeadingMatch[2] : "";
      const formatRange = document.createRange();
      formatRange.setStart(node, 0);
      formatRange.setEnd(node, offset);
      formatRange.deleteContents();
      const el = document.createElement("span");
      el.style.fontWeight = "700";
      el.style.fontSize = HEADING_SIZE[level];
      const textNode = document.createTextNode(headingText || "​");
      el.appendChild(textNode);
      formatRange.insertNode(el);

      const newRange = document.createRange();
      newRange.setStart(textNode, textNode.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return true;
    }

    let match = text.match(/\*\*([^*]+)\*\*$/);
    let tag = "b";
    if (!match) {
      const italicMatch = text.match(/\*([^*]+)\*$/);
      if (italicMatch && text.charAt(italicMatch.index - 1) !== "*") {
        match = italicMatch;
        tag = "i";
      }
    }
    if (!match) return false;

    const formatRange = document.createRange();
    formatRange.setStart(node, match.index);
    formatRange.setEnd(node, offset);
    formatRange.deleteContents();
    const el = document.createElement(tag);
    el.textContent = match[1];
    formatRange.insertNode(el);
    const spacer = document.createTextNode("​");
    el.after(spacer);

    const newRange = document.createRange();
    newRange.setStart(spacer, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return true;
  }

  function onContentInput() {
    onEdit(title, editorRef.current.innerHTML);
    if (tryAutoFormat()) {
      onEdit(title, editorRef.current.innerHTML);
      setMention(null);
      return;
    }
    detectMention();
  }

  const mentionMatches = mention
    ? mentionables
        .filter((m) => m.name.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : [];

  function insertMention(item) {
    const { node, offset, matchLen } = mention;
    const range = document.createRange();
    range.setStart(node, offset - matchLen);
    range.setEnd(node, offset);
    range.deleteContents();
    const textNode = document.createTextNode(`@${item.name} `);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setMention(null);
    editorRef.current.focus();
    onEdit(title, editorRef.current.innerHTML);
  }

  function onContentKeyDown(e) {
    if (mention && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMention((m) => ({ ...m, index: (m.index + 1) % mentionMatches.length }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMention((m) => ({ ...m, index: (m.index - 1 + mentionMatches.length) % mentionMatches.length }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionMatches[mention.index]);
        return;
      }
      if (e.key === "Escape") {
        setMention(null);
        return;
      }
    }

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "b") {
      e.preventDefault();
      document.execCommand("bold");
      onEdit(title, editorRef.current.innerHTML);
    } else if (mod && e.key.toLowerCase() === "i") {
      e.preventDefault();
      document.execCommand("italic");
      onEdit(title, editorRef.current.innerHTML);
    } else if (mod && e.key.toLowerCase() === "u") {
      e.preventDefault();
      document.execCommand("underline");
      onEdit(title, editorRef.current.innerHTML);
    }
  }

  async function confirmDelete() {
    await api.deleteNote(deleteTarget);
    const remaining = notes.filter((n) => n.id !== deleteTarget);
    setNotes(remaining);
    setDeleteTarget(null);
    if (selectedId === deleteTarget) {
      if (remaining.length > 0) select(remaining[0].id, remaining);
      else {
        setSelectedId(null);
        setTitle("");
        setContent("");
      }
    }
  }

  const groups = groupByDate(notes);

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-0 border border-border rounded-lg overflow-hidden h-full">
      <div className="border-r border-border flex flex-col min-h-0">
        <div className="p-3 border-b border-border">
          <Button className="w-full" size="sm" onClick={newNote}>
            <Plus className="h-4 w-4" />
            New note
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.map(([label, items]) => (
            <div key={label}>
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground">{label}</div>
              {items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => select(n.id)}
                  className={cn(
                    "group w-full flex items-center gap-2 text-left px-3 py-2.5 border-b border-border/60 transition-colors cursor-pointer",
                    n.id === selectedId ? "bg-primary/10" : "hover:bg-accent"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{n.title || "New Note"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {listPreviewTime(n.updatedAt)}{" "}
                      {stripHtmlToText(n.content)
                        ? `· ${stripHtmlToText(n.content).replace(/\n/g, " ").slice(0, 30)}`
                        : "No additional text"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(n.id);
                    }}
                    className={cn(
                      "shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity",
                      n.id === selectedId && "opacity-100"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted-foreground p-3">No notes yet.</p>}
        </div>
      </div>

      <div className="flex flex-col min-w-0 min-h-0">
        {selectedId ? (
          <div className="flex-1 flex flex-col p-6 min-h-0">
            <div className="max-w-3xl w-full mx-auto text-xs text-muted-foreground mb-3">
              {fullTimestamp(selectedUpdatedAt)}
            </div>

            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col min-h-0">
              <Input
                value={title}
                onChange={(e) => onEdit(e.target.value, content)}
                placeholder="Title"
                className="border-none px-0 text-xl font-bold shadow-none focus-visible:ring-0 mb-1"
              />
              <div className="relative flex-1 min-h-0">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={onContentInput}
                  onKeyDown={onContentKeyDown}
                  onBlur={() => setTimeout(() => setMention(null), 150)}
                  data-placeholder="Start typing... (Ctrl/Cmd+B bold, +I italic, +U underline)"
                  className="h-full overflow-y-auto outline-none text-sm whitespace-pre-wrap min-h-[300px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
                />
                {mention && mentionMatches.length > 0 && (
                  <div
                    className="fixed z-20 w-64 bg-popover border border-border rounded-md shadow-lg py-1"
                    style={{ left: mention.rect.left, top: mention.rect.bottom + 4 }}
                  >
                    {mentionMatches.map((m, i) => (
                      <button
                        key={m.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(m);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm flex items-center justify-between",
                          i === mention.index ? "bg-accent" : "hover:bg-accent"
                        )}
                      >
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{m.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <StickyNote className="h-8 w-8 mx-auto opacity-40" />
              <p>Select a note or create a new one.</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this note?"
        description="This cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function LinkedNotes() {
  const [notes, setNotes] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    api.notes().then(setNotes).catch(() => {});
  }
  useEffect(load, []);

  async function confirmDelete() {
    await api.deleteNote(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-3">
      {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      {notes.map((n) => {
        const target = n.candidate
          ? { label: n.candidate.name, to: `/candidates/${n.candidate.id}`, kind: "Candidate" }
          : n.employee
          ? { label: n.employee.name, to: `/employees/${n.employee.id}`, kind: "Employee" }
          : null;
        return (
          <Card key={n.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm">{n.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{n.author}</span>
                    <span>&middot;</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {target && (
                      <>
                        <span>&middot;</span>
                        <Link to={target.to} className="text-primary hover:underline">
                          {target.kind}: {target.label}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(n.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this note?"
        description="This cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default function Notes() {
  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold">HR Notes</h1>
        <p className="text-muted-foreground text-sm">Your notepad, plus notes linked to candidates and employees</p>
      </div>

      <Tabs defaultValue="notepad" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="notepad">Notepad</TabsTrigger>
          <TabsTrigger value="linked">Linked notes</TabsTrigger>
        </TabsList>
        <TabsContent value="notepad" className="flex-1 min-h-0">
          <Notepad />
        </TabsContent>
        <TabsContent value="linked" className="flex-1 min-h-0 overflow-y-auto">
          <LinkedNotes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
