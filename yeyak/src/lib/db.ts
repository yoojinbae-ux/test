import { createClient } from '@supabase/supabase-js';

// Setup Supabase credentials (if they exist in .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Database Types
export interface Project {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  teams: string[];
  assignees: string[];
  status: 'planned' | 'in_progress' | 'completed';
  statusChangedAt?: string;
  createdAt?: string;
}

export interface Reservation {
  id: string;
  room: '회의실' | '뒤주';
  date: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  purpose: string;
  teams: string[];
  projectId: string | null;
  projectName?: string; // dynamically joined
  participants: string[];
  attendance: Record<string, 'online' | 'onsite' | null>;
  notes: string;
  createdAt?: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  kind: 'note' | 'todo';
  title: string;
  content?: string;
  date: string | null;
  items: { id: string; text: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
}

type SupabaseUpdates = Record<string, string | string[] | number | null>;

// Fixed team dictionary
export const TEAM_MEMBERS: Record<string, string[]> = {
  전체: ['김명훈', '박지호', '김재진', '최우석', '이창욱', '김민성', '류주헌', '김윤하', '임성수', '배유진', '박성헌'],
  C레벨: ['김명훈', '박지호'],
  FE: ['김재진', '최우석', '이창욱'],
  BE: ['김민성', '류주헌', '박지호'],
  APP: ['박성헌'],
  EVE: ['김윤하', '임성수', '배유진']
};

export const ALL_PARTICIPANTS = TEAM_MEMBERS.전체;

// Default Seed Data for Local Storage
const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: '수콘분청',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    teams: ['FE', 'BE'],
    assignees: ['김재진', '김민성'],
    status: 'in_progress',
    statusChangedAt: '2026-05-01T09:00:00.000Z',
    createdAt: '2026-05-01T09:00:00.000Z'
  },
  {
    id: 'proj-2',
    name: '포치타',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    teams: ['APP'],
    assignees: ['박성헌'],
    status: 'planned',
    statusChangedAt: '2026-05-10T10:00:00.000Z',
    createdAt: '2026-05-10T10:00:00.000Z'
  },
  {
    id: 'proj-3',
    name: '페이빌더',
    startDate: '2026-04-01',
    endDate: '2026-05-28',
    teams: ['BE', 'EVE'],
    assignees: ['류주헌', '김윤하'],
    status: 'completed',
    statusChangedAt: '2026-05-28T18:00:00.000Z',
    createdAt: '2026-04-01T09:00:00.000Z'
  }
];

const DEFAULT_RESERVATIONS: Reservation[] = [
  // Monday Holiday
  {
    id: 'resv-1',
    room: '회의실',
    date: '2026-05-25',
    startHour: 8,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
    purpose: '공휴일',
    teams: ['전체'],
    projectId: null,
    participants: [...TEAM_MEMBERS.전체],
    attendance: {},
    notes: '공휴일 전사 휴무'
  },
  // FE daily stands
  ...['2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'].map((date, idx) => ({
    id: `resv-fe-daily-${idx}`,
    room: '회의실' as const,
    date,
    startHour: 10,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    purpose: 'daily',
    teams: ['FE'],
    projectId: null,
    participants: [...TEAM_MEMBERS.FE],
    attendance: {},
    notes: 'FE 일일 스크럼'
  })),
  // BE & APP stands
  ...['2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'].map((date, idx) => ({
    id: `resv-beapp-daily-${idx}`,
    room: '회의실' as const,
    date,
    startHour: 11,
    startMinute: 0,
    endHour: 11,
    endMinute: 45,
    purpose: 'BEAPP 조간회의',
    teams: ['BE', 'APP'],
    projectId: null,
    participants: [...TEAM_MEMBERS.BE, ...TEAM_MEMBERS.APP],
    attendance: {},
    notes: 'BE & APP 주간 진행 상황 공유 및 이슈 체크'
  })),
  // EVE daily stands
  ...['2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'].map((date, idx) => ({
    id: `resv-eve-daily-${idx}`,
    room: '회의실' as const,
    date,
    startHour: 11,
    startMinute: 45,
    endHour: 12,
    endMinute: 30,
    purpose: '이보이 데일리 미팅',
    teams: ['EVE'],
    projectId: null,
    participants: [...TEAM_MEMBERS.EVE],
    attendance: {},
    notes: 'EVE 데일리 미팅'
  })),
  // Tuesday custom bookings
  {
    id: 'resv-tiki-1',
    room: '뒤주',
    date: '2026-05-26',
    startHour: 14,
    startMinute: 0,
    endHour: 14,
    endMinute: 40,
    purpose: '대치브랜치 도입 관련 티키타 운영 정책 수립',
    teams: ['EVE'],
    projectId: null,
    participants: [...TEAM_MEMBERS.EVE],
    attendance: {},
    notes: '대치브랜치 도입 관련 세부 정책 수립 및 토의'
  },
  {
    id: 'resv-company-pass-1',
    room: '회의실',
    date: '2026-05-26',
    startHour: 15,
    startMinute: 40,
    endHour: 17,
    endMinute: 20,
    purpose: '회사패 개선 범위 논의',
    teams: ['FE'],
    projectId: 'proj-1', // 수콘분청
    participants: [...TEAM_MEMBERS.FE],
    attendance: {},
    notes: '수업 생성 시 회사패 개선 항목들의 범위에 대하여 최종 논의 진행'
  },
  // Wednesday custom bookings
  {
    id: 'resv-review-1',
    room: '회의실',
    date: '2026-05-27',
    startHour: 15,
    startMinute: 40,
    endHour: 16,
    endMinute: 30,
    purpose: '수업선택자 로우파이 리뷰',
    teams: ['FE'],
    projectId: 'proj-1', // 수콘분청
    participants: [...TEAM_MEMBERS.FE],
    attendance: {},
    notes: '수콘분청 피그마 로우파이 디자인 리뷰'
  },
  // Thursday custom bookings
  {
    id: 'resv-attendance-1',
    room: '뒤주',
    date: '2026-05-28',
    startHour: 14,
    startMinute: 0,
    endHour: 14,
    endMinute: 50,
    purpose: '출결+알림 개선',
    teams: ['BE'],
    projectId: 'proj-3', // 페이빌더
    participants: [...TEAM_MEMBERS.BE],
    attendance: {},
    notes: '[EVE-출결-알림] 개선 사항 구현 설계 회의'
  },
  {
    id: 'resv-puda-1',
    room: '뒤주',
    date: '2026-05-28',
    startHour: 15,
    startMinute: 0,
    endHour: 15,
    endMinute: 40,
    purpose: '하다',
    teams: ['APP'],
    projectId: 'proj-2', // 포치타
    participants: [...TEAM_MEMBERS.APP],
    attendance: {},
    notes: '[027-푸다] 하다 릴리즈 일정 조율'
  },
  {
    id: 'resv-improve-1',
    room: '회의실',
    date: '2026-05-28',
    startHour: 15,
    startMinute: 40,
    endHour: 16,
    endMinute: 0,
    purpose: '개선 방안 논의',
    teams: ['FE'],
    projectId: 'proj-1', // 수콘분청
    participants: [...TEAM_MEMBERS.FE],
    attendance: {},
    notes: '수업 생성 개선 범위 추가 논의'
  }
];

const DEFAULT_PHASES: ProjectPhase[] = [
  { id: 'phase-1', projectId: 'proj-1', name: '요구사항 기획 및 분석', startDate: '2026-05-01', endDate: '2026-05-15', sortOrder: 0 },
  { id: 'phase-2', projectId: 'proj-1', name: '와이어프레임 설계', startDate: '2026-05-16', endDate: '2026-05-27', sortOrder: 1 },
  { id: 'phase-3', projectId: 'proj-1', name: 'UI 디자인 및 구현', startDate: '2026-05-28', endDate: '2026-06-30', sortOrder: 2 }
];

const DEFAULT_NOTES: ProjectNote[] = [
  {
    id: 'note-1',
    projectId: 'proj-1',
    kind: 'note',
    title: '디자인 피드백 메모',
    content: '수업선택자 로우파이 시안 관련해서 UI 구조가 너무 복잡하다는 의견이 있었음. 다음 스프린트에서 수정 예정. https://figma.com/file/sample',
    date: '2026-05-27',
    items: [],
    createdAt: '2026-05-27T16:30:00.000Z',
    updatedAt: '2026-05-27T16:30:00.000Z'
  },
  {
    id: 'todo-1',
    projectId: 'proj-1',
    kind: 'todo',
    title: 'FE 퍼블리싱 이슈 체크',
    date: '2026-05-29',
    items: [
      { id: 'item-1', text: '헤더 컴포넌트 반응형 패딩 수정', done: true },
      { id: 'item-2', text: '회의실 선택 셀렉트박스 보더 라운드값 조절', done: false }
    ],
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-29T11:00:00.000Z'
  }
];

// Helper to initialize local storage data if empty
function initializeLocalStorage() {
  if (!localStorage.getItem('yeyak_projects')) {
    localStorage.setItem('yeyak_projects', JSON.stringify(DEFAULT_PROJECTS));
  }
  if (!localStorage.getItem('yeyak_reservations')) {
    localStorage.setItem('yeyak_reservations', JSON.stringify(DEFAULT_RESERVATIONS));
  }
  if (!localStorage.getItem('yeyak_phases')) {
    localStorage.setItem('yeyak_phases', JSON.stringify(DEFAULT_PHASES));
  }
  if (!localStorage.getItem('yeyak_notes')) {
    localStorage.setItem('yeyak_notes', JSON.stringify(DEFAULT_NOTES));
  }
}

// Database client API routing
export const db = {
  async getProjects(): Promise<Project[]> {
    if (supabase) {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
      if (error) { console.error(error); return []; }
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.start_date,
        endDate: p.end_date,
        teams: p.teams || [],
        assignees: p.assignees || [],
        status: p.status,
        statusChangedAt: p.status_changed_at,
        createdAt: p.created_at
      }));
    } else {
      initializeLocalStorage();
      return JSON.parse(localStorage.getItem('yeyak_projects') || '[]');
    }
  },

  async createProject(name: string, fields: Partial<Project>): Promise<Project | null> {
    if (supabase) {
      const p = {
        name,
        start_date: fields.startDate,
        end_date: fields.endDate,
        teams: fields.teams || [],
        assignees: fields.assignees || [],
        status: fields.status || 'planned'
      };
      const { data, error } = await supabase.from('projects').insert(p).select().single();
      if (error) { console.error(error); return null; }
      return {
        id: data.id,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        teams: data.teams,
        assignees: data.assignees,
        status: data.status,
        statusChangedAt: data.status_changed_at,
        createdAt: data.created_at
      };
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_projects') || '[]');
      if (list.some((p: Project) => p.name === name)) {
        return null; // duplicate name
      }
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name,
        startDate: fields.startDate || new Date().toISOString().slice(0, 10),
        endDate: fields.endDate || null,
        teams: fields.teams || [],
        assignees: fields.assignees || [],
        status: fields.status || 'planned',
        statusChangedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      list.push(newProj);
      localStorage.setItem('yeyak_projects', JSON.stringify(list));
      return newProj;
    }
  },

  async updateProject(id: string, fields: Partial<Project>): Promise<boolean> {
    if (supabase) {
      const updates: SupabaseUpdates = {};
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.startDate !== undefined) updates.start_date = fields.startDate;
      if (fields.endDate !== undefined) updates.end_date = fields.endDate;
      if (fields.teams !== undefined) updates.teams = fields.teams;
      if (fields.assignees !== undefined) updates.assignees = fields.assignees;
      if (fields.status !== undefined) {
        updates.status = fields.status;
        updates.status_changed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('projects').update(updates).eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_projects') || '[]');
      const idx = list.findIndex((p: Project) => p.id === id);
      if (idx === -1) return false;
      const updated = {
        ...list[idx],
        ...fields,
        statusChangedAt: fields.status !== undefined ? new Date().toISOString() : list[idx].statusChangedAt
      };
      list[idx] = updated;
      localStorage.setItem('yeyak_projects', JSON.stringify(list));
      return true;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      let list = JSON.parse(localStorage.getItem('yeyak_projects') || '[]');
      list = list.filter((p: Project) => p.id !== id);
      localStorage.setItem('yeyak_projects', JSON.stringify(list));
      return true;
    }
  },

  async getReservations(): Promise<Reservation[]> {
    if (supabase) {
      const [resvsRes, projsRes] = await Promise.all([
        supabase.from('reservations').select('*').order('date', { ascending: true }),
        this.getProjects()
      ]);
      if (resvsRes.error) { console.error(resvsRes.error); return []; }
      const projMap = new Map(projsRes.map(p => [p.id, p.name]));
      return (resvsRes.data || []).map(r => ({
        id: r.id,
        room: r.room,
        date: r.date,
        startHour: r.start_hour,
        startMinute: r.start_minute,
        endHour: r.end_hour,
        endMinute: r.end_minute,
        purpose: r.purpose,
        teams: r.teams || [],
        projectId: r.project_id,
        projectName: r.project_id ? projMap.get(r.project_id) : undefined,
        participants: r.participants || [],
        attendance: r.attendance || {},
        notes: r.notes || '',
        createdAt: r.created_at
      }));
    } else {
      initializeLocalStorage();
      const resvs = JSON.parse(localStorage.getItem('yeyak_reservations') || '[]');
      const projs = JSON.parse(localStorage.getItem('yeyak_projects') || '[]');
      const projMap = new Map(projs.map((p: Project) => [p.id, p.name]));
      return resvs.map((r: Reservation) => ({
        ...r,
        projectName: r.projectId ? projMap.get(r.projectId) : undefined
      }));
    }
  },

  async createReservation(resv: Omit<Reservation, 'id'>): Promise<Reservation | null> {
    if (supabase) {
      const data = {
        room: resv.room,
        date: resv.date,
        start_hour: resv.startHour,
        start_minute: resv.startMinute,
        end_hour: resv.endHour,
        end_minute: resv.endMinute,
        purpose: resv.purpose,
        teams: resv.teams,
        project_id: resv.projectId,
        participants: resv.participants,
        attendance: resv.attendance,
        notes: resv.notes
      };
      const { data: inserted, error } = await supabase.from('reservations').insert(data).select().single();
      if (error) { console.error(error); return null; }
      return {
        id: inserted.id,
        room: inserted.room,
        date: inserted.date,
        startHour: inserted.start_hour,
        startMinute: inserted.start_minute,
        endHour: inserted.end_hour,
        endMinute: inserted.end_minute,
        purpose: inserted.purpose,
        teams: inserted.teams,
        projectId: inserted.project_id,
        participants: inserted.participants,
        attendance: inserted.attendance,
        notes: inserted.notes,
        createdAt: inserted.created_at
      };
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_reservations') || '[]');
      const newResv: Reservation = {
        ...resv,
        id: `resv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      };
      list.push(newResv);
      localStorage.setItem('yeyak_reservations', JSON.stringify(list));
      return newResv;
    }
  },

  async deleteReservation(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('reservations').delete().eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      let list = JSON.parse(localStorage.getItem('yeyak_reservations') || '[]');
      list = list.filter((r: Reservation) => r.id !== id);
      localStorage.setItem('yeyak_reservations', JSON.stringify(list));
      return true;
    }
  },

  async updateReservationAttendance(id: string, attendance: Record<string, 'online' | 'onsite' | null>): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('reservations').update({ attendance }).eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_reservations') || '[]');
      const idx = list.findIndex((r: Reservation) => r.id === id);
      if (idx === -1) return false;
      list[idx].attendance = attendance;
      localStorage.setItem('yeyak_reservations', JSON.stringify(list));
      return true;
    }
  },

  async getProjectPhases(): Promise<ProjectPhase[]> {
    if (supabase) {
      const { data, error } = await supabase.from('project_phases').select('*').order('sort_order', { ascending: true }).order('start_date', { ascending: true });
      if (error) { console.error(error); return []; }
      return (data || []).map(p => ({
        id: p.id,
        projectId: p.project_id,
        name: p.name,
        startDate: p.start_date,
        endDate: p.end_date,
        sortOrder: p.sort_order
      }));
    } else {
      initializeLocalStorage();
      return JSON.parse(localStorage.getItem('yeyak_phases') || '[]');
    }
  },

  async createProjectPhase(phase: Omit<ProjectPhase, 'id'>): Promise<ProjectPhase | null> {
    if (supabase) {
      const data = {
        project_id: phase.projectId,
        name: phase.name,
        start_date: phase.startDate,
        end_date: phase.endDate,
        sort_order: phase.sortOrder
      };
      const { data: inserted, error } = await supabase.from('project_phases').insert(data).select().single();
      if (error) { console.error(error); return null; }
      return {
        id: inserted.id,
        projectId: inserted.project_id,
        name: inserted.name,
        startDate: inserted.start_date,
        endDate: inserted.end_date,
        sortOrder: inserted.sort_order
      };
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_phases') || '[]');
      const newPhase: ProjectPhase = {
        ...phase,
        id: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      };
      list.push(newPhase);
      localStorage.setItem('yeyak_phases', JSON.stringify(list));
      return newPhase;
    }
  },

  async updateProjectPhase(id: string, fields: Partial<ProjectPhase>): Promise<boolean> {
    if (supabase) {
      const updates: SupabaseUpdates = {};
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.startDate !== undefined) updates.start_date = fields.startDate;
      if (fields.endDate !== undefined) updates.end_date = fields.endDate;
      if (fields.sortOrder !== undefined) updates.sort_order = fields.sortOrder;
      const { error } = await supabase.from('project_phases').update(updates).eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_phases') || '[]');
      const idx = list.findIndex((p: ProjectPhase) => p.id === id);
      if (idx === -1) return false;
      list[idx] = { ...list[idx], ...fields };
      localStorage.setItem('yeyak_phases', JSON.stringify(list));
      return true;
    }
  },

  async deleteProjectPhase(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('project_phases').delete().eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      let list = JSON.parse(localStorage.getItem('yeyak_phases') || '[]');
      list = list.filter((p: ProjectPhase) => p.id !== id);
      localStorage.setItem('yeyak_phases', JSON.stringify(list));
      return true;
    }
  },

  async getProjectNotes(): Promise<ProjectNote[]> {
    if (supabase) {
      const { data, error } = await supabase.from('project_notes').select('*').order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return (data || []).map(n => ({
        id: n.id,
        projectId: n.project_id,
        kind: n.kind,
        title: n.title,
        content: n.content,
        date: n.date,
        items: n.items || [],
        createdAt: n.created_at,
        updatedAt: n.updated_at
      }));
    } else {
      initializeLocalStorage();
      return JSON.parse(localStorage.getItem('yeyak_notes') || '[]');
    }
  },

  async createProjectNote(note: Omit<ProjectNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectNote | null> {
    if (supabase) {
      const data = {
        project_id: note.projectId,
        kind: note.kind,
        title: note.title,
        content: note.content,
        date: note.date,
        items: note.items || []
      };
      const { data: inserted, error } = await supabase.from('project_notes').insert(data).select().single();
      if (error) { console.error(error); return null; }
      return {
        id: inserted.id,
        projectId: inserted.project_id,
        kind: inserted.kind,
        title: inserted.title,
        content: inserted.content,
        date: inserted.date,
        items: inserted.items,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at
      };
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_notes') || '[]');
      const newNote: ProjectNote = {
        ...note,
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newNote);
      localStorage.setItem('yeyak_notes', JSON.stringify(list));
      return newNote;
    }
  },

  async updateProjectNoteItems(id: string, items: { id: string; text: string; done: boolean }[]): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('project_notes').update({ items, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      const list = JSON.parse(localStorage.getItem('yeyak_notes') || '[]');
      const idx = list.findIndex((n: ProjectNote) => n.id === id);
      if (idx === -1) return false;
      list[idx].items = items;
      list[idx].updatedAt = new Date().toISOString();
      localStorage.setItem('yeyak_notes', JSON.stringify(list));
      return true;
    }
  },

  async deleteProjectNote(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('project_notes').delete().eq('id', id);
      if (error) { console.error(error); return false; }
      return true;
    } else {
      initializeLocalStorage();
      let list = JSON.parse(localStorage.getItem('yeyak_notes') || '[]');
      list = list.filter((n: ProjectNote) => n.id !== id);
      localStorage.setItem('yeyak_notes', JSON.stringify(list));
      return true;
    }
  }
};
