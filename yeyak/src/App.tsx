import { useState, useEffect, useCallback } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, FolderKanban, Plus, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { Reservation, db } from './lib/db';
import { Calendar } from './components/Calendar';
import { ReservationModal } from './components/ReservationModal';
import { ProjectTracking } from './components/ProjectTracking';

type Tab = 'reservation' | 'projects';
type RoomFilter = '전체' | '회의실' | '뒤주';

const ROOM_FILTERS: RoomFilter[] = ['전체', '회의실', '뒤주'];

const TEAM_LEGEND = [
  { name: '전체', cls: 'bg-team-all' },
  { name: 'C레벨', cls: 'bg-team-clevel' },
  { name: 'FE', cls: 'bg-team-fe' },
  { name: 'BE', cls: 'bg-team-be' },
  { name: 'APP', cls: 'bg-team-app' },
  { name: 'EVE', cls: 'bg-team-eve' },
  { name: '기타', cls: 'bg-team-custom' },
];

function getWeekDates(anchorDate: Date): Date[] {
  const mon = startOfWeek(anchorDate, { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

const SPEC_CONTENT = `# 회의실 예약 시스템 기능명세서

## 1. 개요
- 서비스명: 회의실 예약 시스템
- 목적: 사내 회의실(회의실, 뒤주)의 주간 예약 일정을 관리하고, 팀별 미팅 참여자 및 참석 여부를 효율적으로 관리
- 사용 대상: 사내 임직원

## 2. 주요 기능

### 2.1 주간 캘린더 뷰
- 월~금 주간 일정을 한눈에 확인
- 시간대: 08:00 ~ 20:00 (5분 단위)
- 회의실 필터: 회의실 / 뒤주 / 전체
- 전체 보기 시 겹치는 예약은 너비를 반반씩 나누어 함께 표시
- 예약 블록에 프로젝트명 표기, 참석 확인 인원 수 표기

### 2.2 예약 생성
- 회의실 선택, 날짜, 시간(5분 단위), 목적, 팀, 프로젝트, 참여자, 메모(최대 250자)
- 반복 예약: 날짜 범위 + 요일 선택 → 개별 예약으로 분리

### 2.3 예약 수정 및 삭제
- 기존 예약 클릭 시 상세보기 및 수정 가능
- 각 날짜별 독립적 관리

### 2.4 팀 관리
- 팀 목록: 전체, C레벨, FE, BE, APP, EVE
- 팀 선택 시 기본 참여자 자동 선택

### 2.5 프로젝트 관리
- 기본 프로젝트: 수콘분청, 포치타, 페이빌더
- 프로젝트 추가 / 이름 수정 / 삭제 가능

### 2.6 참여자 및 참석 관리
- 온라인/현장 참여 선택, 체크 즉시 저장

## 3. 데이터 모델
Reservation: id, room, date, start_hour, start_minute, end_hour, end_minute, purpose, teams, project_id, participants, attendance, notes
Project: id, name, start_date, end_date, teams, assignees, status

## 4. 기술 스택
- Frontend: React 18, Vite 5, TypeScript 5, Tailwind CSS v3
- Backend: Supabase (optional) / LocalStorage (default)
`;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('reservation');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('전체');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const weekDates = getWeekDates(currentDate);

  const loadReservations = useCallback(async () => {
    const data = await db.getReservations();
    setReservations(data);
  }, []);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const handleDelete = async (id: string) => {
    await db.deleteReservation(id);
    await loadReservations();
  };

  const handleEdit = (resv: Reservation) => {
    setEditingReservation(resv);
    setModalOpen(true);
  };

  const handleNewReservation = () => {
    setEditingReservation(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingReservation(null);
  };

  const downloadSpec = () => {
    const blob = new Blob([SPEC_CONTENT], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '회의실예약시스템_기능명세서.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card border-b px-4 py-3 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <CalendarDays className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">회의실 예약</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSpec}
              className="inline-flex items-center gap-1.5 text-sm font-semibold border px-3 py-2 rounded-lg hover:bg-muted transition text-muted-foreground"
            >
              <FileDown className="w-4 h-4" />
              기능명세
            </button>
            <button
              onClick={handleNewReservation}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              예약하기
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto p-4">
        
        {/* Tab Navigation */}
        <div className="inline-flex rounded-xl border bg-muted p-1 mb-5 shadow-sm">
          <button
            onClick={() => setActiveTab('reservation')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'reservation'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            회의실 예약
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'projects'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            프로젝트 트래킹
          </button>
        </div>

        {/* Reservation Tab */}
        {activeTab === 'reservation' && (
          <div className="space-y-4">
            {/* Week navigator and month label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(d => subWeeks(d, 1))}
                  className="p-2 rounded-lg border hover:bg-muted transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 text-sm font-semibold border rounded-lg hover:bg-muted transition"
                >
                  오늘
                </button>
                <button
                  onClick={() => setCurrentDate(d => addWeeks(d, 1))}
                  className="p-2 rounded-lg border hover:bg-muted transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-base font-bold text-foreground">
                {format(weekDates[0], 'yyyy년 M월', { locale: ko })}
              </h2>
            </div>

            {/* Team legend */}
            <div className="flex flex-wrap gap-3">
              {TEAM_LEGEND.map(({ name, cls }) => (
                <div key={name} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className={`w-3 h-3 rounded-sm ${cls}`} />
                  {name}
                </div>
              ))}
            </div>

            {/* Room filter */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit shadow-inner">
              {ROOM_FILTERS.map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setRoomFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                    roomFilter === filter
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter === '전체' ? '전체보기' : filter}
                </button>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <Calendar
                reservations={reservations}
                weekDates={weekDates}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onAttendanceChanged={loadReservations}
                roomFilter={roomFilter}
              />
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <ProjectTracking />
        )}
      </main>

      {/* Reservation Modal */}
      <ReservationModal
        open={modalOpen}
        onClose={handleModalClose}
        onReserved={loadReservations}
        editingReservation={editingReservation}
      />
    </div>
  );
}
