import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Search, Moon, Sun, LayoutDashboard, LayoutGrid, List as ListIcon,
  Calendar as CalendarIcon, Bell, Filter, X, Trash2, Copy,
  CheckCircle2, Circle, Clock, AlertTriangle, User,
  Paperclip, Repeat, ChevronLeft, ChevronRight, GripVertical, Check,
  Download, Upload, Timer, Play, Pause, RotateCcw, ChevronDown,
  ArrowUp, ArrowDown, Link2, Palette, Image as ImageIcon,
  Layers, Pencil, Mail
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Constants                                                                */
/* ---------------------------------------------------------------------- */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const PRIORITIES = [
  { key: "low", label: "Low", color: "#38BDF8" },
  { key: "medium", label: "Medium", color: "#F5A524" },
  { key: "high", label: "High", color: "#FB7185" },
];
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.key, p]));

const STATUSES = [
  { key: "todo", label: "To Do", color: "#9CA3AF" },
  { key: "waiting", label: "Waiting", color: "#A78BFA" },
  { key: "inprogress", label: "In Progress", color: "#5B5BD6" },
  { key: "done", label: "Done", color: "#2DD4BF" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

const DEFAULT_CATEGORIES_BASE = [
  { name: "Work", color: "#5B5BD6" },
  { name: "Personal", color: "#F5A524" },
  { name: "Growth", color: "#2DD4BF" },
  { name: "Admin", color: "#FB7185" },
];
const CATEGORY_PALETTE = ["#5B5BD6", "#2DD4BF", "#FB7185", "#F5A524", "#38BDF8", "#A78BFA", "#F472B6", "#34D399", "#FBBF24", "#60A5FA", "#EF4444"];
const NEW_CATEGORY_NAMES = ["Marketing", "Displays", "Project Part", "Logistic", "Issues", "GW", "Trainings", "Forecast", "Reply", "Call", "Orders"];
const DEFAULT_CATEGORIES = [
  ...DEFAULT_CATEGORIES_BASE,
  ...NEW_CATEGORY_NAMES.map((name, i) => ({ name, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] })),
];
function mergeCategories(saved, defaults) {
  const map = new Map();
  defaults.forEach((c) => map.set(c.name, c));
  (saved || []).forEach((c) => map.set(c.name, c));
  return Array.from(map.values());
}

const RECUR_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const ACCENT_OPTIONS = ["#5B5BD6", "#2DD4BF", "#FB7185", "#F5A524", "#38BDF8", "#A78BFA"];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function pad(n) { return String(n).padStart(2, "0"); }
function toLocalInputValue(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDay(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function isOverdue(task) {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate).getTime() < Date.now();
}
function dueSoon(task) {
  if (!task.dueDate || task.status === "done") return false;
  const diff = new Date(task.dueDate).getTime() - Date.now();
  return diff > 0 && diff < 1000 * 60 * 60 * 24;
}
function dateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function normalizeTask(t) {
  return {
    emailLink: "", endTime: null, projectId: null, parentTaskId: null,
    notesImages: [], attachments: [], tags: [], subtasks: [],
    ...t,
  };
}

/* ---------------------------------------------------------------------- */
/* Seed data                                                               */
/* ---------------------------------------------------------------------- */

function seedTasks() {
  const now = Date.now();
  const day = 86400000;
  const t1 = uid(), t2 = uid();
  return [
    {
      id: t1, title: "Redesign onboarding flow", description: "Simplify the 5-step signup into 2 steps.",
      priority: "high", status: "inprogress", dueDate: new Date(now + day * 1).toISOString(),
      category: "Work", tags: ["design", "ux"], assignee: "Nino", recurring: null, dependsOn: null,
      subtasks: [{ id: uid(), title: "Wireframes", done: true }, { id: uid(), title: "Review with team", done: false }],
      notes: "", notesImages: [], attachments: [], timeSpent: 25, createdAt: new Date(now - day * 3).toISOString(), completedAt: null,
    },
    {
      id: t2, title: "Quarterly supplier report", description: "Compile Q2 numbers for ABC & Alta.",
      priority: "high", status: "todo", dueDate: new Date(now - day * 1).toISOString(),
      category: "Work", tags: ["report"], assignee: "", recurring: null, dependsOn: null,
      subtasks: [], notes: "", notesImages: [], attachments: [], timeSpent: 0, createdAt: new Date(now - day * 5).toISOString(), completedAt: null,
    },
    {
      id: uid(), title: "Morning run", description: "5k easy pace.",
      priority: "low", status: "todo", dueDate: new Date(now + day * 0.3).toISOString(),
      category: "Personal", tags: ["health"], assignee: "", recurring: { frequency: "daily" }, dependsOn: null,
      subtasks: [], notes: "", notesImages: [], attachments: [], timeSpent: 0, createdAt: new Date(now - day).toISOString(), completedAt: null,
    },
    {
      id: uid(), title: "Read: Atomic Habits — ch. 4", description: "",
      priority: "medium", status: "done", dueDate: new Date(now - day * 2).toISOString(),
      category: "Growth", tags: ["reading"], assignee: "", recurring: null, dependsOn: null,
      subtasks: [], notes: "Great chapter on identity-based habits.", notesImages: [], attachments: [], timeSpent: 40,
      createdAt: new Date(now - day * 6).toISOString(), completedAt: new Date(now - day * 2).toISOString(),
    },
    {
      id: uid(), title: "Team sync — Caucasus region", description: "Weekly alignment call.",
      priority: "medium", status: "inprogress", dueDate: new Date(now + day * 2).toISOString(),
      category: "Work", tags: ["meeting"], assignee: "Team", recurring: { frequency: "weekly" }, dependsOn: t1,
      subtasks: [{ id: uid(), title: "Prep agenda", done: true }], notes: "", notesImages: [], attachments: [],
      timeSpent: 10, createdAt: new Date(now - day * 4).toISOString(), completedAt: null,
    },
  ];
}

/* ---------------------------------------------------------------------- */
/* Theme tokens                                                            */
/* ---------------------------------------------------------------------- */

function useThemeTokens(theme) {
  return useMemo(() => {
    const light = {
      bg: "#F7F8FA", surface: "#FFFFFF", surfaceAlt: "#F1F2F6", border: "#E5E7EB",
      text: "#14161A", textMuted: "#6B7280", textFaint: "#9CA3AF", hoverBg: "#F1F2F5",
      shadow: "0 1px 2px rgba(20,22,26,0.04), 0 4px 12px rgba(20,22,26,0.04)",
    };
    const dark = {
      bg: "#0E1015", surface: "#171A21", surfaceAlt: "#1D212B", border: "#262B36",
      text: "#F3F4F6", textMuted: "#9CA3AF", textFaint: "#6B7280", hoverBg: "#1E222B",
      shadow: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35)",
    };
    return theme === "dark" ? dark : light;
  }, [theme]);
}

/* ---------------------------------------------------------------------- */
/* Small UI atoms                                                          */
/* ---------------------------------------------------------------------- */

function Pill({ children, color, tk, style }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: color ? `${color}1A` : tk.surfaceAlt, color: color || tk.textMuted, ...style }}>
      {children}
    </span>
  );
}

function IconBtn({ onClick, title, children, tk, active }) {
  return (
    <button onClick={onClick} title={title} className="p-2 rounded-lg transition-colors shrink-0"
      style={{ background: active ? tk.surfaceAlt : "transparent", color: tk.text }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = tk.hoverBg; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}

function Toast({ toast, tk }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 animate-[fadein_.2s_ease]"
      style={{ background: tk.text, color: tk.bg, boxShadow: tk.shadow }}>
      <Check size={15} /> {toast}
    </div>
  );
}

function StatCard({ label, value, color, icon, tk }) {
  return (
    <div className="rounded-2xl p-4 flex-1 min-w-[130px]" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, color }}>{icon}</div>
      </div>
      <div className="text-2xl font-bold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: tk.textMuted }}>{label}</div>
    </div>
  );
}

function MomentumRing({ tasks, tk, accent }) {
  const total = tasks.length || 1;
  const done = tasks.filter((t) => t.status === "done").length;
  const inprog = tasks.filter((t) => t.status === "inprogress").length;
  const waiting = tasks.filter((t) => t.status === "waiting").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;
  const todo = Math.max(total - done - inprog - waiting, 0);
  const segs = [
    { v: done, color: "#2DD4BF" }, { v: inprog, color: accent }, { v: waiting, color: "#A78BFA" },
    { v: overdue, color: "#FB7185" }, { v: Math.max(todo - overdue, 0), color: tk.border },
  ];
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="rounded-2xl p-5 flex items-center gap-5" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90 shrink-0">
        <circle cx="64" cy="64" r={R} fill="none" stroke={tk.surfaceAlt} strokeWidth="12" />
        {segs.map((s, i) => {
          const len = (s.v / total) * C;
          const el = <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
          offset += len;
          return el;
        })}
        <text x="64" y="70" textAnchor="middle" fill={tk.text} fontSize="22" fontWeight="700"
          transform="rotate(90 64 64)" style={{ fontFamily: "Sora, sans-serif" }}>{pct}%</text>
      </svg>
      <div className="flex-1">
        <div className="text-sm font-semibold mb-2" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Momentum</div>
        <div className="space-y-1.5">
          {[["Done", "#2DD4BF", done], ["In progress", accent, inprog], ["Waiting", "#A78BFA", waiting], ["Overdue", "#FB7185", overdue], ["To do", tk.textFaint, Math.max(todo - overdue, 0)]].map(([label, color, v]) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span style={{ color: tk.textMuted }} className="flex-1">{label}</span>
              <span style={{ color: tk.text }} className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Task card (kanban)                                                      */
/* ---------------------------------------------------------------------- */

function TaskCard({ task, tk, onOpen, onDragStart, categories, taskMap }) {
  const overdue = isOverdue(task);
  const soon = dueSoon(task);
  const done = task.status === "done";
  const cat = categories.find((c) => c.name === task.category);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const dep = task.dependsOn ? taskMap[task.dependsOn] : null;

  return (
    <div draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => onOpen(task)}
      className="rounded-xl p-3 mb-2.5 cursor-pointer group transition-shadow"
      style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${PRIORITY_MAP[task.priority].color}`, boxShadow: tk.shadow, opacity: done ? 0.65 : 1 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug" style={{ color: tk.text, textDecoration: done ? "line-through" : "none" }}>{task.title}</div>
        <GripVertical size={14} style={{ color: tk.textFaint }} className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
      </div>
      {task.description && <div className="text-xs mt-1 line-clamp-2" style={{ color: tk.textMuted }}>{task.description}</div>}
      {dep && (
        <div className="flex items-center gap-1 mt-1.5 text-[11px]" style={{ color: tk.textFaint }}>
          <Link2 size={11} /> After: <span className="truncate">{dep.title}</span>
        </div>
      )}
      <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
        {cat && <Pill color={cat.color} tk={tk}>{cat.name}</Pill>}
        {task.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: tk.surfaceAlt, color: tk.textMuted }}>#{t}</span>
        ))}
        {task.recurring && <Repeat size={11} style={{ color: tk.textFaint }} />}
      </div>
      <div className="flex items-center justify-between mt-2.5 text-[11px]" style={{ color: tk.textFaint }}>
        <div className="flex items-center gap-1" style={{ color: overdue ? "#FB7185" : soon ? "#F5A524" : tk.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
          {task.dueDate && <><Clock size={11} /> {fmtDate(task.dueDate)}</>}
        </div>
        {task.subtasks.length > 0 && <span>{subDone}/{task.subtasks.length}</span>}
        {task.assignee && <span className="flex items-center gap-1"><User size={11} />{task.assignee}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Board view                                                               */
/* ---------------------------------------------------------------------- */

function BoardView({ tasks, tk, onOpen, onMove, categories, taskMap }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const onDragStart = (e, id) => e.dataTransfer.setData("text/plain", id);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUSES.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); onMove(id, col.key); setDragOverCol(null); }}
            className="rounded-2xl p-3 transition-colors"
            style={{ background: dragOverCol === col.key ? tk.surfaceAlt : "transparent", border: `1px dashed ${dragOverCol === col.key ? col.color : "transparent"}`, minHeight: 200 }}>
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{col.label}</span>
              <span className="text-xs ml-auto" style={{ color: tk.textFaint }}>{colTasks.length}</span>
            </div>
            {colTasks.map((t) => <TaskCard key={t.id} task={t} tk={tk} onOpen={onOpen} onDragStart={onDragStart} categories={categories} taskMap={taskMap} />)}
            {colTasks.length === 0 && <div className="text-xs text-center py-8 rounded-xl" style={{ color: tk.textFaint, border: `1px dashed ${tk.border}` }}>No tasks</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* List view                                                                */
/* ---------------------------------------------------------------------- */

function ListView({ tasks, tk, onOpen, categories, sortKey, setSortKey }) {
  const cols = [
    { key: "title", label: "Task" }, { key: "status", label: "Status" },
    { key: "priority", label: "Priority" }, { key: "dueDate", label: "Due" }, { key: "category", label: "Category" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="grid grid-cols-[1fr_100px_100px_130px_110px] px-4 py-2.5 text-xs font-semibold" style={{ borderBottom: `1px solid ${tk.border}`, color: tk.textMuted }}>
        {cols.map((c) => (
          <button key={c.key} onClick={() => setSortKey(c.key)} className="text-left flex items-center gap-1 hover:opacity-70">
            {c.label} {sortKey === c.key && <ChevronDown size={12} />}
          </button>
        ))}
      </div>
      {tasks.length === 0 && <div className="p-8 text-center text-sm" style={{ color: tk.textFaint }}>No tasks match your filters.</div>}
      {tasks.map((t) => {
        const cat = categories.find((c) => c.name === t.category);
        const overdue = isOverdue(t);
        const done = t.status === "done";
        return (
          <div key={t.id} onClick={() => onOpen(t)}
            className="grid grid-cols-[1fr_100px_100px_130px_110px] px-4 py-3 items-center cursor-pointer text-sm"
            style={{ borderBottom: `1px solid ${tk.border}`, opacity: done ? 0.55 : 1 }}
            onMouseEnter={(e) => e.currentTarget.style.background = tk.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div className="flex items-center gap-2 pr-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_MAP[t.priority].color }} />
              <span className="truncate" style={{ color: tk.text, textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
              {t.recurring && <Repeat size={12} style={{ color: tk.textFaint }} className="shrink-0" />}
            </div>
            {done ? (
              <span className="text-xs" style={{ color: tk.textFaint, textDecoration: "line-through" }}>Done</span>
            ) : (
              <span className="text-xs font-medium" style={{ color: STATUS_MAP[t.status].color }}>{STATUS_MAP[t.status].label}</span>
            )}
            <span style={{ color: PRIORITY_MAP[t.priority].color }} className="text-xs font-medium">{PRIORITY_MAP[t.priority].label}</span>
            <span className="text-xs" style={{ color: overdue ? "#FB7185" : tk.textMuted, fontFamily: "IBM Plex Mono, monospace" }}>{fmtDate(t.dueDate)}</span>
            {cat ? <Pill color={cat.color} tk={tk}>{cat.name}</Pill> : <span style={{ color: tk.textFaint }} className="text-xs">—</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Day tasks modal (month view "see all")                                  */
/* ---------------------------------------------------------------------- */

function DayTasksModal({ date, tasks, tk, onOpen, onClose, onCreate }) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[80vh] flex flex-col" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${tk.border}` }}>
          <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{fmtDay(date)}</span>
          <IconBtn tk={tk} title="Close" onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div className="overflow-y-auto p-3 space-y-2">
          {tasks.length === 0 && <div className="text-xs text-center py-6" style={{ color: tk.textFaint }}>No tasks this day.</div>}
          {tasks.map((t) => (
            <div key={t.id} onClick={() => onOpen(t)} className="rounded-lg p-2.5 cursor-pointer flex items-center gap-2"
              style={{ background: tk.surfaceAlt, borderLeft: `3px solid ${PRIORITY_MAP[t.priority].color}` }}>
              <span className="text-sm flex-1 truncate" style={{ color: tk.text, textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</span>
              <span className="text-[11px]" style={{ color: tk.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
                {new Date(t.dueDate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
        <div className="p-3" style={{ borderTop: `1px solid ${tk.border}` }}>
          <button onClick={() => onCreate(date)} className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: tk.surfaceAlt, color: tk.text }}>
            <Plus size={13} /> Add task on this day
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Calendar view — month / week / day with hourly grid                     */
/* ---------------------------------------------------------------------- */

function CalendarView({ tasks, tk, onOpen, focusDate, setFocusDate, mode, setMode, onCreateOnDate, onReschedule, accent }) {
  const [dayModalDate, setDayModalDate] = useState(null);

  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => { if (!t.dueDate) return; const k = dateKey(t.dueDate); (map[k] = map[k] || []).push(t); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
    return map;
  }, [tasks]);

  const byDateHour = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const start = new Date(t.dueDate);
      const startHour = start.getHours();
      let endHour = startHour;
      if (t.endTime) {
        const end = new Date(t.endTime);
        if (dateKey(end) === dateKey(start) && end.getHours() >= startHour) endHour = end.getHours();
      }
      for (let h = startHour; h <= endHour; h++) {
        const k = `${dateKey(start)}-${h}`;
        (map[k] = map[k] || []).push({ task: t, isStart: h === startHour });
      }
    });
    return map;
  }, [tasks]);

  const todayKey = dateKey(new Date());
  const modeBtn = (m, label) => (
    <button onClick={() => setMode(m)} className="text-xs px-2.5 py-1 rounded-lg font-medium"
      style={{ background: mode === m ? accent : tk.surfaceAlt, color: mode === m ? "#fff" : tk.textMuted }}>{label}</button>
  );

  const nav = (dir) => {
    const d = new Date(focusDate);
    if (mode === "month") d.setMonth(d.getMonth() + dir);
    else if (mode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setFocusDate(d);
  };

  const onDayReschedule = (taskId, dateObj) => {
    const original = tasks.find((t) => t.id === taskId);
    if (!original || !original.dueDate) return;
    const od = new Date(original.dueDate);
    const nd = new Date(dateObj);
    nd.setHours(od.getHours(), od.getMinutes(), 0, 0);
    onReschedule(taskId, nd.toISOString());
  };
  const onHourReschedule = (taskId, dateObj, hour) => {
    const original = tasks.find((t) => t.id === taskId);
    if (!original || !original.dueDate) return;
    const od = new Date(original.dueDate);
    const nd = new Date(dateObj);
    nd.setHours(hour, od.getMinutes(), 0, 0);
    onReschedule(taskId, nd.toISOString());
  };

  const headerLabel = mode === "month"
    ? focusDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : mode === "week"
      ? `${fmtDay(startOfWeek(focusDate))} – ${fmtDay(new Date(startOfWeek(focusDate).getTime() + 6 * 86400000))}`
      : fmtDay(focusDate);

  return (
    <div className="rounded-2xl p-4" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{headerLabel}</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: tk.surfaceAlt }}>
            {modeBtn("month", "Month")}{modeBtn("week", "Week")}{modeBtn("day", "Day")}
          </div>
          <div className="flex gap-1">
            <IconBtn tk={tk} onClick={() => nav(-1)} title="Previous"><ChevronLeft size={16} /></IconBtn>
            <IconBtn tk={tk} onClick={() => setFocusDate(new Date())} title="Today"><span className="text-xs px-1">Today</span></IconBtn>
            <IconBtn tk={tk} onClick={() => nav(1)} title="Next"><ChevronRight size={16} /></IconBtn>
          </div>
        </div>
      </div>

      {mode === "month" && (
        <MonthGrid focusDate={focusDate} byDate={byDate} tk={tk} todayKey={todayKey} onOpen={onOpen}
          onCreateOnDate={onCreateOnDate} onShowDay={(d) => setDayModalDate(d)} onReschedule={onDayReschedule} />
      )}

      {mode === "week" && (
        <HourGrid days={Array.from({ length: 7 }, (_, i) => new Date(startOfWeek(focusDate).getTime() + i * 86400000))}
          byDateHour={byDateHour} tk={tk} todayKey={todayKey} onOpen={onOpen} accent={accent}
          onCreateAt={(d, h) => { const dt = new Date(d); dt.setHours(h, 0, 0, 0); onCreateOnDate(dt); }}
          onReschedule={onHourReschedule} />
      )}

      {mode === "day" && (
        <HourGrid days={[focusDate]} byDateHour={byDateHour} tk={tk} todayKey={todayKey} onOpen={onOpen} accent={accent} wide
          onCreateAt={(d, h) => { const dt = new Date(d); dt.setHours(h, 0, 0, 0); onCreateOnDate(dt); }}
          onReschedule={onHourReschedule} />
      )}

      {dayModalDate && (
        <DayTasksModal date={dayModalDate} tasks={byDate[dateKey(dayModalDate)] || []} tk={tk}
          onOpen={(t) => { setDayModalDate(null); onOpen(t); }} onClose={() => setDayModalDate(null)}
          onCreate={(d) => { setDayModalDate(null); onCreateOnDate(d); }} />
      )}
    </div>
  );
}

function MonthGrid({ focusDate, byDate, tk, todayKey, onOpen, onCreateOnDate, onShowDay, onReschedule }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  const year = focusDate.getFullYear(), m = focusDate.getMonth();
  const first = new Date(year, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[11px] font-medium py-1" style={{ color: tk.textFaint }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ minHeight: 118 }} />;
          const k = `${year}-${pad(m + 1)}-${pad(d)}`;
          const dayTasks = byDate[k] || [];
          const isToday = k === todayKey;
          const dateObj = new Date(year, m, d);
          const dragOver = dragOverKey === k;
          return (
            <div key={i} className="rounded-lg p-2 flex flex-col group" style={{ minHeight: 118, background: dragOver ? tk.surfaceAlt : isToday ? tk.surfaceAlt : "transparent", border: `1px solid ${dragOver ? "#5B5BD6" : isToday ? "#5B5BD6" : tk.border}` }}
              onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
              onDragLeave={() => setDragOverKey((cur) => (cur === k ? null : cur))}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) onReschedule(id, dateObj); setDragOverKey(null); }}>
              <div className="flex items-center justify-between">
                <button onClick={() => onShowDay(dateObj)} className="text-sm font-semibold" style={{ color: isToday ? "#5B5BD6" : tk.textMuted, fontFamily: "IBM Plex Mono, monospace" }}>{d}</button>
                <button onClick={() => onCreateOnDate(dateObj)} className="opacity-0 group-hover:opacity-100" style={{ color: tk.textFaint }}><Plus size={13} /></button>
              </div>
              <div className="flex-1 space-y-1 mt-1.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => onOpen(t)} title={t.title}
                    className="text-[11px] px-1.5 py-1 rounded truncate cursor-grab active:cursor-grabbing"
                    style={{ background: `${PRIORITY_MAP[t.priority].color}22`, color: tk.text, textDecoration: t.status === "done" ? "line-through" : "none" }}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <button onClick={() => onShowDay(dateObj)} className="text-[11px] font-medium" style={{ color: tk.textFaint }}>+{dayTasks.length - 3} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function HourGrid({ days, byDateHour, tk, todayKey, onOpen, accent, wide, onCreateAt, onReschedule }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  return (
    <div className="overflow-y-auto rounded-lg" style={{ maxHeight: 560, border: `1px solid ${tk.border}` }}>
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(${wide ? 180 : 90}px, 1fr))` }}>
        <div className="sticky top-0 z-10" style={{ background: tk.surface }} />
        {days.map((d) => {
          const isToday = dateKey(d) === todayKey;
          return (
            <div key={d.toISOString()} className="sticky top-0 z-10 text-center py-2 text-xs font-medium"
              style={{ background: tk.surface, color: isToday ? accent : tk.textMuted, borderBottom: `1px solid ${tk.border}` }}>
              {d.toLocaleDateString(undefined, { weekday: "short" })} <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>{d.getDate()}</span>
            </div>
          );
        })}
        {HOURS.map((h) => (
          <React.Fragment key={h}>
            <div className="text-right pr-2 text-[10px] py-2" style={{ color: tk.textFaint, borderTop: `1px solid ${tk.border}`, fontFamily: "IBM Plex Mono, monospace" }}>
              {pad(h)}:00
            </div>
            {days.map((d) => {
              const k = `${dateKey(d)}-${h}`;
              const items = byDateHour[k] || [];
              const dragOver = dragOverKey === k;
              return (
                <div key={k} className="p-1 space-y-1 cursor-pointer" style={{ borderTop: `1px solid ${tk.border}`, borderLeft: `1px solid ${tk.border}`, minHeight: 40, background: dragOver ? `${accent}14` : "transparent" }}
                  onClick={() => onCreateAt(d, h)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
                  onDragLeave={() => setDragOverKey((cur) => (cur === k ? null : cur))}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) onReschedule(id, d, h); setDragOverKey(null); }}>
                  {items.map(({ task: t, isStart }) => (
                    isStart ? (
                      <div key={t.id} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/plain", t.id); }}
                        onClick={(e) => { e.stopPropagation(); onOpen(t); }} title={t.title}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing"
                        style={{ background: `${PRIORITY_MAP[t.priority].color}22`, color: tk.text, textDecoration: t.status === "done" ? "line-through" : "none" }}>
                        {t.title}
                      </div>
                    ) : (
                      <div key={t.id} onClick={(e) => { e.stopPropagation(); onOpen(t); }} title={`${t.title} (busy)`}
                        className="h-2 rounded cursor-pointer" style={{ background: `${PRIORITY_MAP[t.priority].color}55` }} />
                    )
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Pomodoro widget                                                          */
/* ---------------------------------------------------------------------- */

function Pomodoro({ tk, tasks, onAddTime, accent }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("focus");
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === "focus" && linkedTaskId) onAddTime(linkedTaskId, 25);
            return mode === "focus" ? 5 * 60 : 25 * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, linkedTaskId, onAddTime]);

  const mm = pad(Math.floor(seconds / 60)), ss = pad(seconds % 60);
  const activeTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="rounded-2xl p-4" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Timer size={15} style={{ color: accent }} />
        <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Pomodoro</span>
        <span className="text-[11px] ml-auto px-2 py-0.5 rounded-full" style={{ background: tk.surfaceAlt, color: tk.textMuted }}>{mode === "focus" ? "Focus" : "Break"}</span>
      </div>
      <div className="text-center text-4xl font-bold py-3" style={{ color: tk.text, fontFamily: "IBM Plex Mono, monospace" }}>{mm}:{ss}</div>
      <select value={linkedTaskId} onChange={(e) => setLinkedTaskId(e.target.value)}
        className="w-full text-xs rounded-lg px-2 py-1.5 mb-3 outline-none" style={{ background: tk.surfaceAlt, color: tk.text, border: `1px solid ${tk.border}` }}>
        <option value="">Link to a task (optional)</option>
        {activeTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: accent }}>
          {running ? <Pause size={14} /> : <Play size={14} />} {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setSeconds(mode === "focus" ? 25 * 60 : 5 * 60); }} className="px-3 rounded-lg" style={{ background: tk.surfaceAlt, color: tk.text }}>
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Task Modal                                                               */
/* ---------------------------------------------------------------------- */

const emptyTask = (defaults = {}) => ({
  id: uid(), title: "", description: "", priority: "medium", status: "todo",
  dueDate: null, endTime: null, category: "", tags: [], assignee: "", recurring: null, dependsOn: null,
  emailLink: "", projectId: null, parentTaskId: null,
  subtasks: [], notes: "", notesImages: [], attachments: [], timeSpent: 0,
  createdAt: new Date().toISOString(), completedAt: null, ...defaults,
});

function TaskModal({ task, tk, categories, allTasks, onClose, onSave, onDelete, onDuplicate, accent }) {
  const [form, setForm] = useState(task);
  const [tagInput, setTagInput] = useState("");
  const [subInput, setSubInput] = useState("");
  const isNew = !task.title && task.subtasks.length === 0 && !task.description;

  useEffect(() => setForm(task), [task]);
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const addTag = () => {
    const v = tagInput.trim().replace(/,$/, "");
    if (v && !form.tags.includes(v)) update({ tags: [...form.tags, v] });
    setTagInput("");
  };
  const addSubtask = () => {
    if (!subInput.trim()) return;
    update({ subtasks: [...form.subtasks, { id: uid(), title: subInput.trim(), done: false }] });
    setSubInput("");
  };
  const moveSubtask = (idx, dir) => {
    const arr = [...form.subtasks];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    update({ subtasks: arr });
  };

  const handleAttach = (files) => {
    const list = Array.from(files || []);
    const results = list.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    update({ attachments: [...form.attachments, ...results] });
  };

  const handleNotesPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type.startsWith("image/"));
    if (!imgItem) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    update({ notesImages: [...(form.notesImages || []), { id: uid(), dataUrl }] });
  };
  const handleNotesImageUpload = async (files) => {
    const list = Array.from(files || []);
    const added = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(f);
      added.push({ id: uid(), dataUrl });
    }
    update({ notesImages: [...(form.notesImages || []), ...added] });
  };

  const inputStyle = { background: tk.surfaceAlt, color: tk.text, border: `1px solid ${tk.border}` };
  const labelCls = "text-xs font-medium mb-1.5 block";
  const otherTasks = allTasks.filter((t) => t.id !== form.id);

  return (
    <div className="fixed inset-0 z-[150] flex items-start md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full md:max-w-2xl md:rounded-2xl overflow-y-auto" style={{ background: tk.surface, maxHeight: "100vh", height: "100%", border: `1px solid ${tk.border}` }}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 z-10" style={{ background: tk.surface, borderBottom: `1px solid ${tk.border}` }}>
          <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{isNew ? "New task" : "Edit task"}</span>
          <div className="flex items-center gap-1">
            {!isNew && (<>
              <IconBtn tk={tk} title="Duplicate" onClick={() => onDuplicate(form)}><Copy size={16} /></IconBtn>
              <IconBtn tk={tk} title="Delete" onClick={() => onDelete(form.id)}><Trash2 size={16} style={{ color: "#FB7185" }} /></IconBtn>
            </>)}
            <IconBtn tk={tk} title="Close" onClick={onClose}><X size={16} /></IconBtn>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="Task title"
            className="w-full text-lg font-semibold outline-none bg-transparent" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }} autoFocus />

          <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="Description"
            rows={2} className="w-full text-sm outline-none rounded-lg px-3 py-2 resize-none" style={inputStyle} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Priority</label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button key={p.key} onClick={() => update({ priority: p.key })} className="flex-1 text-xs py-1.5 rounded-lg font-medium transition"
                    style={{ background: form.priority === p.key ? `${p.color}22` : tk.surfaceAlt, color: form.priority === p.key ? p.color : tk.textMuted, border: `1px solid ${form.priority === p.key ? p.color : tk.border}` }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Status</label>
              <select value={form.status} onChange={(e) => update({ status: e.target.value, completedAt: e.target.value === "done" ? new Date().toISOString() : null })}
                className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Due date & time</label>
              <input type="datetime-local" value={form.dueDate ? toLocalInputValue(form.dueDate) : ""}
                onChange={(e) => update({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Busy until (optional)</label>
              <input type="datetime-local" value={form.endTime ? toLocalInputValue(form.endTime) : ""}
                onChange={(e) => update({ endTime: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}><Mail size={12} className="inline mr-1" />Outlook email link (optional)</label>
            <div className="flex gap-2">
              <input value={form.emailLink || ""} onChange={(e) => update({ emailLink: e.target.value })} placeholder="Paste the email/message link here"
                className="flex-1 text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle} />
              {form.emailLink && (
                <a href={form.emailLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" style={{ background: tk.surfaceAlt, color: tk.text }}>
                  <Mail size={13} /> Open
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Category</label>
              <select value={form.category} onChange={(e) => update({ category: e.target.value })} className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Assignee (optional)</label>
              <input value={form.assignee} onChange={(e) => update({ assignee: e.target.value })} placeholder="Name" className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Recurring</label>
              <select value={form.recurring?.frequency || ""} onChange={(e) => update({ recurring: e.target.value ? { frequency: e.target.value } : null })}
                className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle}>
                <option value="">Not recurring</option>
                {RECUR_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}><Link2 size={12} className="inline mr-1" />Depends on (do after)</label>
            <select value={form.dependsOn || ""} onChange={(e) => update({ dependsOn: e.target.value || null })} className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle}>
              <option value="">None</option>
              {otherTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}>Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5" style={inputStyle}>
              {form.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: tk.surface, color: tk.text }}>
                  #{t} <X size={11} className="cursor-pointer" onClick={() => update({ tags: form.tags.filter((x) => x !== t) })} />
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } if (e.key === "Backspace" && !tagInput && form.tags.length) update({ tags: form.tags.slice(0, -1) }); }}
                placeholder="Add tag…" className="flex-1 min-w-[80px] bg-transparent text-xs outline-none" style={{ color: tk.text }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}>Subtasks {form.subtasks.length > 0 && `(${form.subtasks.filter((s) => s.done).length}/${form.subtasks.length})`}</label>
            {form.subtasks.length > 0 && (
              <div className="mb-2 h-1.5 rounded-full overflow-hidden" style={{ background: tk.surfaceAlt }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(form.subtasks.filter((s) => s.done).length / form.subtasks.length) * 100}%`, background: "#2DD4BF" }} />
              </div>
            )}
            <div className="space-y-1.5">
              {form.subtasks.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-1.5 group">
                  <button onClick={() => update({ subtasks: form.subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}>
                    {s.done ? <CheckCircle2 size={16} style={{ color: "#2DD4BF" }} /> : <Circle size={16} style={{ color: tk.textFaint }} />}
                  </button>
                  <span className="flex-1 text-sm" style={{ color: s.done ? tk.textFaint : tk.text, textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
                  <button onClick={() => moveSubtask(idx, -1)} disabled={idx === 0} className="disabled:opacity-20"><ArrowUp size={13} style={{ color: tk.textFaint }} /></button>
                  <button onClick={() => moveSubtask(idx, 1)} disabled={idx === form.subtasks.length - 1} className="disabled:opacity-20"><ArrowDown size={13} style={{ color: tk.textFaint }} /></button>
                  <X size={13} className="cursor-pointer opacity-0 group-hover:opacity-100" style={{ color: tk.textFaint }} onClick={() => update({ subtasks: form.subtasks.filter((x) => x.id !== s.id) })} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input value={subInput} onChange={(e) => setSubInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                placeholder="Add subtask…" className="flex-1 text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle} />
              <button onClick={addSubtask} className="px-2.5 py-1.5 rounded-lg" style={{ background: tk.surfaceAlt }}><Plus size={14} style={{ color: tk.text }} /></button>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}>Notes <span style={{ color: tk.textFaint, fontWeight: 400 }}>(paste a screenshot here)</span></label>
            <textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} onPaste={handleNotesPaste} rows={2} placeholder="Freeform notes… (Ctrl/Cmd+V to paste a screenshot)"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none" style={inputStyle} />
            {(form.notesImages || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.notesImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.dataUrl} onClick={() => window.open(img.dataUrl, "_blank")} className="w-16 h-16 object-cover rounded-lg cursor-pointer" style={{ border: `1px solid ${tk.border}` }} />
                    <button onClick={() => update({ notesImages: form.notesImages.filter((x) => x.id !== img.id) })}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ background: "#FB7185" }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer mt-2" style={{ background: tk.surfaceAlt, color: tk.text, border: `1px dashed ${tk.border}` }}>
              <ImageIcon size={13} /> Add photo
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleNotesImageUpload(e.target.files)} />
            </label>
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}>Attachments</label>
            <div className="space-y-1 mb-2">
              {form.attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: tk.surfaceAlt, color: tk.textMuted }}>
                  <Paperclip size={12} />
                  <span className="flex-1 truncate">{a.name}</span>
                  <span>{(a.size / 1024).toFixed(0)}KB</span>
                  <X size={12} className="cursor-pointer" onClick={() => update({ attachments: form.attachments.filter((_, idx) => idx !== i) })} />
                </div>
              ))}
            </div>
            <label className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer" style={{ background: tk.surfaceAlt, color: tk.text, border: `1px dashed ${tk.border}` }}>
              <Paperclip size={13} /> Attach file
              <input type="file" multiple className="hidden" onChange={(e) => handleAttach(e.target.files)} />
            </label>
          </div>

          {form.timeSpent > 0 && <div className="text-xs flex items-center gap-1.5" style={{ color: tk.textFaint }}><Timer size={12} /> {form.timeSpent} min tracked</div>}
        </div>

        <div className="sticky bottom-0 flex gap-2 px-5 py-4" style={{ background: tk.surface, borderTop: `1px solid ${tk.border}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: tk.surfaceAlt, color: tk.text }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.title.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: accent }}>
            {isNew ? "Create task" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Filter sidebar (vertical, left)                                         */
/* ---------------------------------------------------------------------- */

function FilterSidebar({ tk, open, onClose, filters, setFilters, categories, allTags, accent }) {
  if (!open) return null;
  const Section = ({ title, options, value, onPick }) => (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: tk.textFaint }}>{title}</div>
      <div className="space-y-1">
        <button onClick={() => onPick("")} className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg" style={{ background: value === "" ? tk.surfaceAlt : "transparent", color: value === "" ? tk.text : tk.textMuted, fontWeight: value === "" ? 600 : 400 }}>All</button>
        {options.map((o) => (
          <button key={o.key || o} onClick={() => onPick(o.key || o)} className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg flex items-center gap-2"
            style={{ background: value === (o.key || o) ? tk.surfaceAlt : "transparent", color: value === (o.key || o) ? tk.text : tk.textMuted, fontWeight: value === (o.key || o) ? 600 : 400 }}>
            {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />}
            <span className="truncate">{o.label || o.name || o}</span>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[140] flex" onClick={onClose}>
      <div style={{ background: "rgba(0,0,0,0.35)" }} className="flex-1" />
      <div onClick={(e) => e.stopPropagation()} className="w-72 h-full overflow-y-auto p-4" style={{ background: tk.surface, borderLeft: `1px solid ${tk.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Filters</span>
          <IconBtn tk={tk} title="Close" onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <Section title="Status" options={STATUSES} value={filters.status} onPick={(v) => setFilters((f) => ({ ...f, status: v }))} />
        <Section title="Priority" options={PRIORITIES} value={filters.priority} onPick={(v) => setFilters((f) => ({ ...f, priority: v }))} />
        <Section title="Category" options={categories} value={filters.category} onPick={(v) => setFilters((f) => ({ ...f, category: v }))} />
        <Section title="Tag" options={allTags.map((t) => ({ key: t, label: `#${t}` }))} value={filters.tag} onPick={(v) => setFilters((f) => ({ ...f, tag: v }))} />
        <button onClick={() => setFilters({ status: "", priority: "", category: "", tag: "" })} className="w-full mt-2 py-2 rounded-lg text-xs font-medium" style={{ background: `${accent}1A`, color: accent }}>
          Clear all filters
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Theme / customize popover                                               */
/* ---------------------------------------------------------------------- */

function CustomizePopover({ tk, settings, setSettings, onClose }) {
  const fileRef = useRef(null);
  return (
    <div className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden z-50 p-4" style={{ background: tk.surface, border: `1px solid ${tk.border}`, boxShadow: tk.shadow }}>
      <div className="text-xs font-semibold mb-2" style={{ color: tk.text }}>Accent color</div>
      <div className="flex gap-2 mb-4">
        {ACCENT_OPTIONS.map((c) => (
          <button key={c} onClick={() => setSettings((s) => ({ ...s, accentColor: c }))} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c }}>
            {settings.accentColor === c && <Check size={13} color="#fff" />}
          </button>
        ))}
      </div>
      <div className="text-xs font-semibold mb-2" style={{ color: tk.text }}>Background</div>
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} className="flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5" style={{ background: tk.surfaceAlt, color: tk.text }}>
          <ImageIcon size={13} /> Upload
        </button>
        {settings.bgImage && (
          <button onClick={() => setSettings((s) => ({ ...s, bgImage: null }))} className="flex-1 text-xs py-1.5 rounded-lg" style={{ background: tk.surfaceAlt, color: "#FB7185" }}>Remove</button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const dataUrl = await fileToDataUrl(f);
        setSettings((s) => ({ ...s, bgImage: dataUrl }));
      }} />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Projects sidebar (left)                                                 */
/* ---------------------------------------------------------------------- */

function ProjectsSidebar({ tk, open, onClose, projects, tasks, onSelect, onCreate, onRename, onDelete, accent }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  if (!open) return null;

  const submit = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
  };

  return (
    <div className="fixed inset-0 z-[140] flex" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-72 h-full overflow-y-auto p-4" style={{ background: tk.surface, borderRight: `1px solid ${tk.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Projects</span>
          <IconBtn tk={tk} title="Close" onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div className="space-y-1 mb-4">
          {projects.length === 0 && <div className="text-xs" style={{ color: tk.textFaint }}>No projects yet.</div>}
          {projects.map((p) => {
            const count = tasks.filter((t) => t.projectId === p.id).length;
            const editing = editingId === p.id;
            return (
              <div key={p.id} className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: tk.surfaceAlt }}>
                {editing ? (
                  <input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && editValue.trim()) { onRename(p.id, editValue.trim()); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                    autoFocus className="flex-1 text-sm bg-transparent outline-none" style={{ color: tk.text }} />
                ) : (
                  <button onClick={() => onSelect(p.id)} className="flex-1 text-left text-sm truncate" style={{ color: tk.text }}>{p.name}</button>
                )}
                <span className="text-[10px]" style={{ color: tk.textFaint }}>{count}</span>
                <button onClick={() => { setEditingId(p.id); setEditValue(p.name); }} className="opacity-0 group-hover:opacity-100"><Pencil size={12} style={{ color: tk.textFaint }} /></button>
                <button onClick={() => onDelete(p.id)} className="opacity-0 group-hover:opacity-100"><Trash2 size={12} style={{ color: "#FB7185" }} /></button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="New project name…" className="flex-1 text-sm rounded-lg px-3 py-1.5 outline-none" style={{ background: tk.surfaceAlt, color: tk.text, border: `1px solid ${tk.border}` }} />
          <button onClick={submit} className="px-2.5 py-1.5 rounded-lg text-white" style={{ background: accent }}><Plus size={14} /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Project tree                                                            */
/* ---------------------------------------------------------------------- */

function TreeNode({ task, tasks, tk, onOpen, onAddChild }) {
  const children = tasks.filter((t) => t.parentTaskId === task.id);
  const done = task.status === "done";
  return (
    <div className="mb-2">
      <div className="group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-shadow"
        style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${PRIORITY_MAP[task.priority].color}`, boxShadow: tk.shadow, opacity: done ? 0.6 : 1 }}
        onClick={() => onOpen(task)}>
        <span className="text-sm flex-1 truncate" style={{ color: tk.text, textDecoration: done ? "line-through" : "none" }}>{task.title}</span>
        <Pill color={STATUS_MAP[task.status].color} tk={tk}>{STATUS_MAP[task.status].label}</Pill>
        <button onClick={(e) => { e.stopPropagation(); onAddChild(task.id); }} className="opacity-0 group-hover:opacity-100 shrink-0" title="Add sub-task">
          <Plus size={13} style={{ color: tk.textFaint }} />
        </button>
        <div className="hidden md:block absolute left-0 top-full mt-1 z-20 w-56 p-2.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
          style={{ background: tk.surface, border: `1px solid ${tk.border}`, boxShadow: tk.shadow, color: tk.textMuted }}>
          <div style={{ color: tk.text }} className="font-medium mb-1">{task.title}</div>
          {task.description && <div className="mb-1">{task.description}</div>}
          {task.dueDate && <div style={{ fontFamily: "IBM Plex Mono, monospace" }}>{fmtDate(task.dueDate)}</div>}
        </div>
      </div>
      {children.length > 0 && (
        <div className="ml-5 pl-4 mt-2" style={{ borderLeft: `2px solid ${tk.border}` }}>
          {children.map((c) => <TreeNode key={c.id} task={c} tasks={tasks} tk={tk} onOpen={onOpen} onAddChild={onAddChild} />)}
        </div>
      )}
    </div>
  );
}

function ProjectView({ project, tasks, tk, accent, onOpen, onAddTask, onRenameProject, onDeleteProject, onClose, orientation, setOrientation }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const roots = tasks.filter((t) => t.projectId === project.id && !t.parentTaskId);

  return (
    <div className="rounded-2xl p-4" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <IconBtn tk={tk} title="Back" onClick={onClose}><ChevronLeft size={16} /></IconBtn>
          {editing ? (
            <input value={nameValue} onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { onRenameProject(project.id, nameValue.trim() || project.name); setEditing(false); } }}
              onBlur={() => { onRenameProject(project.id, nameValue.trim() || project.name); setEditing(false); }}
              autoFocus className="text-lg font-bold bg-transparent outline-none" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }} />
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{project.name}</span>
              <Pencil size={13} style={{ color: tk.textFaint }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: tk.surfaceAlt }}>
            <button onClick={() => setOrientation("vertical")} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: orientation === "vertical" ? accent : "transparent", color: orientation === "vertical" ? "#fff" : tk.textMuted }}>Vertical</button>
            <button onClick={() => setOrientation("horizontal")} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: orientation === "horizontal" ? accent : "transparent", color: orientation === "horizontal" ? "#fff" : tk.textMuted }}>Horizontal</button>
          </div>
          <button onClick={() => onAddTask(project.id, null)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: accent }}>
            <Plus size={13} /> Add task
          </button>
          <IconBtn tk={tk} title="Delete project" onClick={() => onDeleteProject(project.id)}><Trash2 size={16} style={{ color: "#FB7185" }} /></IconBtn>
        </div>
      </div>

      {roots.length === 0 ? (
        <div className="text-center py-14 rounded-xl" style={{ border: `1px dashed ${tk.border}`, color: tk.textFaint }}>
          <div className="text-sm mb-3">No tasks in this project yet.</div>
          <button onClick={() => onAddTask(project.id, null)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: tk.surfaceAlt, color: tk.text }}>
            + Add the first task
          </button>
        </div>
      ) : orientation === "horizontal" ? (
        <div className="flex flex-wrap gap-4 items-start overflow-x-auto pb-2">
          {roots.map((t) => (
            <div key={t.id} className="min-w-[240px]">
              <TreeNode task={t} tasks={tasks} tk={tk} onOpen={onOpen} onAddChild={(pid) => onAddTask(project.id, pid)} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {roots.map((t) => <TreeNode key={t.id} task={t} tasks={tasks} tk={tk} onOpen={onOpen} onAddChild={(pid) => onAddTask(project.id, pid)} />)}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main App                                                                  */
/* ---------------------------------------------------------------------- */

export default function TaskManagerApp() {
  const [theme, setTheme] = useState("light");
  const [settings, setSettings] = useState({ accentColor: "#5B5BD6", bgImage: null });
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [orientation, setOrientation] = useState("vertical");
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", tag: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalTask, setModalTask] = useState(null);
  const [toast, setToast] = useState(null);
  const [calFocus, setCalFocus] = useState(new Date());
  const [calMode, setCalMode] = useState("month");
  const [sortKey, setSortKey] = useState("dueDate");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const fileImportRef = useRef(null);
  const tk = useThemeTokens(theme);
  const accent = settings.accentColor || "#5B5BD6";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("taskflow-state");
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawTasks = parsed.tasks?.length ? parsed.tasks : seedTasks();
        setTasks(rawTasks.map(normalizeTask));
        setCategories(mergeCategories(parsed.categories, DEFAULT_CATEGORIES));
        setProjects(parsed.projects || []);
        setTheme(parsed.theme || "light");
        setSettings(parsed.settings || { accentColor: "#5B5BD6", bgImage: null });
      } else setTasks(seedTasks().map(normalizeTask));
    } catch { setTasks(seedTasks().map(normalizeTask)); } finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try { localStorage.setItem("taskflow-state", JSON.stringify({ tasks, categories, projects, theme, settings })); } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [tasks, categories, projects, theme, settings, loaded]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };
  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags))], [tasks]);
  const taskMap = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (search && !`${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.tag && !t.tags.includes(filters.tag)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "dueDate") return (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity);
      if (sortKey === "priority") return PRIORITIES.findIndex((p) => p.key === b.priority) - PRIORITIES.findIndex((p) => p.key === a.priority);
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "category") return (a.category || "").localeCompare(b.category || "");
      return 0;
    });
    return list;
  }, [tasks, search, filters, sortKey]);

  const stats = useMemo(() => ({
    todo: tasks.filter((t) => t.status === "todo").length,
    waiting: tasks.filter((t) => t.status === "waiting").length,
    inprogress: tasks.filter((t) => t.status === "inprogress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => isOverdue(t)).length,
  }), [tasks]);

  const reminders = useMemo(() => tasks.filter((t) => dueSoon(t) || isOverdue(t)), [tasks]);

  const openNew = (defaults = {}) => setModalTask(emptyTask(defaults));
  const openEdit = (t) => setModalTask(t);

  const nextDueDate = (dueDate, freq) => {
    const d = new Date(dueDate);
    if (freq === "daily") d.setDate(d.getDate() + 1);
    if (freq === "weekly") d.setDate(d.getDate() + 7);
    if (freq === "monthly") d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  };

  const saveTask = (form) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === form.id);
      let next = exists ? prev.map((t) => (t.id === form.id ? form : t)) : [...prev, form];
      if (exists && form.status === "done" && form.recurring && form.dueDate) {
        const prevTask = prev.find((t) => t.id === form.id);
        if (prevTask.status !== "done") {
          next = [...next, emptyTask({
            title: form.title, description: form.description, priority: form.priority,
            category: form.category, tags: form.tags, assignee: form.assignee,
            recurring: form.recurring, dueDate: nextDueDate(form.dueDate, form.recurring.frequency),
          })];
        }
      }
      return next;
    });
    setModalTask(null);
    showToast(tasks.some((t) => t.id === form.id) ? "Task updated" : "Task created");
  };

  const deleteTask = (id) => { setTasks((prev) => prev.filter((t) => t.id !== id)); setModalTask(null); showToast("Task deleted"); };
  const duplicateTask = (form) => {
    const copy = { ...form, id: uid(), title: `${form.title} (copy)`, status: "todo", createdAt: new Date().toISOString(), completedAt: null };
    setTasks((prev) => [...prev, copy]); setModalTask(null); showToast("Task duplicated");
  };
  const moveTask = (id, status) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status, completedAt: status === "done" ? new Date().toISOString() : null } : t));
  const addTime = (taskId, minutes) => { setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, timeSpent: (t.timeSpent || 0) + minutes } : t)); showToast(`+${minutes} min logged`); };
  const rescheduleTask = (id, newIso) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, dueDate: newIso } : t));

  const createProject = (name) => { const p = { id: uid(), name, createdAt: new Date().toISOString() }; setProjects((prev) => [...prev, p]); showToast("Project created"); };
  const renameProject = (id, name) => setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
  const deleteProject = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.map((t) => t.projectId === id ? { ...t, projectId: null, parentTaskId: null } : t));
    if (activeProjectId === id) { setActiveProjectId(null); setView("dashboard"); }
    showToast("Project deleted");
  };
  const addTaskInProject = (projectId, parentTaskId) => openNew({ projectId, parentTaskId });
  const openProject = (id) => { setActiveProjectId(id); setView("project"); setProjectsOpen(false); };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ tasks, categories }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "taskflow-export.json"; a.click();
    URL.revokeObjectURL(url); showToast("Exported JSON");
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.tasks) setTasks((prev) => [...prev, ...parsed.tasks.map((t) => ({ ...t, id: uid() }))]);
        if (parsed.categories) setCategories((prev) => [...prev, ...parsed.categories.filter((c) => !prev.some((p) => p.name === c.name))]);
        showToast("Imported successfully");
      } catch { showToast("Import failed — invalid file"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const views = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
    { key: "board", label: "Board", icon: <LayoutGrid size={15} /> },
    { key: "list", label: "List", icon: <ListIcon size={15} /> },
    { key: "calendar", label: "Calendar", icon: <CalendarIcon size={15} /> },
  ];

  if (!loaded) return <div style={{ background: tk.bg, height: "100vh" }}><style>{FONTS}</style></div>;

  const outerStyle = settings.bgImage
    ? { backgroundImage: `linear-gradient(${tk.bg}D9, ${tk.bg}D9), url(${settings.bgImage})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif" }
    : { background: tk.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" };

  return (
    <div style={outerStyle}>
      <style>{FONTS}{`
        @keyframes fadein { from { opacity:0; transform: translate(-50%, 8px);} to { opacity:1; transform: translate(-50%,0);} }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${tk.textFaint}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${tk.border}; border-radius: 8px; }
      `}</style>

      <div className="sticky top-0 z-40 px-4 md:px-6 py-3" style={{ background: tk.bg + "EE", backdropFilter: "blur(8px)", borderBottom: `1px solid ${tk.border}` }}>
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mr-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: accent, fontFamily: "Sora, sans-serif" }}>T</div>
            <span className="text-sm font-bold hidden sm:block" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Taskflow</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto" style={{ background: tk.surfaceAlt }}>
            {views.map((v) => (
              <button key={v.key} onClick={() => setView(v.key)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition"
                style={{ background: view === v.key ? tk.surface : "transparent", color: view === v.key ? tk.text : tk.textMuted, boxShadow: view === v.key ? tk.shadow : "none" }}>
                {v.icon} <span className="hidden md:inline">{v.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-1.5 max-w-xs" style={{ background: tk.surfaceAlt }}>
            <Search size={14} style={{ color: tk.textFaint }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="bg-transparent text-xs outline-none flex-1" style={{ color: tk.text }} />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <IconBtn tk={tk} title="Projects" onClick={() => setProjectsOpen(true)} active={projectsOpen || view === "project"}><Layers size={16} /></IconBtn>
            {view !== "dashboard" && view !== "project" && (
              <IconBtn tk={tk} title="Filters" onClick={() => setFiltersOpen(true)} active={!!(filters.status || filters.priority || filters.category || filters.tag)}>
                <Filter size={16} />
              </IconBtn>
            )}
            <div className="relative">
              <IconBtn tk={tk} title="Customize" onClick={() => setCustomizeOpen((o) => !o)} active={customizeOpen}><Palette size={16} /></IconBtn>
              {customizeOpen && <CustomizePopover tk={tk} settings={settings} setSettings={setSettings} onClose={() => setCustomizeOpen(false)} />}
            </div>
            <div className="relative">
              <IconBtn tk={tk} title="Reminders" onClick={() => setReminderOpen((o) => !o)} active={reminderOpen}><Bell size={16} /></IconBtn>
              {reminders.length > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center text-white font-bold" style={{ background: "#FB7185" }}>{reminders.length}</span>}
              {reminderOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl overflow-hidden z-50" style={{ background: tk.surface, border: `1px solid ${tk.border}`, boxShadow: tk.shadow }}>
                  <div className="px-3 py-2 text-xs font-semibold" style={{ borderBottom: `1px solid ${tk.border}`, color: tk.text }}>Upcoming & overdue</div>
                  {reminders.length === 0 && <div className="px-3 py-4 text-xs text-center" style={{ color: tk.textFaint }}>Nothing due soon 🎉</div>}
                  {reminders.map((t) => (
                    <div key={t.id} onClick={() => { openEdit(t); setReminderOpen(false); }} className="px-3 py-2 text-xs cursor-pointer flex items-center gap-2" style={{ borderBottom: `1px solid ${tk.border}` }}
                      onMouseEnter={(e) => e.currentTarget.style.background = tk.hoverBg} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <AlertTriangle size={12} style={{ color: isOverdue(t) ? "#FB7185" : "#F5A524" }} />
                      <span className="flex-1 truncate" style={{ color: tk.text }}>{t.title}</span>
                      <span style={{ color: tk.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>{fmtDate(t.dueDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <IconBtn tk={tk} title="Export JSON" onClick={exportJSON}><Download size={16} /></IconBtn>
            <IconBtn tk={tk} title="Import JSON" onClick={() => fileImportRef.current?.click()}><Upload size={16} /></IconBtn>
            <input ref={fileImportRef} type="file" accept="application/json" className="hidden" onChange={importJSON} />
            <IconBtn tk={tk} title="Toggle theme" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</IconBtn>
            <button onClick={() => openNew()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: accent }}>
              <Plus size={14} /> <span className="hidden sm:inline">New task</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
        {view === "dashboard" && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <StatCard label="To do" value={stats.todo} color="#9CA3AF" icon={<Circle size={16} />} tk={tk} />
              <StatCard label="Waiting" value={stats.waiting} color="#A78BFA" icon={<Timer size={16} />} tk={tk} />
              <StatCard label="In progress" value={stats.inprogress} color={accent} icon={<Clock size={16} />} tk={tk} />
              <StatCard label="Completed" value={stats.done} color="#2DD4BF" icon={<CheckCircle2 size={16} />} tk={tk} />
              <StatCard label="Overdue" value={stats.overdue} color="#FB7185" icon={<AlertTriangle size={16} />} tk={tk} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><MomentumRing tasks={tasks} tk={tk} accent={accent} /></div>
              <Pomodoro tk={tk} tasks={tasks} onAddTime={addTime} accent={accent} />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Upcoming</div>
              <ListView tasks={filtered.filter((t) => t.status !== "done").slice(0, 6)} tk={tk} onOpen={openEdit} categories={categories} sortKey={sortKey} setSortKey={setSortKey} />
            </div>
          </div>
        )}

        {view === "board" && <BoardView tasks={filtered} tk={tk} onOpen={openEdit} onMove={moveTask} categories={categories} taskMap={taskMap} />}
        {view === "list" && <ListView tasks={filtered} tk={tk} onOpen={openEdit} categories={categories} sortKey={sortKey} setSortKey={setSortKey} />}
        {view === "calendar" && (
          <CalendarView tasks={filtered} tk={tk} onOpen={openEdit} focusDate={calFocus} setFocusDate={setCalFocus} mode={calMode} setMode={setCalMode}
            onCreateOnDate={(d) => openNew({ dueDate: d.toISOString() })} onReschedule={rescheduleTask} accent={accent} />
        )}
        {view === "project" && activeProjectId && projects.some((p) => p.id === activeProjectId) && (
          <ProjectView project={projects.find((p) => p.id === activeProjectId)} tasks={tasks} tk={tk} accent={accent}
            onOpen={openEdit} onAddTask={addTaskInProject} onRenameProject={renameProject} onDeleteProject={deleteProject}
            onClose={() => setView("dashboard")} orientation={orientation} setOrientation={setOrientation} />
        )}
      </div>

      <FilterSidebar tk={tk} open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} setFilters={setFilters} categories={categories} allTags={allTags} accent={accent} />
      <ProjectsSidebar tk={tk} open={projectsOpen} onClose={() => setProjectsOpen(false)} projects={projects} tasks={tasks}
        onSelect={openProject} onCreate={createProject} onRename={renameProject} onDelete={deleteProject} accent={accent} />

      {modalTask && (
        <TaskModal task={modalTask} tk={tk} categories={categories} allTasks={tasks} onClose={() => setModalTask(null)} onSave={saveTask} onDelete={deleteTask} onDuplicate={duplicateTask} accent={accent} />
      )}
      <Toast toast={toast} tk={tk} />
    </div>
  );
}
