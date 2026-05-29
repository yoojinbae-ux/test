import React from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, Trash2, Edit2, Link as LinkIcon } from 'lucide-react';
import { Reservation, db } from '../lib/db';
import { getTeamColorClass } from '../lib/index';

interface DetailProps {
  reservation: Reservation;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (resv: Reservation) => void;
  onAttendanceChanged: () => void;
}

// Simple link parser to render URLs in notes
function renderNotesWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline inline-flex items-center gap-0.5 hover:text-primary/80 break-all"
        >
          <LinkIcon className="w-3 h-3 shrink-0" />
          {part}
        </a>
      );
    }
    return part;
  });
}

export const ReservationDetailModal: React.FC<DetailProps> = ({
  reservation: r,
  onClose,
  onDelete,
  onEdit,
  onAttendanceChanged
}) => {
  const formatTime = (h: number, m: number) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleAttendanceChange = async (name: string, status: 'online' | 'onsite' | null) => {
    const updated = { ...r.attendance };
    if (status === null) {
      delete updated[name];
    } else {
      updated[name] = status;
    }
    const success = await db.updateReservationAttendance(r.id, updated);
    if (success) {
      onAttendanceChanged();
    }
  };

  const handleDelete = () => {
    if (confirm(`'${r.purpose}' 예약을 삭제하시겠습니까?`)) {
      onDelete(r.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-xl border shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/20">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              예약 상세 정보
            </span>
            <h3 className="text-base font-bold text-foreground truncate mt-0.5">
              {r.projectName ? `[${r.projectName}] ` : ''}{r.purpose}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Reservation Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground">일시</div>
                <div className="font-semibold">{r.date}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground">시간</div>
                <div className="font-semibold">
                  {formatTime(r.startHour, r.startMinute)} - {formatTime(r.endHour, r.endMinute)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 col-span-2 border-t pt-2 mt-1">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground">회의실</div>
                <div className="font-semibold">{r.room}</div>
              </div>
            </div>
          </div>

          {/* Teams Badges */}
          {r.teams.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-muted-foreground">참여 팀</h4>
              <div className="flex flex-wrap gap-1.5">
                {r.teams.map(team => (
                  <span
                    key={team}
                    className={`text-xs text-white px-2 py-0.5 rounded font-medium ${getTeamColorClass(
                      team
                    )}`}
                  >
                    {team}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Checkins */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>참석 여부 관리</span>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                실시간 자동 저장
              </span>
            </h4>
            <div className="border rounded-lg divide-y max-h-56 overflow-y-auto bg-card">
              {r.participants.map(name => {
                const status = r.attendance[name] || null;
                return (
                  <div key={name} className="flex items-center justify-between p-2.5 text-sm">
                    <span className="font-medium text-foreground">{name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAttendanceChange(name, status === 'onsite' ? null : 'onsite')}
                        className={`text-xs px-2.5 py-1 rounded border font-semibold transition ${
                          status === 'onsite'
                            ? 'bg-emerald-500 text-white border-transparent'
                            : 'bg-background hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        현장
                      </button>
                      <button
                        onClick={() => handleAttendanceChange(name, status === 'online' ? null : 'online')}
                        className={`text-xs px-2.5 py-1 rounded border font-semibold transition ${
                          status === 'online'
                            ? 'bg-blue-500 text-white border-transparent'
                            : 'bg-background hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        온라인
                      </button>
                    </div>
                  </div>
                );
              })}
              {r.participants.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  참여자가 지정되지 않았습니다.
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {r.notes && (
            <div className="space-y-1.5 border-t pt-4">
              <h4 className="text-xs font-bold text-muted-foreground">메모</h4>
              <p className="text-sm bg-slate-50 border p-3 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed break-all">
                {renderNotesWithLinks(r.notes)}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="border-t px-5 py-4 flex gap-2 justify-end bg-slate-50/50 shrink-0">
          <button
            onClick={handleDelete}
            className="mr-auto inline-flex items-center gap-1 text-sm font-semibold text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
          
          <button
            onClick={onClose}
            className="text-sm font-semibold border px-4 py-2 rounded-lg hover:bg-muted transition"
          >
            취소
          </button>

          <button
            onClick={() => onEdit(r)}
            className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
            수정
          </button>
        </div>

      </div>
    </div>
  );
};
