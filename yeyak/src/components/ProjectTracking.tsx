import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format, addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus, Trash2, Edit2, X, CheckSquare, FileText, ChevronRight, Check
} from 'lucide-react';
import { Project, ProjectPhase, ProjectNote, Reservation, db, ALL_PARTICIPANTS } from '../lib/db';
import { getTeamColorClass, getTeamGanttColors } from '../lib/index';

const DAY_WIDTH = 28; // pixels per day column
const ROW_HEIGHT = 56; // pixels per project row
const LEFT_PANEL_WIDTH = 180; // pixels for the project list sidebar

const TODAY = startOfDay(new Date());
const TIMELINE_START = startOfDay(new Date(2026, 0, 1)); // Jan 1 2026
const TOTAL_DAYS = 365 * 3;

function dayOffset(dateStr: string): number {
  return differenceInCalendarDays(parseISO(dateStr), TIMELINE_START);
}

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-400',
  in_progress: 'bg-emerald-400',
  completed: 'bg-slate-400'
};

const STATUS_LABELS: Record<string, string> = {
  planned: '진행 예정',
  in_progress: '진행 중',
  completed: '완료'
};

type LogTab = 'all' | 'meeting' | 'note' | 'todo';

const LOG_TABS: { id: LogTab; label: string }[] = [
  { id: 'all', label: '전체로그' },
  { id: 'meeting', label: '회의' },
  { id: 'note', label: '메모' },
  { id: 'todo', label: '투두' }
];

// ─── Sub-components ────────────────────────────────────────────────────────

interface TodoItemsProps {
  note: ProjectNote;
  onChanged: () => void;
  compact?: boolean;
}

const TodoItems: React.FC<TodoItemsProps> = ({ note, onChanged, compact = false }) => {
  const [inputText, setInputText] = useState('');

  const toggleItem = async (itemId: string) => {
    const updated = note.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it);
    await db.updateProjectNoteItems(note.id, updated);
    onChanged();
  };

  const deleteItem = async (itemId: string) => {
    const updated = note.items.filter(it => it.id !== itemId);
    await db.updateProjectNoteItems(note.id, updated);
    onChanged();
  };

  const addItem = async () => {
    const text = inputText.trim();
    if (!text) return;
    const updated = [...note.items, { id: crypto.randomUUID(), text, done: false }];
    await db.updateProjectNoteItems(note.id, updated);
    setInputText('');
    onChanged();
  };

  return (
    <div className={compact ? 'space-y-0.5' : 'pl-4 space-y-1'}>
      {note.items.length === 0 && (
        <div className="text-muted-foreground text-[11px]">항목 없음</div>
      )}
      {note.items.map(item => (
        <div key={item.id} className="flex items-start gap-1.5 text-xs group">
          <button
            onClick={() => toggleItem(item.id)}
            className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition ${
              item.done ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
            }`}
          >
            {item.done && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
          <span className={`flex-1 break-words ${item.done ? 'line-through text-muted-foreground' : ''}`}>
            {item.text}
          </span>
          <button
            onClick={() => deleteItem(item.id)}
            className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5 pt-1">
        <input
          placeholder="추가..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          className="flex-1 h-7 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={addItem}
          className="h-7 px-2 text-xs border rounded bg-background hover:bg-muted transition"
        >+</button>
      </div>
    </div>
  );
};

// ─── Main ProjectTracking Component ────────────────────────────────────────

export const ProjectTracking: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);

  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<LogTab>('all');

  // Project form dialog
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '', status: 'planned' as Project['status'],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    teams: [] as string[], assignees: [] as string[]
  });

  // New note/todo form
  const [addingNote, setAddingNote] = useState<'note' | 'todo' | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', date: format(new Date(), 'yyyy-MM-dd'), itemText: '', items: [] as {id: string; text: string; done: boolean}[] });

  // Quick todo
  const [quickTodoProjectId, setQuickTodoProjectId] = useState('');
  const [quickTodoText, setQuickTodoText] = useState('');
  const [quickTodoDate, setQuickTodoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addingQuickTodo, setAddingQuickTodo] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [p, r, ph, n] = await Promise.all([
      db.getProjects(), db.getReservations(), db.getProjectPhases(), db.getProjectNotes()
    ]);
    setProjects(p);
    setReservations(r);
    setPhases(ph);
    setNotes(n);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll timeline to today on first load
  const [scrolled, setScrolled] = useState(false);
  const visibleProjects = useMemo(
    () => projects.filter(p => showCompleted || p.status !== 'completed'),
    [projects, showCompleted]
  );

  useEffect(() => {
    if (!timelineRef.current || scrolled || visibleProjects.length === 0) return;
    const offset = differenceInCalendarDays(TODAY, TIMELINE_START);
    timelineRef.current.scrollLeft = Math.max(0, (offset - 2) * DAY_WIDTH);
    setScrolled(true);
  }, [scrolled, visibleProjects.length]);

  // Indexed maps
  const phasesByProject = useMemo(() => {
    const m = new Map<string, ProjectPhase[]>();
    phases.forEach(ph => {
      if (!m.has(ph.projectId)) m.set(ph.projectId, []);
      m.get(ph.projectId)!.push(ph);
    });
    return m;
  }, [phases]);

  const resvsByProject = useMemo(() => {
    const m = new Map<string, Reservation[]>();
    reservations.forEach(r => {
      if (!r.projectId) return;
      if (!m.has(r.projectId)) m.set(r.projectId, []);
      m.get(r.projectId)!.push(r);
    });
    return m;
  }, [reservations]);

  const notesByProject = useMemo(() => {
    const m = new Map<string, ProjectNote[]>();
    notes.forEach(n => {
      if (!m.has(n.projectId)) m.set(n.projectId, []);
      m.get(n.projectId)!.push(n);
    });
    return m;
  }, [notes]);

  const allDays = useMemo(() =>
    Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(TIMELINE_START, i)),
    []
  );

  const totalWidth = TOTAL_DAYS * DAY_WIDTH;

  // ─── Project Form Handlers ────────────────────────────────────

  const openNewProject = () => {
    setEditingProject(null);
    setProjectForm({
      name: '', status: 'planned',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      teams: [], assignees: []
    });
    setProjectFormOpen(true);
  };

  const openEditProject = (p: Project) => {
    setEditingProject(p);
    setProjectForm({
      name: p.name, status: p.status,
      startDate: p.startDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: p.endDate || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      teams: p.teams, assignees: p.assignees
    });
    setProjectFormOpen(true);
    setSelectedProjectId(null);
  };

  const saveProject = async () => {
    const name = projectForm.name.trim();
    if (!name) { alert('프로젝트명을 입력하세요'); return; }
    if (editingProject) {
      const ok = await db.updateProject(editingProject.id, {
        name, status: projectForm.status,
        startDate: projectForm.startDate, endDate: projectForm.endDate,
        teams: projectForm.teams, assignees: projectForm.assignees
      });
      if (!ok) { alert('저장 실패'); return; }
    } else {
      const result = await db.createProject(name, {
        status: projectForm.status,
        startDate: projectForm.startDate, endDate: projectForm.endDate,
        teams: projectForm.teams, assignees: projectForm.assignees
      });
      if (!result) { alert('생성 실패 (중복 이름일 수 있어요)'); return; }
    }
    setProjectFormOpen(false);
    await load();
  };

  const deleteProject = async (p: Project) => {
    if (!confirm(`'${p.name}' 프로젝트를 삭제할까요?`)) return;
    await db.deleteProject(p.id);
    if (selectedProjectId === p.id) setSelectedProjectId(null);
    await load();
  };

  // ─── Note Handlers ───────────────────────────────────────────

  const saveNote = async (projectId: string) => {
    if (!addingNote) return;
    await db.createProjectNote({
      projectId, kind: addingNote,
      title: noteForm.title.trim(),
      content: noteForm.content,
      date: noteForm.date || null,
      items: addingNote === 'todo' ? noteForm.items : []
    });
    setAddingNote(null);
    setNoteForm({ title: '', content: '', date: format(new Date(), 'yyyy-MM-dd'), itemText: '', items: [] });
    await load();
  };

  const addNoteItem = () => {
    const text = noteForm.itemText.trim();
    if (!text) return;
    setNoteForm(f => ({
      ...f, itemText: '',
      items: [...f.items, { id: crypto.randomUUID(), text, done: false }]
    }));
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('삭제할까요?')) return;
    await db.deleteProjectNote(noteId);
    await load();
  };

  const saveQuickTodo = async () => {
    const projId = quickTodoProjectId || visibleProjects[0]?.id;
    if (!projId || !quickTodoText.trim()) return;
    await db.createProjectNote({
      projectId: projId, kind: 'todo',
      title: quickTodoText.trim(),
      date: quickTodoDate || null,
      items: [{ id: crypto.randomUUID(), text: quickTodoText.trim(), done: false }]
    });
    setQuickTodoText('');
    setAddingQuickTodo(false);
    await load();
  };

  // ─── Sidebar project groups ───────────────────────────────────

  const grouped = useMemo(() => ({
    in_progress: visibleProjects.filter(p => p.status === 'in_progress'),
    planned: visibleProjects.filter(p => p.status === 'planned'),
    completed: projects.filter(p => p.status === 'completed')
  }), [visibleProjects, projects]);

  // ─── Right sidebar: todos ─────────────────────────────────────

  const activeTodos = useMemo(() =>
    notes.filter(n => n.kind === 'todo' && n.date && n.items.length > 0 && !n.items.every(it => it.done)),
    [notes]
  );
  const todosByProject = useMemo(() => {
    const m = new Map<string, ProjectNote[]>();
    activeTodos.forEach(n => {
      if (!m.has(n.projectId)) m.set(n.projectId, []);
      m.get(n.projectId)!.push(n);
    });
    return m;
  }, [activeTodos]);

  // Selected project
  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId) || null, [projects, selectedProjectId]);
  const selectedProjectResvs = useMemo(() => {
    if (!selectedProjectId) return [];
    return (resvsByProject.get(selectedProjectId) || []).sort((a, b) => {
      const ak = `${a.date}${String(a.startHour).padStart(2,'0')}`;
      const bk = `${b.date}${String(b.startHour).padStart(2,'0')}`;
      return bk.localeCompare(ak);
    });
  }, [selectedProjectId, resvsByProject]);
  const selectedProjectNotes = useMemo(() => {
    if (!selectedProjectId) return [];
    return (notesByProject.get(selectedProjectId) || []).slice().sort((a, b) =>
      (b.date || b.createdAt).localeCompare(a.date || a.createdAt)
    );
  }, [selectedProjectId, notesByProject]);
  const selectedProjectLogs = useMemo(() => {
    const meetingLogs = selectedProjectResvs.map(r => ({
      id: r.id,
      type: 'meeting' as const,
      date: r.date,
      reservation: r
    }));
    const noteLogs = selectedProjectNotes.map(n => ({
      id: n.id,
      type: n.kind,
      date: n.date || n.createdAt.slice(0, 10),
      note: n
    }));
    return [...meetingLogs, ...noteLogs]
      .filter(log => activeLogTab === 'all' || log.type === activeLogTab)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activeLogTab, selectedProjectNotes, selectedProjectResvs]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_260px] gap-3 h-full">

      {/* Left sidebar: project list */}
      <aside className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={openNewProject}
            className="flex-1 inline-flex items-center justify-center gap-1 text-sm font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            새 프로젝트
          </button>
          <button
            onClick={() => {
              if (timelineRef.current) {
                const offset = differenceInCalendarDays(TODAY, TIMELINE_START);
                timelineRef.current.scrollLeft = Math.max(0, (offset - 2) * DAY_WIDTH);
              }
            }}
            className="text-sm font-semibold border px-3 py-2 rounded-lg hover:bg-muted transition"
          >
            오늘
          </button>
        </div>

        {([
          { title: '진행 중', list: grouped.in_progress, status: 'in_progress' },
          { title: '진행 예정', list: grouped.planned, status: 'planned' },
          { title: '완료', list: grouped.completed, status: 'completed' }
        ] as const).map(group => (
          <div key={group.title} className="border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[group.status]}`} />
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{group.list.length}</span>
            </div>
            <ul className="space-y-1">
              {group.list.length === 0 && (
                <li className="text-xs text-muted-foreground py-1">없음</li>
              )}
              {group.list.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent truncate transition ${
                      selectedProjectId === p.id ? 'bg-accent font-semibold' : ''
                    }`}
                    title={p.name}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <label className="flex items-center gap-2 text-xs text-muted-foreground px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={e => setShowCompleted(e.target.checked)}
            className="rounded border"
          />
          캘린더에 완료 프로젝트 표시
        </label>
      </aside>

      {/* Center: Gantt timeline */}
      <section className="border rounded-xl bg-card overflow-hidden flex flex-col">
        {visibleProjects.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            프로젝트가 없습니다. '새 프로젝트' 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="overflow-x-auto flex-1" ref={timelineRef}>
            <div style={{ width: LEFT_PANEL_WIDTH + totalWidth }} className="h-full">

              {/* Timeline header */}
              <div
                className="sticky top-0 z-20 bg-card border-b"
                style={{ width: LEFT_PANEL_WIDTH + totalWidth }}
              >
                <div className="flex">
                  <div
                    style={{ width: LEFT_PANEL_WIDTH }}
                    className="sticky left-0 z-30 shrink-0 border-r bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground"
                  >
                    프로젝트
                  </div>
                  <div className="relative" style={{ width: totalWidth, height: 44 }}>
                    {/* Month labels */}
                    <div className="absolute inset-x-0 top-0 h-5 flex">
                      {allDays.map((day, idx) => {
                        if (idx === 0 || day.getDate() === 1) {
                          const end = allDays.findIndex((d, i) => i > idx && (d.getMonth() !== day.getMonth() || d.getFullYear() !== day.getFullYear()));
                          const span = (end === -1 ? allDays.length : end) - idx;
                          return (
                            <div
                              key={idx}
                              style={{ width: span * DAY_WIDTH }}
                              className="border-r text-[11px] font-semibold text-foreground px-2 leading-5 shrink-0 truncate"
                            >
                              {format(day, 'yyyy년 M월', { locale: ko })}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {/* Day numbers */}
                    <div className="absolute inset-x-0 bottom-0 h-6 flex">
                      {allDays.map((day, idx) => {
                        const isToday = differenceInCalendarDays(day, TODAY) === 0;
                        const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={idx}
                            style={{ width: DAY_WIDTH }}
                            className={`shrink-0 text-center text-[10px] leading-6 border-r ${
                              isToday
                                ? 'bg-primary/10 text-primary font-bold'
                                : isWeekendDay
                                ? 'text-muted-foreground/60'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {day.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Project rows */}
              {visibleProjects.map(project => {
                const projectPhases = (phasesByProject.get(project.id) || []).slice().sort((a, b) =>
                  a.startDate < b.startDate ? -1 : 1
                );
                const projectResvs = resvsByProject.get(project.id) || [];
                const projectNotes = notesByProject.get(project.id) || [];
                const teamColors = getTeamGanttColors(project.teams[0] || '기타');
                const barHeight = Math.round(ROW_HEIGHT * 0.86);
                const barTop = Math.round((ROW_HEIGHT - barHeight) / 2);

                // Use phases if available, fallback to project dates
                const displayPhases = projectPhases.length > 0
                  ? projectPhases
                  : project.startDate
                    ? [{ id: `__fb_${project.id}`, projectId: project.id, name: '', startDate: project.startDate, endDate: project.endDate, sortOrder: 0 }]
                    : [];

                return (
                  <div key={project.id} className="flex border-b hover:bg-accent/10 transition" style={{ height: ROW_HEIGHT }}>
                    {/* Left sticky: project name */}
                    <div
                      style={{ width: LEFT_PANEL_WIDTH }}
                      className="sticky left-0 z-10 shrink-0 border-r px-3 py-2 flex items-center gap-2 cursor-pointer bg-card hover:bg-muted/40 transition"
                      onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[project.status]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{project.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {project.teams.slice(0, 3).map(t => (
                            <span key={t} className={`text-[9px] text-white px-1 rounded ${getTeamColorClass(t)}`}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gantt grid */}
                    <div className="relative" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                      {/* Background columns */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {allDays.map((day, idx) => {
                          const isToday = differenceInCalendarDays(day, TODAY) === 0;
                          const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={idx}
                              style={{ width: DAY_WIDTH }}
                              className={`shrink-0 border-r border-border/40 ${
                                isToday ? 'bg-primary/5' : isWeekendDay ? 'bg-muted/30' : ''
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Phase bars */}
                      {displayPhases.map((phase, phaseIdx) => {
                        const startOff = dayOffset(phase.startDate);
                        const endOff = phase.endDate ? dayOffset(phase.endDate) : allDays.length - 1;
                        if (endOff < 0 || startOff >= allDays.length) return null;
                        const clampedStart = Math.max(0, startOff);
                        const clampedEnd = Math.min(allDays.length - 1, endOff);
                        const left = clampedStart * DAY_WIDTH + 1;
                        const width = Math.max((clampedEnd - clampedStart + 1) * DAY_WIDTH - 2, 8);
                        const label = phase.name.trim() || (projectPhases.length === 0 ? project.name : `일정${phaseIdx + 1}`);
                        const isOngoing = !phase.endDate;
                        const assigneeText = project.assignees.length > 0
                          ? `담당자: ${project.assignees.join(', ')}`
                          : '담당자: 미지정';

                        return (
                          <div
                            key={phase.id}
                            className={`absolute rounded-md border-2 flex items-center px-2 cursor-pointer ${teamColors.bg30} ${teamColors.border} ${
                              project.status === 'completed' ? 'opacity-70' : ''
                            }`}
                            style={{ top: barTop, height: barHeight, left, width }}
                            onClick={() => setSelectedProjectId(project.id)}
                            title={`${label}${isOngoing ? ' · 진행중' : ''}\n${assigneeText}`}
                          >
                            <span className="text-[10px] font-semibold truncate text-foreground">
                              {label}{isOngoing ? ' · 진행중' : ''}
                            </span>
                          </div>
                        );
                      })}

                      {/* Reservation markers */}
                      {projectResvs.map(r => {
                        const off = dayOffset(r.date);
                        if (off < 0 || off >= allDays.length) return null;
                        const left = off * DAY_WIDTH + 4;
                        return (
                          <div
                            key={r.id}
                            title={`${r.date} ${formatTime(r.startHour, r.startMinute)}-${formatTime(r.endHour, r.endMinute)}: ${r.purpose}`}
                            className={`absolute rounded-sm text-[8px] text-white px-0.5 leading-4 truncate ${getTeamColorClass(r.teams[0] || '기타')} opacity-90 cursor-default shadow-sm`}
                            style={{ left, width: DAY_WIDTH - 8, height: 16, top: ROW_HEIGHT - 20 }}
                          >
                            {r.purpose}
                          </div>
                        );
                      })}

                      {/* Note/todo markers */}
                      {projectNotes.filter(n => n.date).map(n => {
                        const off = dayOffset(n.date!);
                        if (off < 0 || off >= allDays.length) return null;
                        const isTodo = n.kind === 'todo';
                        const left = off * DAY_WIDTH + DAY_WIDTH - 12;

                        return (
                          <div
                            key={n.id}
                            className={`absolute z-10 flex items-center justify-center rounded-sm border cursor-pointer hover:scale-125 transition ${
                              isTodo ? 'bg-primary/10 border-primary text-primary' : 'bg-amber-50 border-amber-400 text-amber-600'
                            }`}
                            style={{ left, top: 2, width: 10, height: 10 }}
                            title={n.title || (isTodo ? '투두' : '메모')}
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            {isTodo
                              ? <CheckSquare className="w-1.5 h-1.5" />
                              : <FileText className="w-1.5 h-1.5" />
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Right sidebar */}
      <aside className="space-y-3 overflow-y-auto max-h-[80vh]">

        {/* Quick todo add */}
        <div className="border rounded-lg p-3 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">투두리스트</h3>
            <span className="text-xs text-muted-foreground ml-auto">프로젝트별</span>
          </div>
          {addingQuickTodo ? (
            <div className="space-y-1.5 border rounded-md p-2 bg-muted/20">
              <select
                value={quickTodoProjectId || visibleProjects[0]?.id || ''}
                onChange={e => setQuickTodoProjectId(e.target.value)}
                className="w-full h-8 text-xs border rounded px-2 bg-background"
              >
                {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                placeholder="할 일"
                value={quickTodoText}
                onChange={e => setQuickTodoText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveQuickTodo(); } }}
                className="w-full h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input type="date" value={quickTodoDate} onChange={e => setQuickTodoDate(e.target.value)}
                className="w-full h-8 text-xs border rounded px-2 bg-background" />
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => { setAddingQuickTodo(false); setQuickTodoText(''); }}
                  className="h-7 text-xs border rounded px-2 hover:bg-muted transition">취소</button>
                <button onClick={saveQuickTodo}
                  className="h-7 text-xs border rounded px-2 bg-primary text-primary-foreground hover:bg-primary/90 transition">추가</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingQuickTodo(true)}
              className="w-full h-8 text-xs border rounded-lg hover:bg-muted transition font-medium flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> 투두 빠른 추가
            </button>
          )}

          <div className="space-y-2 mt-3">
            {visibleProjects.length === 0 && (
              <div className="text-xs text-muted-foreground py-2">프로젝트가 없습니다.</div>
            )}
            {visibleProjects.map(project => {
              const projectTodos = todosByProject.get(project.id) || [];
              if (projectTodos.length === 0) return null;
              const total = projectTodos.reduce((s, n) => s + n.items.length, 0);
              const done = projectTodos.reduce((s, n) => s + n.items.filter(it => it.done).length, 0);
              return (
                <details key={project.id} className="border rounded-md bg-background" open>
                  <summary className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer list-none">
                    <ChevronRight className="w-3 h-3 shrink-0 transition-transform [[open]>summary_&]:rotate-90" />
                    <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{done}/{total}</span>
                  </summary>
                  <div className="px-2 pb-2 space-y-2 border-t">
                    {projectTodos.map(n => (
                      <div key={n.id} className="pt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckSquare className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-[11px] font-medium truncate flex-1">{n.title || '투두'}</span>
                          {n.date && <span className="text-[10px] text-muted-foreground">{n.date}</span>}
                        </div>
                        <TodoItems note={n} onChanged={load} compact />
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
            {visibleProjects.every(p => (todosByProject.get(p.id) || []).length === 0) && visibleProjects.length > 0 && (
              <div className="text-xs text-muted-foreground py-2">활성 투두가 없습니다.</div>
            )}
          </div>
        </div>

        {/* Selected project detail */}
        {selectedProject && (
          <div className="border rounded-lg p-3 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedProject.status]}`} />
                <h3 className="text-sm font-semibold truncate">{selectedProject.name}</h3>
                <span className={`text-[10px] px-1.5 rounded ${
                  selectedProject.status === 'in_progress' ? 'bg-emerald-100 text-emerald-700' :
                  selectedProject.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {STATUS_LABELS[selectedProject.status]}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditProject(selectedProject)}
                  className="p-1 text-muted-foreground hover:text-foreground transition">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setSelectedProjectId(null); deleteProject(selectedProject); }}
                  className="p-1 text-muted-foreground hover:text-destructive transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {selectedProject.startDate} ~ {selectedProject.endDate || '진행중'}
            </div>

            {selectedProject.teams.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedProject.teams.map(t => (
                  <span key={t} className={`text-[10px] text-white px-1.5 rounded ${getTeamColorClass(t)}`}>{t}</span>
                ))}
              </div>
            )}

            {selectedProject.assignees.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedProject.assignees.map(a => (
                  <span key={a} className="text-[10px] px-1.5 py-0.5 rounded border bg-background">{a}</span>
                ))}
              </div>
            )}

            {/* Add note / todo */}
            <div className="border-t pt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  메모 / 투두 ({selectedProjectNotes.length})
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setAddingNote('note')}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <FileText className="w-3 h-3" />메모
                  </button>
                  <button onClick={() => setAddingNote('todo')}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <CheckSquare className="w-3 h-3" />투두
                  </button>
                </div>
              </div>

              {addingNote && (
                <div className="border rounded-md p-2 space-y-1.5 bg-muted/20">
                  <div className="text-xs font-semibold">{addingNote === 'todo' ? '새 투두' : '새 메모'}</div>
                  <input placeholder="제목 (선택)" value={noteForm.title} onChange={e => setNoteForm(f => ({...f, title: e.target.value}))}
                    className="w-full h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="date" value={noteForm.date} onChange={e => setNoteForm(f => ({...f, date: e.target.value}))}
                    className="w-full h-8 text-xs border rounded px-2 bg-background" />
                  {addingNote === 'note' ? (
                    <textarea placeholder="내용" value={noteForm.content} onChange={e => setNoteForm(f => ({...f, content: e.target.value}))}
                      className="w-full text-xs border rounded px-2 py-1 bg-background resize-none min-h-[60px]" />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <input placeholder="할 일 추가 후 Enter" value={noteForm.itemText}
                          onChange={e => setNoteForm(f => ({...f, itemText: e.target.value}))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNoteItem(); } }}
                          className="flex-1 h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                        <button onClick={addNoteItem} className="h-8 px-2 text-xs border rounded hover:bg-muted">+</button>
                      </div>
                      <ul className="space-y-0.5">
                        {noteForm.items.map((item, idx) => (
                          <li key={item.id} className="flex items-center gap-1 text-xs">
                            <span className="flex-1 truncate">• {item.text}</span>
                            <button onClick={() => setNoteForm(f => ({...f, items: f.items.filter((_, i) => i !== idx)}))}
                              className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => setAddingNote(null)} className="h-7 text-xs border rounded px-2 hover:bg-muted transition">취소</button>
                    <button onClick={() => saveNote(selectedProject.id)} className="h-7 text-xs border rounded px-2 bg-primary text-primary-foreground hover:bg-primary/90 transition">추가</button>
                  </div>
                </div>
              )}

            </div>

            {/* Project logs */}
            <div className="border-t pt-2 space-y-2">
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
                {LOG_TABS.map(tab => {
                  const count = tab.id === 'all'
                    ? selectedProjectResvs.length + selectedProjectNotes.length
                    : tab.id === 'meeting'
                    ? selectedProjectResvs.length
                    : selectedProjectNotes.filter(n => n.kind === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveLogTab(tab.id)}
                      className={`rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                        activeLogTab === tab.id
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label} {count}
                    </button>
                  );
                })}
              </div>

              <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                {selectedProjectLogs.map(log => {
                  if (log.type === 'meeting') {
                    const r = log.reservation;
                    return (
                      <li key={log.id} className="flex items-start gap-2 px-2 py-2 text-xs border rounded-md">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${getTeamColorClass(r.teams[0] || '기타')}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{r.date} {formatTime(r.startHour, r.startMinute)}-{formatTime(r.endHour, r.endMinute)}</div>
                          <div className="truncate">{r.purpose}</div>
                          <div className="text-muted-foreground truncate">{r.room}{r.teams.length > 0 ? ` · ${r.teams.join(', ')}` : ''}</div>
                        </div>
                      </li>
                    );
                  }

                  const n = log.note;
                  return (
                    <li key={log.id} className="border rounded-md p-2 text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        {n.kind === 'todo'
                          ? <CheckSquare className="w-3 h-3 text-primary shrink-0" />
                          : <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                        }
                        <span className="font-semibold truncate flex-1">{n.title || (n.kind === 'todo' ? '투두' : '메모')}</span>
                        <span className="text-muted-foreground shrink-0">{log.date}</span>
                        <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {n.kind === 'note' && n.content && (
                        <div className="whitespace-pre-wrap break-words text-foreground/80 pl-4">{n.content}</div>
                      )}
                      {n.kind === 'todo' && <TodoItems note={n} onChanged={load} />}
                    </li>
                  );
                })}
                {selectedProjectLogs.length === 0 && (
                  <li className="text-xs text-muted-foreground py-4 text-center border rounded-md">
                    표시할 로그가 없습니다.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </aside>

      {/* Project Form Dialog */}
      {projectFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-bold">{editingProject ? '프로젝트 수정' : '새 프로젝트'}</h2>
              <button onClick={() => setProjectFormOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">프로젝트명</label>
                <input value={projectForm.name} onChange={e => setProjectForm(f => ({...f, name: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block">시작일</label>
                  <input type="date" value={projectForm.startDate} onChange={e => setProjectForm(f => ({...f, startDate: e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block">종료일</label>
                  <input type="date" value={projectForm.endDate || ''} onChange={e => setProjectForm(f => ({...f, endDate: e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">상태</label>
                <select value={projectForm.status} onChange={e => setProjectForm(f => ({...f, status: e.target.value as Project['status']}))}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="planned">진행 예정</option>
                  <option value="in_progress">진행 중</option>
                  <option value="completed">완료</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">귀속 팀</label>
                <div className="flex flex-wrap gap-2">
                  {['전체', 'C레벨', 'FE', 'BE', 'APP', 'EVE'].map(t => {
                    const sel = projectForm.teams.includes(t);
                    return (
                      <button key={t} type="button"
                        onClick={() => setProjectForm(f => ({...f, teams: sel ? f.teams.filter(x => x !== t) : [...f.teams, t]}))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${sel ? `${getTeamColorClass(t)} text-white border-transparent` : 'bg-background hover:bg-muted'}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">담당자</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PARTICIPANTS.map(name => {
                    const sel = projectForm.assignees.includes(name);
                    return (
                      <button key={name} type="button"
                        onClick={() => setProjectForm(f => ({...f, assignees: sel ? f.assignees.filter(x => x !== name) : [...f.assignees, name]}))}
                        className={`text-xs px-2 py-1 rounded-md border transition ${sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="border-t px-5 py-4 flex gap-2 justify-end bg-slate-50/50">
              {editingProject && (
                <button onClick={() => deleteProject(editingProject)}
                  className="mr-auto inline-flex items-center gap-1 text-sm font-semibold text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg">
                  <Trash2 className="w-4 h-4" />삭제
                </button>
              )}
              <button onClick={() => setProjectFormOpen(false)}
                className="text-sm font-semibold border px-4 py-2 rounded-lg hover:bg-muted transition">취소</button>
              <button onClick={saveProject}
                className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition shadow-sm">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
