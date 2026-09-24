import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import ConfirmDialog from "../components/ConfirmDialog";
import { cn } from "../lib/utils";
import { Plus, Send, Trash2, Menu, X, Pencil, Check } from "lucide-react";

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-dot [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-dot [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-dot [animation-delay:300ms]" />
    </div>
  );
}

export default function Assistant() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const bottomRef = useRef();
  const inputRef = useRef();
  const streamingTextRef = useRef("");
  const skipNextLoadRef = useRef(false);

  function loadSessions() {
    api.chatSessions().then(setSessions).catch(() => {});
  }

  useEffect(loadSessions, []);

  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    if (sessionId) {
      api.chatSession(sessionId).then((s) => setMessages(s.messages)).catch(() => {});
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function newChat() {
    // Already composing an unsent chat — nothing to create yet, session is made lazily on first send.
    if (!sessionId || messages.length > 0) {
      navigate("/assistant");
      setMessages([]);
      setInput("");
    }
    setSidebarOpen(false);
  }

  function startRename(s, e) {
    e.stopPropagation();
    e.preventDefault();
    setRenamingId(s.id);
    setRenameValue(s.title);
  }

  async function saveRename() {
    const id = renamingId;
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    const updated = await api.renameChatSession(id, title);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  function requestDeleteSession(id, e) {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTarget(id);
  }

  async function confirmDeleteSession() {
    const id = deleteTarget;
    setDeleteTarget(null);
    await api.deleteChatSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (sessionId === id) navigate("/assistant");
  }

  async function send(overrideText) {
    const userText = overrideText ?? input;
    if (!userText.trim() || streaming) return;
    setSuggestions([]);
    let targetId = sessionId;
    if (!targetId) {
      const session = await api.createChatSession();
      setSessions((prev) => [session, ...prev]);
      targetId = session.id;
      skipNextLoadRef.current = true;
      navigate(`/assistant/${targetId}`, { replace: true });
    }

    if (!overrideText) setInput("");
    setMessages((prev) => [...prev, { id: "tmp-user", role: "user", content: userText }]);
    setStreaming(true);
    streamingTextRef.current = "";
    setMessages((prev) => [...prev, { id: "tmp-assistant", role: "assistant", content: "" }]);

    const res = await fetch(`${api.baseUrl}/chat/sessions/${targetId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api.token()}`,
      },
      body: JSON.stringify({ content: userText }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") continue;
        const data = JSON.parse(payload);
        if (data.token) {
          streamingTextRef.current += data.token;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: streamingTextRef.current };
            return copy;
          });
        }
        if (data.suggestions) setSuggestions(data.suggestions);
      }
    }

    setStreaming(false);
    loadSessions();
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onInputChange(e) {
    setInput(e.target.value);
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }

  useEffect(() => {
    if (!input && inputRef.current) inputRef.current.style.height = "auto";
  }, [input]);

  return (
    <div className="h-full flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div
        className={cn(
          "fixed lg:static z-30 h-full w-72 bg-secondary/40 border-r border-border flex flex-col transition-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-3">
          <Button className="w-full" onClick={newChat}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sessions.map((s) =>
            renamingId === s.id ? (
              <div key={s.id} className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={saveRename}
                  className="flex-1 min-w-0 bg-background border border-primary rounded-md px-2 py-1 text-sm outline-none"
                />
                <button onMouseDown={(e) => e.preventDefault()} onClick={saveRename} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                key={s.id}
                onClick={() => {
                  navigate(`/assistant/${s.id}`);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "group flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm cursor-pointer truncate",
                  s.id === sessionId ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                <span className="truncate">{s.title}</span>
                <span className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0", s.id === sessionId && "opacity-100")}>
                  <button onClick={(e) => startRename(s, e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => requestDeleteSession(s.id, e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            )
          )}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">No chats yet. Start one above.</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground mt-20">
                <div className="text-lg font-semibold mb-1">HR AI Assistant</div>
                <p className="text-sm">Ask for job descriptions, interview questions, offer letter text, policy wording, or anything HR-related.</p>
              </div>
            )}
            {messages.map((m, i) => {
              const isPending = !m.content && streaming && i === messages.length - 1;
              return (
              <div key={m.id || i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "text-sm prose-chat",
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground"
                      : "w-fit max-w-full rounded-2xl px-4 py-2.5 bg-secondary text-secondary-foreground"
                  )}
                >
                  {isPending ? (
                    <TypingDots />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  )}
                </div>
              </div>
              );
            })}
            {suggestions.length > 0 && !streaming && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-primary hover:bg-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <Textarea
              ref={inputRef}
              rows={1}
              placeholder="Message the HR assistant..."
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              className="min-h-0 h-10 max-h-40 py-2.5 resize-none overflow-y-auto"
            />
            <Button size="icon" onClick={send} disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this chat?"
        description="This cannot be undone."
        onConfirm={confirmDeleteSession}
      />
    </div>
  );
}
