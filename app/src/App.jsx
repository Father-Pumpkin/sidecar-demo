// AcmeOps Work Orders — the stand-in for "niche software": a perfectly ordinary
// internal tool with NO API. State lives in React; persistence is localStorage.
// The only way in is the UI — which is exactly the situation the sidecar
// extension exists for.
import React, { useEffect, useState } from "react";
import { FancySelect, QtyInput } from "./controls.jsx";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const DEPARTMENTS = ["Facilities", "IT", "Fleet", "Production"];
const STATUSES = ["Open", "In Progress", "Blocked", "Done"];

const blank = () => ({
  number: "",
  title: "",
  assignee: "",
  due: "",
  priority: "",
  department: "",
  status: "",
  parts: [],
  steps: [],
});

const LS_KEY = "acmeops.workorders";
const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
};

export default function App() {
  const [order, setOrder] = useState(blank());
  const [saved, setSaved] = useState(loadSaved());
  const [toast, setToast] = useState("");

  const up = (patch) => setOrder((o) => ({ ...o, ...patch }));
  const upRow = (kind, i, patch) =>
    setOrder((o) => ({
      ...o,
      [kind]: o[kind].map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));
  const addRow = (kind, row) => setOrder((o) => ({ ...o, [kind]: [...o[kind], row] }));
  const delRow = (kind, i) =>
    setOrder((o) => ({ ...o, [kind]: o[kind].filter((_, j) => j !== i) }));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const save = () => {
    const next = [...saved.filter((s) => s.number !== order.number), order];
    next.sort((a, b) => (a.number > b.number ? 1 : -1));
    setSaved(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setToast(`Saved ${order.number || "order"} ✓`);
  };

  return (
    <div className="shell">
      <aside className="side">
        <h1 className="brand">AcmeOps</h1>
        <p className="brand-sub">Work Orders</p>
        <button className="btn ghost" onClick={() => setOrder(blank())}>
          + New order
        </button>
        <ul className="saved">
          {saved.map((s) => (
            <li key={s.number}>
              <button className="saved-item" onClick={() => setOrder(s)}>
                <b>{s.number}</b> {s.title}
              </button>
            </li>
          ))}
          {!saved.length && <li className="hint">Nothing saved yet.</li>}
        </ul>
      </aside>

      <main className="pane">
        <div className="grid head">
          <label className="fld">
            <span>Order #</span>
            <input aria-label="Order number" value={order.number} onChange={(e) => up({ number: e.target.value })} />
          </label>
          <label className="fld wide">
            <span>Title</span>
            <input aria-label="Title" value={order.title} onChange={(e) => up({ title: e.target.value })} />
          </label>
          <FancySelect label="Priority" value={order.priority} options={PRIORITIES} onChange={(v) => up({ priority: v })} />
          <FancySelect label="Department" value={order.department} options={DEPARTMENTS} onChange={(v) => up({ department: v })} />
          <FancySelect label="Status" value={order.status} options={STATUSES} onChange={(v) => up({ status: v })} />
          <label className="fld">
            <span>Assignee</span>
            <input aria-label="Assignee" value={order.assignee} onChange={(e) => up({ assignee: e.target.value })} />
          </label>
          <label className="fld">
            <span>Due (YYYY-MM-DD)</span>
            <input aria-label="Due date" value={order.due} onChange={(e) => up({ due: e.target.value })} />
          </label>
        </div>

        <section>
          <div className="sec-head">
            <h2>Parts</h2>
            <button className="btn ghost" onClick={() => addRow("parts", { name: "", qty: 1, cost: "" })}>
              + Add part
            </button>
          </div>
          {order.parts.map((p, i) => (
            <div className="row" key={i}>
              <input placeholder="Part name" value={p.name} onChange={(e) => upRow("parts", i, { name: e.target.value })} />
              <QtyInput value={p.qty} onChange={(qty) => upRow("parts", i, { qty })} />
              <input className="cost" placeholder="Unit cost" value={p.cost} onChange={(e) => upRow("parts", i, { cost: e.target.value })} />
              <button className="btn del" aria-label="Remove part" onClick={() => delRow("parts", i)}>
                ✕
              </button>
            </div>
          ))}
          {!order.parts.length && <p className="hint">No parts.</p>}
        </section>

        <section>
          <div className="sec-head">
            <h2>Steps</h2>
            <button className="btn ghost" onClick={() => addRow("steps", { name: "", text: "" })}>
              + Add step
            </button>
          </div>
          {order.steps.map((s, i) => (
            <div className="row step" key={i}>
              <input placeholder="Step name" value={s.name} onChange={(e) => upRow("steps", i, { name: e.target.value })} />
              <textarea placeholder="Details" value={s.text} onChange={(e) => upRow("steps", i, { text: e.target.value })} />
              <button className="btn del" aria-label="Remove step" onClick={() => delRow("steps", i)}>
                ✕
              </button>
            </div>
          ))}
          {!order.steps.length && <p className="hint">No steps.</p>}
        </section>

        <footer className="foot">
          <button id="save" className="btn primary" onClick={save}>
            Save order
          </button>
          {toast && <span className="toast">{toast}</span>}
        </footer>
      </main>
    </div>
  );
}
