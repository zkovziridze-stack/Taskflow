import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plus, Search, Moon, Sun, LayoutDashboard, LayoutGrid, List as ListIcon,
  Calendar as CalendarIcon, Bell, Filter, X, Trash2, Copy, Pencil,
  CheckCircle2, Circle, Clock, AlertTriangle, Tag as TagIcon, User,
  Paperclip, Repeat, ChevronLeft, ChevronRight, GripVertical, Check,
  Download, Upload, Timer, Play, Pause, RotateCcw, ChevronDown, Sparkles
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Tokens & constants                                                      */
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
  { key: "inprogress", label: "In Progress", color: "#5B5BD6" },
  { key: "done", label: "Done", color: "#2DD4BF" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

const DEFAULT_CATEGORIES = [
  { name: "Work", color: "#5B5BD6" },
  { name: "Personal", color: "#F5A524" },
  { name: "Growth", color: "#2DD4BF" },
  { name: "Admin", color: "#FB7185" },
];

const RECUR_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

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
function fmtTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

/* ---------------------------------------------------------------------- */
/* Seed data                                                               */
/* ---------------------------------------------------------------------- */

function seedTasks() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: uid(), title: "Redesign onboarding flow", description: "Simplify the 5-step signup into 2 steps.",
      priority: "high", status: "inprogress", dueDate: new Date(now + day * 1).toISOString(),
      category: "Work", tags: ["design", "ux"], assignee: "Nino", recurring: null,
      subtasks: [{ id: uid(), title: "Wireframes", done: true }, { id: uid(), title: "Review with team", done: false }],
      notes: "", attachments: [], timeSpent: 25, createdAt: new Date(now - day * 3).toISOString(), completedAt: null,
    },
    {
      id: uid(), title: "Quarterly supplier report", description: "Compile Q2 numbers for ABC & Alta.",
      priority: "high", status: "todo", dueDate: new Date(now - day * 1).toISOString(),
      category: "Work", tags: ["report"], assignee: "", recurring: null,
      subtasks: [], notes: "", attachments: [], timeSpent: 0, createdAt: new Date(now - day * 5).toISOString(), completedAt: null,
    },
    {
      id: uid(), title: "Morning run", description: "5k easy pace.",
      priority: "low", status: "todo", dueDate: new Date(now + day * 0.3).toISOString(),
      category: "Personal", tags: ["health"], assignee: "", recurring: { frequency: "daily" },
      subtasks: [], notes: "", attachments: [], timeSpent: 0, createdAt: new Date(now - day).toISOString(), completedAt: null,
    },
    {
      id: uid(), title: "Read: Atomic Habits — ch. 4", description: "",
      priority: "medium", status: "done", dueDate: new Date(now - day * 2).toISOString(),
      category: "Growth", tags: ["reading"], assignee: "", recurring: null,
      subtasks: [], notes: "Great chapter on identity-based habits.", attachments: [], timeSpent: 40,
      createdAt: new Date(now - day * 6).toISOString(), completedAt: new Date(now - day * 2).toISOString(),
    },
    {
      id: uid(), title: "Team sync — Caucasus region", description: "Weekly alignment call.",
      priority: "medium", status: "inprogress", dueDate: new Date(now + day * 2).toISOString(),
      category: "Work", tags: ["meeting"], assignee: "Team", recurring: { frequency: "weekly" },
      subtasks: [{ id: uid(), title: "Prep agenda", done: true }], notes: "", attachments: [],
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
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: color ? `${color}1A` : tk.surfaceAlt, color: color || tk.textMuted, ...style }}
    >
      {children}
    </span>
  );
}

function IconBtn({ onClick, title, children, tk, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg transition-colors"
      style={{ background: active ? tk.surfaceAlt : "transparent", color: tk.text }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = tk.hoverBg; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------- */
/* Toast                                                                    */
/* ---------------------------------------------------------------------- */

function Toast({ toast, tk }) {
  if (!toast) return null;
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 animate-[fadein_.2s_ease]"
      style={{ background: tk.text, color: tk.bg, boxShadow: tk.shadow }}
    >
      <Check size={15} /> {toast}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Stat card                                                               */
/* ---------------------------------------------------------------------- */

function StatCard({ label, value, color, icon, tk }) {
  return (
    <div className="rounded-2xl p-4 flex-1 min-w-[130px]" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: tk.textMuted }}>{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Momentum ring (signature element)                                       */
/* ---------------------------------------------------------------------- */

function MomentumRing({ tasks, tk }) {
  const total = tasks.length || 1;
  const done = tasks.filter((t) => t.status === "done").length;
  const inprog = tasks.filter((t) => t.status === "inprogress").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;
  const todo = Math.max(total - done - inprog, 0);

  const segs = [
    { v: done, color: "#2DD4BF" },
    { v: inprog, color: "#5B5BD6" },
    { v: overdue, color: "#FB7185" },
    { v: Math.max(todo - overdue, 0), color: tk.border },
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
          const el = (
            <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={s.color} strokeWidth="12"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
        <text x="64" y="70" textAnchor="middle" fill={tk.text} fontSize="22" fontWeight="700"
          transform="rotate(90 64 64)" style={{ fontFamily: "Sora, sans-serif" }}>{pct}%</text>
      </svg>
      <div className="flex-1">
        <div className="text-sm font-semibold mb-2" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Momentum</div>
        <div className="space-y-1.5">
          {[["Done", "#2DD4BF", done], ["In progress", "#5B5BD6", inprog], ["Overdue", "#FB7185", overdue], ["To do", tk.textFaint, Math.max(todo - overdue, 0)]].map(([label, color, v]) => (
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

function TaskCard({ task, tk, onOpen, onDragStart, categories, onQuickToggle }) {
  const overdue = isOverdue(task);
  const soon = dueSoon(task);
  const cat = categories.find((c) => c.name === task.category);
  const subDone = task.subtasks.filter((s) => s.done).length;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      className="rounded-xl p-3 mb-2.5 cursor-pointer group transition-shadow"
      style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${PRIORITY_MAP[task.priority].color}`, boxShadow: tk.shadow }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug" style={{ color: tk.text }}>{task.title}</div>
        <GripVertical size={14} style={{ color: tk.textFaint }} className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
      </div>
      {task.description && (
        <div className="text-xs mt-1 line-clamp-2" style={{ color: tk.textMuted }}>{task.description}</div>
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
        {task.subtasks.length > 0 && (
          <span>{subDone}/{task.subtasks.length}</span>
        )}
        {task.assignee && (
          <span className="flex items-center gap-1"><User size={11} />{task.assignee}</span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Board view                                                               */
/* ---------------------------------------------------------------------- */

function BoardView({ tasks, tk, onOpen, onMove, categories }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const onDragStart = (e, id) => e.dataTransfer.setData("text/plain", id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {STATUSES.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); onMove(id, col.key); setDragOverCol(null); }}
            className="rounded-2xl p-3 transition-colors"
            style={{ background: dragOverCol === col.key ? tk.surfaceAlt : "transparent", border: `1px dashed ${dragOverCol === col.key ? col.color : "transparent"}`, minHeight: 200 }}
          >
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{col.label}</span>
              <span className="text-xs ml-auto" style={{ color: tk.textFaint }}>{colTasks.length}</span>
            </div>
            {colTasks.map((t) => (
              <TaskCard key={t.id} task={t} tk={tk} onOpen={onOpen} onDragStart={onDragStart} categories={categories} />
            ))}
            {colTasks.length === 0 && (
              <div className="text-xs text-center py-8 rounded-xl" style={{ color: tk.textFaint, border: `1px dashed ${tk.border}` }}>No tasks</div>
            )}
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
    { key: "title", label: "Task" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "dueDate", label: "Due" },
    { key: "category", label: "Category" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="grid grid-cols-[1fr_110px_100px_130px_110px] px-4 py-2.5 text-xs font-semibold" style={{ borderBottom: `1px solid ${tk.border}`, color: tk.textMuted }}>
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
        return (
          <div key={t.id} onClick={() => onOpen(t)}
            className="grid grid-cols-[1fr_110px_100px_130px_110px] px-4 py-3 items-center cursor-pointer text-sm"
            style={{ borderBottom: `1px solid ${tk.border}` }}
            onMouseEnter={(e) => e.currentTarget.style.background = tk.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2 pr-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_MAP[t.priority].color }} />
              <span className="truncate" style={{ color: tk.text }}>{t.title}</span>
              {t.recurring && <Repeat size={12} style={{ color: tk.textFaint }} className="shrink-0" />}
            </div>
            <Pill color={STATUS_MAP[t.status].color} tk={tk}>{STATUS_MAP[t.status].label}</Pill>
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
/* Calendar view                                                            */
/* ---------------------------------------------------------------------- */

function CalendarView({ tasks, tk, onOpen, month, setMonth, onCreateOnDate }) {
  const year = month.getFullYear(), m = month.getMonth();
  const first = new Date(year, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const k = dateKey(t.dueDate);
      (map[k] = map[k] || []).push(t);
    });
    return map;
  }, [tasks]);

  const todayKey = dateKey(new Date());

  return (
    <div className="rounded-2xl p-4" style={{ background: tk.surface, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div className="flex gap-1">
          <IconBtn tk={tk} onClick={() => setMonth(new Date(year, m - 1, 1))} title="Previous"><ChevronLeft size={16} /></IconBtn>
          <IconBtn tk={tk} onClick={() => setMonth(new Date())} title="Today"><span className="text-xs px-1">Today</span></IconBtn>
          <IconBtn tk={tk} onClick={() => setMonth(new Date(year, m + 1, 1))} title="Next"><ChevronRight size={16} /></IconBtn>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[11px] font-medium py-1" style={{ color: tk.textFaint }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="rounded-lg" style={{ minHeight: 84 }} />;
          const k = `${year}-${pad(m + 1)}-${pad(d)}`;
          const dayTasks = byDate[k] || [];
          const isToday = k === todayKey;
          return (
            <div key={i} className="rounded-lg p-1.5 flex flex-col group"
              style={{ minHeight: 84, background: isToday ? tk.surfaceAlt : "transparent", border: `1px solid ${isToday ? "#5B5BD6" : tk.border}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: isToday ? "#5B5BD6" : tk.textMuted, fontFamily: "IBM Plex Mono, monospace" }}>{d}</span>
                <button onClick={() => onCreateOnDate(new Date(year, m, d))} className="opacity-0 group-hover:opacity-100 text-[10px]" style={{ color: tk.textFaint }}>
                  <Plus size={12} />
                </button>
              </div>
              <div className="flex-1 space-y-1 mt-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <div key={t.id} onClick={() => onOpen(t)} title={t.title}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer"
                    style={{ background: `${PRIORITY_MAP[t.priority].color}22`, color: tk.text }}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div className="text-[10px]" style={{ color: tk.textFaint }}>+{dayTasks.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Pomodoro widget                                                          */
/* ---------------------------------------------------------------------- */

function Pomodoro({ tk, tasks, onAddTime }) {
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
        <Timer size={15} style={{ color: "#5B5BD6" }} />
        <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Pomodoro</span>
        <span className="text-[11px] ml-auto px-2 py-0.5 rounded-full" style={{ background: tk.surfaceAlt, color: tk.textMuted }}>{mode === "focus" ? "Focus" : "Break"}</span>
      </div>
      <div className="text-center text-4xl font-bold py-3" style={{ color: tk.text, fontFamily: "IBM Plex Mono, monospace" }}>{mm}:{ss}</div>
      <select value={linkedTaskId} onChange={(e) => setLinkedTaskId(e.target.value)}
        className="w-full text-xs rounded-lg px-2 py-1.5 mb-3 outline-none"
        style={{ background: tk.surfaceAlt, color: tk.text, border: `1px solid ${tk.border}` }}>
        <option value="">Link to a task (optional)</option>
        {activeTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={() => setRunning((r) => !r)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#5B5BD6" }}>
          {running ? <Pause size={14} /> : <Play size={14} />} {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setSeconds(mode === "focus" ? 25 * 60 : 5 * 60); }}
          className="px-3 rounded-lg" style={{ background: tk.surfaceAlt, color: tk.text }}>
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
  dueDate: null, category: "", tags: [], assignee: "", recurring: null,
  subtasks: [], notes: "", attachments: [], timeSpent: 0,
  createdAt: new Date().toISOString(), completedAt: null, ...defaults,
});

function TaskModal({ task, tk, categories, onClose, onSave, onDelete, onDuplicate }) {
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

  const inputStyle = { background: tk.surfaceAlt, color: tk.text, border: `1px solid ${tk.border}` };
  const labelCls = "text-xs font-medium mb-1.5 block";

  return (
    <div className="fixed inset-0 z-[150] flex items-start md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-2xl md:rounded-2xl overflow-y-auto"
        style={{ background: tk.surface, maxHeight: "100vh", height: "100%", border: `1px solid ${tk.border}` }}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 z-10" style={{ background: tk.surface, borderBottom: `1px solid ${tk.border}` }}>
          <span className="text-sm font-semibold" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>{isNew ? "New task" : "Edit task"}</span>
          <div className="flex items-center gap-1">
            {!isNew && (
              <>
                <IconBtn tk={tk} title="Duplicate" onClick={() => onDuplicate(form)}><Copy size={16} /></IconBtn>
                <IconBtn tk={tk} title="Delete" onClick={() => onDelete(form.id)}><Trash2 size={16} style={{ color: "#FB7185" }} /></IconBtn>
              </>
            )}
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
                  <button key={p.key} onClick={() => update({ priority: p.key })}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition"
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
              <label className={labelCls} style={{ color: tk.textMuted }}>Category</label>
              <select value={form.category} onChange={(e) => update({ category: e.target.value })}
                className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: tk.textMuted }}>Assignee (optional)</label>
              <input value={form.assignee} onChange={(e) => update({ assignee: e.target.value })} placeholder="Name"
                className="w-full text-sm rounded-lg px-3 py-1.5 outline-none" style={inputStyle} />
            </div>
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
              {form.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <button onClick={() => update({ subtasks: form.subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}>
                    {s.done ? <CheckCircle2 size={16} style={{ color: "#2DD4BF" }} /> : <Circle size={16} style={{ color: tk.textFaint }} />}
                  </button>
                  <span className="flex-1 text-sm" style={{ color: s.done ? tk.textFaint : tk.text, textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
                  <X size={13} className="cursor-pointer opacity-0 group-hover:opacity-100" style={{ color: tk.textFaint }}
                    onClick={() => update({ subtasks: form.subtasks.filter((x) => x.id !== s.id) })} />
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
            <label className={labelCls} style={{ color: tk.textMuted }}>Notes</label>
            <textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={2} placeholder="Freeform notes…"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none" style={inputStyle} />
          </div>

          <div>
            <label className={labelCls} style={{ color: tk.textMuted }}>Attachments</label>
            <div className="space-y-1 mb-2">
              {form.attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: tk.surfaceAlt, color: tk.textMuted }}>
                  <Paperclip size={12} /> <span className="flex-1 truncate">{a.name}</span> <span>{(a.size / 1024).toFixed(0)}KB</span>
                  <X size={12} className="cursor-pointer" onClick={() => update({ attachments: form.attachments.filter((_, idx) => idx !== i) })} />
                </div>
              ))}
            </div>
            <label className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer" style={{ background: tk.surfaceAlt, color: tk.text, border: `1px dashed ${tk.border}` }}>
              <Paperclip size={13} /> Attach file
              <input type="file" multiple className="hidden" onChange={(e) => {
                const files = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
                update({ attachments: [...form.attachments, ...files] });
              }} />
            </label>
          </div>

          {form.timeSpent > 0 && (
            <div className="text-xs flex items-center gap-1.5" style={{ color: tk.textFaint }}>
              <Timer size={12} /> {form.timeSpent} min tracked
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 px-5 py-4" style={{ background: tk.surface, borderTop: `1px solid ${tk.border}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: tk.surfaceAlt, color: tk.text }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.title.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "#5B5BD6" }}>
            {isNew ? "Create task" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Filter bar                                                               */
/* ---------------------------------------------------------------------- */

function FilterBar({ tk, filters, setFilters, categories, allTags }) {
  const [open, setOpen] = useState(false);
  const active = filters.status || filters.priority || filters.category || filters.tag;

  const selCls = "text-xs rounded-lg px-2.5 py-1.5 outline-none";
  const selStyle = { background: tk.surfaceAlt, color: tk.text, border: `1px solid ${tk.border}` };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
        style={{ background: active ? "#5B5BD61A" : tk.surfaceAlt, color: active ? "#5B5BD6" : tk.text }}>
        <Filter size={13} /> Filters {active ? `(${[filters.status, filters.priority, filters.category, filters.tag].filter(Boolean).length})` : ""}
      </button>
      {open && (
        <>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={selCls} style={selStyle}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className={selCls} style={selStyle}>
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className={selCls} style={selStyle}>
            <option value="">Any category</option>
            {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <select value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className={selCls} style={selStyle}>
            <option value="">Any tag</option>
            {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
        </>
      )}
      {active && (
        <button onClick={() => setFilters({ status: "", priority: "", category: "", tag: "" })}
          className="text-xs flex items-center gap-1" style={{ color: tk.textFaint }}>
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main App                                                                  */
/* ---------------------------------------------------------------------- */

export default function TaskManagerApp() {
  const [theme, setTheme] = useState("light");
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", tag: "" });
  const [modalTask, setModalTask] = useState(null);
  const [toast, setToast] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [sortKey, setSortKey] = useState("dueDate");
  const [reminderOpen, setReminderOpen] = useState(false);
  const fileImportRef = useRef(null);

  const tk = useThemeTokens(theme);

  // ---- Load from persistent storage (browser localStorage) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem("taskflow-state");
      if (raw) {
        const parsed = JSON.parse(raw);
        setTasks(parsed.tasks?.length ? parsed.tasks : seedTasks());
        setCategories(parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES);
        setTheme(parsed.theme || "light");
      } else {
        setTasks(seedTasks());
      }
    } catch {
      setTasks(seedTasks());
    } finally {
      setLoaded(true);
    }
  }, []);

  // ---- Save to persistent storage (debounced) ----
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem("taskflow-state", JSON.stringify({ tasks, categories, theme }));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [tasks, categories, theme, loaded]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags))], [tasks]);

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
      // Handle recurring completion -> spawn next occurrence
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

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setModalTask(null);
    showToast("Task deleted");
  };

  const duplicateTask = (form) => {
    const copy = { ...form, id: uid(), title: `${form.title} (copy)`, status: "todo", createdAt: new Date().toISOString(), completedAt: null };
    setTasks((prev) => [...prev, copy]);
    setModalTask(null);
    showToast("Task duplicated");
  };

  const moveTask = (id, status) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status, completedAt: status === "done" ? new Date().toISOString() : null } : t));
  };

  const addTime = (taskId, minutes) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, timeSpent: (t.timeSpent || 0) + minutes } : t));
    showToast(`+${minutes} min logged`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ tasks, categories }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "taskflow-export.json"; a.click();
    URL.revokeObjectURL(url);
    showToast("Exported JSON");
  };

  const exportCSV = () => {
    const header = ["Title", "Status", "Priority", "Due", "Category", "Tags", "Assignee"];
    const rows = tasks.map((t) => [t.title, t.status, t.priority, t.dueDate || "", t.category, t.tags.join("|"), t.assignee]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "taskflow-export.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("Exported CSV");
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
    reader.readAsText(file);
    e.target.value = "";
  };

  const views = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
    { key: "board", label: "Board", icon: <LayoutGrid size={15} /> },
    { key: "list", label: "List", icon: <ListIcon size={15} /> },
    { key: "calendar", label: "Calendar", icon: <CalendarIcon size={15} /> },
  ];

  if (!loaded) {
    return <div style={{ background: tk.bg, height: "100vh" }} className="flex items-center justify-center text-sm" >
      <style>{FONTS}</style>
    </div>;
  }

  return (
    <div style={{ background: tk.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <style>{FONTS}{`
        @keyframes fadein { from { opacity:0; transform: translate(-50%, 8px);} to { opacity:1; transform: translate(-50%,0);} }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${tk.textFaint}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${tk.border}; border-radius: 8px; }
      `}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-40 px-4 md:px-6 py-3" style={{ background: tk.bg + "EE", backdropFilter: "blur(8px)", borderBottom: `1px solid ${tk.border}` }}>
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mr-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#5B5BD6", fontFamily: "Sora, sans-serif" }}>T</div>
            <span className="text-sm font-bold hidden sm:block" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Taskflow</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto" style={{ background: tk.surfaceAlt }}>
            {views.map((v) => (
              <button key={v.key} onClick={() => setView(v.key)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition"
                style={{ background: view === v.key ? tk.surface : "transparent", color: view === v.key ? tk.text : tk.textMuted, boxShadow: view === v.key ? tk.shadow : "none" }}>
                {v.icon} <span className="hidden md:inline">{v.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-1.5 max-w-xs" style={{ background: tk.surfaceAlt }}>
            <Search size={14} style={{ color: tk.textFaint }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
              className="bg-transparent text-xs outline-none flex-1" style={{ color: tk.text }} />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <IconBtn tk={tk} title="Reminders" onClick={() => setReminderOpen((o) => !o)} active={reminderOpen}>
                <Bell size={16} />
              </IconBtn>
              {reminders.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center text-white font-bold" style={{ background: "#FB7185" }}>{reminders.length}</span>
              )}
              {reminderOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl overflow-hidden z-50" style={{ background: tk.surface, border: `1px solid ${tk.border}`, boxShadow: tk.shadow }}>
                  <div className="px-3 py-2 text-xs font-semibold" style={{ borderBottom: `1px solid ${tk.border}`, color: tk.text }}>Upcoming & overdue</div>
                  {reminders.length === 0 && <div className="px-3 py-4 text-xs text-center" style={{ color: tk.textFaint }}>Nothing due soon 🎉</div>}
                  {reminders.map((t) => (
                    <div key={t.id} onClick={() => { openEdit(t); setReminderOpen(false); }} className="px-3 py-2 text-xs cursor-pointer flex items-center gap-2"
                      style={{ borderBottom: `1px solid ${tk.border}` }}
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
            <IconBtn tk={tk} title="Toggle theme" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </IconBtn>
            <button onClick={() => openNew()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#5B5BD6" }}>
              <Plus size={14} /> <span className="hidden sm:inline">New task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
        {view === "dashboard" && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <StatCard label="To do" value={stats.todo} color="#9CA3AF" icon={<Circle size={16} />} tk={tk} />
              <StatCard label="In progress" value={stats.inprogress} color="#5B5BD6" icon={<Clock size={16} />} tk={tk} />
              <StatCard label="Completed" value={stats.done} color="#2DD4BF" icon={<CheckCircle2 size={16} />} tk={tk} />
              <StatCard label="Overdue" value={stats.overdue} color="#FB7185" icon={<AlertTriangle size={16} />} tk={tk} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><MomentumRing tasks={tasks} tk={tk} /></div>
              <Pomodoro tk={tk} tasks={tasks} onAddTime={addTime} />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: tk.text, fontFamily: "Sora, sans-serif" }}>Upcoming</div>
              <ListView tasks={filtered.filter((t) => t.status !== "done").slice(0, 6)} tk={tk} onOpen={openEdit} categories={categories} sortKey={sortKey} setSortKey={setSortKey} />
            </div>
          </div>
        )}

        {view !== "dashboard" && (
          <FilterBar tk={tk} filters={filters} setFilters={setFilters} categories={categories} allTags={allTags} />
        )}

        {view === "board" && <BoardView tasks={filtered} tk={tk} onOpen={openEdit} onMove={moveTask} categories={categories} />}
        {view === "list" && <ListView tasks={filtered} tk={tk} onOpen={openEdit} categories={categories} sortKey={sortKey} setSortKey={setSortKey} />}
        {view === "calendar" && <CalendarView tasks={filtered} tk={tk} onOpen={openEdit} month={calMonth} setMonth={setCalMonth} onCreateOnDate={(d) => openNew({ dueDate: d.toISOString() })} />}
      </div>

      {modalTask && (
        <TaskModal task={modalTask} tk={tk} categories={categories} onClose={() => setModalTask(null)} onSave={saveTask} onDelete={deleteTask} onDuplicate={duplicateTask} />
      )}
      <Toast toast={toast} tk={tk} />
    </div>
  );
}
