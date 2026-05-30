import React, { useState, useEffect } from 'react';
import { X, Repeat, ChevronDown } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { Reservation, Project, db, TEAM_MEMBERS, ALL_PARTICIPANTS } from '../lib/db';
import { getTeamColorClass } from '../lib/index';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  onReserved: () => void;
  editingReservation?: Reservation | null;
}

const TEAMS = ['전체', 'C레벨', 'FE', 'BE', 'APP', 'EVE'];
const TIME_OPTIONS: { label: string; h: number; m: number }[] = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 5) {
    if (h === 20 && m > 0) break;
    TIME_OPTIONS.push({
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      h,
      m
    });
  }
}

const WEEKDAYS = ['월', '화', '수', '목', '금'];

function toTimeKey(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  open,
  onClose,
  onReserved,
  editingReservation
}) => {
  const [projects, setProjects] = useState<Project[]>([]);

  // Form state
  const [room, setRoom] = useState<'회의실' | '뒤주'>('회의실');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [purpose, setPurpose] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Bulk repeat state
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    db.getProjects().then(setProjects);
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (editingReservation) {
      setRoom(editingReservation.room);
      setDate(editingReservation.date);
      setStartTime(toTimeKey(editingReservation.startHour, editingReservation.startMinute));
      setEndTime(toTimeKey(editingReservation.endHour, editingReservation.endMinute));
      setPurpose(editingReservation.purpose);
      setSelectedTeams(editingReservation.teams);
      setSelectedParticipants(editingReservation.participants);
      setProjectId(editingReservation.projectId || '');
      setNotes(editingReservation.notes || '');
      setIsRepeat(false);
    } else {
      // Reset form for new reservation
      setRoom('회의실');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setStartTime('10:00');
      setEndTime('11:00');
      setPurpose('');
      setSelectedTeams([]);
      setSelectedParticipants([]);
      setProjectId('');
      setNotes('');
      setIsRepeat(false);
      setRepeatEndDate('');
      setRepeatDays([1, 2, 3, 4, 5]);
    }
    setError('');
  }, [editingReservation, open]);

  // Toggle team selection and auto-select members
  const toggleTeam = (team: string) => {
    const isSelected = selectedTeams.includes(team);
    let nextTeams: string[];
    if (isSelected) {
      nextTeams = selectedTeams.filter(t => t !== team);
    } else {
      nextTeams = [...selectedTeams, team];
    }
    setSelectedTeams(nextTeams);

    // Auto-select members for the newly selected teams
    const autoMembers = new Set<string>();
    nextTeams.forEach(t => {
      (TEAM_MEMBERS[t] || []).forEach(m => autoMembers.add(m));
    });
    // Keep any manually added members
    const prevManual = selectedParticipants.filter(p => !Object.values(TEAM_MEMBERS).flat().includes(p));
    setSelectedParticipants([...Array.from(autoMembers), ...prevManual]);
  };

  const toggleParticipant = (name: string) => {
    setSelectedParticipants(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const toggleRepeatDay = (day: number) => {
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return { h, m };
  };

  const getDatesForRepeat = (): string[] => {
    if (!repeatEndDate) return [date];
    const dates: string[] = [];
    let current = parseISO(date);
    const end = parseISO(repeatEndDate);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (repeatDays.includes(dayOfWeek)) {
        dates.push(format(current, 'yyyy-MM-dd'));
      }
      current = addDays(current, 1);
    }
    return dates;
  };

  const handleSubmit = async () => {
    if (!purpose.trim()) { setError('사용 목적을 입력해주세요.'); return; }
    if (selectedTeams.length === 0 && !projectId) { setError('팀 또는 프로젝트 중 하나를 선택해주세요.'); return; }

    const { h: sh, m: sm } = parseTime(startTime);
    const { h: eh, m: em } = parseTime(endTime);

    if (sh * 60 + sm >= eh * 60 + em) {
      setError('종료 시간은 시작 시간 이후여야 합니다.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const resvDates = isRepeat ? getDatesForRepeat() : [date];

      if (editingReservation) {
        // Delete old and create new (simple update via delete+insert)
        await db.deleteReservation(editingReservation.id);
        await db.createReservation({
          room,
          date,
          startHour: sh,
          startMinute: sm,
          endHour: eh,
          endMinute: em,
          purpose: purpose.trim(),
          teams: selectedTeams,
          projectId: projectId || null,
          participants: selectedParticipants,
          attendance: editingReservation.attendance || {},
          notes: notes.trim()
        });
      } else {
        // Create reservations for all dates
        for (const d of resvDates) {
          await db.createReservation({
            room,
            date: d,
            startHour: sh,
            startMinute: sm,
            endHour: eh,
            endMinute: em,
            purpose: purpose.trim(),
            teams: selectedTeams,
            projectId: projectId || null,
            participants: selectedParticipants,
            attendance: {},
            notes: notes.trim()
          });
        }
      }

      onReserved();
      onClose();
    } catch (e) {
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-xl border shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/20 shrink-0">
          <h2 className="text-base font-bold text-foreground">
            {editingReservation ? '예약 수정' : '새 예약'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Room Selection */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">회의실</label>
            <div className="flex gap-2">
              {(['회의실', '뒤주'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoom(r)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition ${
                    room === r
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">시작 시간</label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIME_OPTIONS.map(o => (
                  <option key={o.label} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">종료 시간</label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIME_OPTIONS.map(o => (
                  <option key={o.label} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">사용 목적</label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="예약 목적을 입력하세요"
              className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Team Selection */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">팀 선택 (복수 선택 가능)</label>
            <div className="flex flex-wrap gap-2">
              {TEAMS.map(team => (
                <button
                  key={team}
                  type="button"
                  onClick={() => toggleTeam(team)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-semibold transition ${
                    selectedTeams.includes(team)
                      ? `${getTeamColorClass(team)} text-white border-transparent shadow-sm`
                      : 'bg-background text-muted-foreground hover:bg-muted border-border'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">프로젝트 (선택)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">프로젝트 없음</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Participant Selection */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">참여자 선택</label>
            <div className="border rounded-lg p-3 bg-muted/20 flex flex-wrap gap-2">
              {ALL_PARTICIPANTS.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleParticipant(name)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition ${
                    selectedParticipants.includes(name)
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground hover:bg-muted border-border'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>메모</span>
              <span className={`text-[10px] ${notes.length > 250 ? 'text-destructive' : 'text-slate-400'}`}>
                {notes.length}/250
              </span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 250))}
              placeholder="미팅 관련 메모를 입력하세요 (URL은 자동으로 링크 변환됩니다)"
              rows={3}
              className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Bulk Repeat - only for new reservations */}
          {!editingReservation && (
            <div className="border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsRepeat(!isRepeat)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition text-sm font-semibold text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-muted-foreground" />
                  반복 예약 (벌크 등록)
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isRepeat ? 'rotate-180' : ''}`} />
              </button>

              {isRepeat && (
                <div className="px-4 pb-4 pt-3 space-y-3 bg-card">
                  <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    등록 후 각 날짜는 <strong>개별 예약으로 분리</strong>되어 독립적으로 수정/삭제 가능합니다.
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">반복 종료일</label>
                    <input
                      type="date"
                      value={repeatEndDate}
                      min={date}
                      onChange={e => setRepeatEndDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-2 block">반복 요일</label>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day, idx) => {
                        const dayVal = idx + 1; // Mon=1, ..., Fri=5
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleRepeatDay(dayVal)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                              repeatDays.includes(dayVal)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {repeatEndDate && (
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      총 <strong className="text-foreground">{getDatesForRepeat().length}개</strong>의 예약이 생성됩니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 flex gap-2 justify-end bg-slate-50/50 shrink-0">
          <button
            onClick={onClose}
            className="text-sm font-semibold border px-4 py-2 rounded-lg hover:bg-muted transition"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            {saving ? '저장 중...' : editingReservation ? '수정 완료' : '예약하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
