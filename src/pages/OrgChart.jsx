import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MarkerType, Handle, Position, useNodesState, useEdgesState, addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose,
} from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import ConfirmDialog from "../components/ConfirmDialog";
import { Network, Sparkles, Trash2, ArrowLeft, Building2, ExternalLink } from "lucide-react";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 86;
const H_GAP = 32;
const V_GAP = 110;

function EmployeeNode({ data }) {
  return (
    <div
      onClick={data.onClick}
      className={`rounded-lg border border-border bg-card shadow-sm px-4 py-3 transition-all ${data.onClick ? "cursor-pointer hover:border-primary hover:shadow-md" : ""}`}
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
          {data.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{data.name}</div>
          <div className="text-xs text-muted-foreground truncate">{data.title || "—"}</div>
        </div>
      </div>
      {data.department && <div className="text-[10px] text-muted-foreground mt-1.5 truncate">{data.department}</div>}
      {data.description && <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{data.description}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2 !border-0" />
    </div>
  );
}

const nodeTypes = { employee: EmployeeNode };

// Simple Reingold-Tilford-style tree layout: leaves get sequential x, parents center over their children.
// items: [{id, name, title, department, description}], parentEdges: [{from, to}] (manager -> report)
function layout(items, parentEdges, onClick) {
  const byId = Object.fromEntries(items.map((e) => [e.id, e]));
  const childrenOf = {};
  for (const { from, to } of parentEdges) {
    if (!byId[from] || !byId[to]) continue;
    childrenOf[from] = childrenOf[from] || [];
    childrenOf[from].push(byId[to]);
  }
  const childIds = new Set(parentEdges.map((e) => e.to));
  const roots = items.filter((e) => !childIds.has(e.id));

  const positions = {};
  let cursor = 0;

  function place(node, depth) {
    const kids = childrenOf[node.id] || [];
    if (kids.length === 0) {
      positions[node.id] = { x: cursor * (NODE_WIDTH + H_GAP), y: depth * (NODE_HEIGHT + V_GAP) };
      cursor += 1;
      return positions[node.id].x;
    }
    const childXs = kids.map((k) => place(k, depth + 1));
    const x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    positions[node.id] = { x, y: depth * (NODE_HEIGHT + V_GAP) };
    return x;
  }

  for (const r of roots) place(r, 0);

  const nodes = items.map((e) => ({
    id: e.id,
    type: "employee",
    position: positions[e.id] || { x: 0, y: 0 },
    data: { name: e.name, title: e.title, department: e.department, description: e.description, onClick: onClick ? () => onClick(e.id) : null },
  }));

  const edges = parentEdges
    .filter((e) => byId[e.from] && byId[e.to])
    .map((e) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

function Chart({ items, parentEdges, onClick, onConnect }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => layout(items, parentEdges, onClick),
    [items, parentEdges]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  function handleConnect(params) {
    setEdges((eds) => addEdge({ ...params, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { strokeWidth: 1.5 } }, eds));
    onConnect?.(params.source, params.target);
  }

  return (
    <div style={{ height: "calc(100vh - 220px)" }} className="rounded-lg border border-border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function GenerateSheet({ onGenerated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    setError("");
    setLoading(true);
    try {
      const snapshot = await api.generateOrgChart(name, prompt);
      onGenerated(snapshot);
      setOpen(false);
      setName("");
      setPrompt("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><Sparkles className="h-4 w-4" />Generate with AI</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>Generate a hierarchy</SheetTitle></SheetHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Describe a project or company structure in plain text — AI drafts a hierarchy with roles and short
            descriptions. Saved to the list below, not linked to real employee records.
          </p>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required placeholder="e.g. Project Alpha team, Sales org" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Describe the structure</Label>
            <Textarea
              required
              rows={6}
              placeholder={"e.g. A 12-person product team: one VP of Engineering, under them an Engineering Manager and a Design Lead. The Engineering Manager has 4 backend engineers and 2 frontend engineers. The Design Lead has 2 product designers."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <SheetFooter>
            <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
            <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function NodeEditDialog({ node, mode, onClose, onSave, onOpenProfile }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) setForm({ name: node.name || "", title: node.title || "", department: node.department || "", description: node.description || "" });
  }, [node]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit node</DialogTitle></DialogHeader>
        {form && (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{mode === "company" ? "Designation" : "Title"}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department / tag</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            {mode === "saved" && (
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            )}
            <DialogFooter className="gap-2">
              {mode === "company" && (
                <Button type="button" variant="outline" onClick={() => onOpenProfile(node.id)}>
                  <ExternalLink className="h-4 w-4" />Open full profile
                </Button>
              )}
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OrgChart() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(null);
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState(null); // null = list view, "company" or snapshot id = chart view
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editNodeId, setEditNodeId] = useState(null);

  function loadSaved() {
    api.savedOrgCharts().then(setSaved).catch(() => {});
  }

  useEffect(() => {
    api.orgChart().then(setEmployees).catch(() => {});
    loadSaved();
  }, []);

  useEffect(() => {
    if (selected === "company" || selected === null) {
      setActiveSnapshot(null);
      return;
    }
    api.savedOrgChart(selected).then(setActiveSnapshot).catch(() => {});
  }, [selected]);

  function onGenerated(snapshot) {
    setSaved((prev) => [{ id: snapshot.id, name: snapshot.name, createdAt: snapshot.createdAt }, ...prev]);
    setActiveSnapshot(snapshot);
    setSelected(snapshot.id);
  }

  async function confirmDelete() {
    await api.deleteSavedOrgChart(deleteTarget);
    setSaved((prev) => prev.filter((s) => s.id !== deleteTarget));
    if (selected === deleteTarget) setSelected(null);
    setDeleteTarget(null);
  }

  const liveItems = (employees || []).map((e) => ({ id: e.id, name: e.name, title: e.designation, department: e.department }));
  const liveEdges = (employees || []).filter((e) => e.managerId).map((e) => ({ from: e.managerId, to: e.id }));

  const editingNode =
    editNodeId == null
      ? null
      : selected === "company"
      ? liveItems.find((n) => n.id === editNodeId)
      : (activeSnapshot?.nodes || []).find((n) => n.id === editNodeId);

  async function connectCompany(managerId, reportId) {
    await api.updateEmployee(reportId, { managerId });
    api.orgChart().then(setEmployees).catch(() => {});
  }

  async function connectSaved(fromId, toId) {
    const nextEdges = [...(activeSnapshot?.edges || []), { from: fromId, to: toId }];
    const updated = await api.setSavedOrgChartEdges(selected, nextEdges);
    setActiveSnapshot(updated);
  }

  async function saveNode(form) {
    if (selected === "company") {
      await api.updateEmployee(editNodeId, { name: form.name, designation: form.title, department: form.department });
      api.orgChart().then(setEmployees).catch(() => {});
    } else {
      const updated = await api.updateSavedOrgChartNode(selected, editNodeId, form);
      setActiveSnapshot(updated);
    }
  }

  if (selected !== null) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4" />Back to charts
          </Button>
          {selected !== "company" && (
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(selected)}>
              <Trash2 className="h-4 w-4" />Delete chart
            </Button>
          )}
        </div>

        {selected === "company" ? (
          <>
            {employees && employees.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <Network className="h-8 w-8 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No employees yet.</p>
              </div>
            )}
            {employees && employees.length > 0 && (
              <ReactFlowProvider>
                <Chart items={liveItems} parentEdges={liveEdges} onClick={(id) => setEditNodeId(id)} onConnect={connectCompany} />
              </ReactFlowProvider>
            )}
          </>
        ) : (
          activeSnapshot && (
            <ReactFlowProvider>
              <Chart items={activeSnapshot.nodes} parentEdges={activeSnapshot.edges} onClick={(id) => setEditNodeId(id)} onConnect={connectSaved} />
            </ReactFlowProvider>
          )
        )}

        <NodeEditDialog
          node={editingNode}
          mode={selected === "company" ? "company" : "saved"}
          onClose={() => setEditNodeId(null)}
          onSave={saveNode}
          onOpenProfile={(id) => navigate(`/employees/${id}`)}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete this chart?"
          description="This cannot be undone."
          onConfirm={confirmDelete}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Org Chart</h1>
          <p className="text-muted-foreground text-sm">Reporting hierarchy, drawn as a connected diagram</p>
        </div>
        <GenerateSheet onGenerated={onGenerated} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="hover:border-primary hover:shadow-sm transition-all cursor-pointer" onClick={() => setSelected("company")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">Company org chart</div>
              <div className="text-xs text-muted-foreground">{employees ? `${employees.length} employees` : "Loading..."}</div>
            </div>
          </CardContent>
        </Card>

        {saved.map((s) => (
          <Card key={s.id} className="hover:border-primary hover:shadow-sm transition-all cursor-pointer group" onClick={() => setSelected(s.id)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(s.id); }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this chart?"
        description="This cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
