import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import { Reservation } from '../lib/db';
import { getTeamColorClass } from '../lib/index';
import { ReservationDetailModal } from './ReservationDetailModal';

interface CalendarProps {
  reservations: Reservation[];
  weekDates: Date[];
  onDelete: (id: string) => void;
  onEdit: (resv: Reservation) => void;
  onAttendanceChanged: () => void;
  roomFilter: '전체' | '회의실' | '뒤주';
}

// Time convert helper: start time in minutes from midnight
function getStartMinutes(r: Reservation): number {
  return r.startHour * 60 + r.startMinute;
}

// Time convert helper: end time in minutes from midnight
function getEndMinutes(r: Reservation): number {
  return r.endHour * 60 + r.endMinute;
}

// Overlap helper: check if two reservations overlap in time
function isOverlapping(r1: Reservation, r2: Reservation): boolean {
  return getStartMinutes(r1) < getEndMinutes(r2) && getStartMinutes(r2) < getEndMinutes(r1);
}

// Layout helper from compiled JS (qD): partitions overlapping reservations into columns
function calculateOverlappingLayout(dayReservations: Reservation[]) {
  // Sort by start time, then end time
  const sorted = [...dayReservations].sort((a, b) => getStartMinutes(a) - getStartMinutes(b) || getEndMinutes(a) - getEndMinutes(b));
  
  // Group overlapping reservations into components
  const groups: Reservation[][] = [];
  for (const r of sorted) {
    const group = groups.find(g => g.some(existing => isOverlapping(existing, r)));
    if (group) {
      group.push(r);
    } else {
      groups.push([r]);
    }
  }

  // Position reservations within columns for each group
  const layoutResults: { reservation: Reservation; leftPct: number; widthPct: number }[] = [];
  for (const group of groups) {
    const columns: Reservation[][] = [];
    for (const r of group) {
      let placed = false;
      for (const col of columns) {
        if (!col.some(existing => isOverlapping(existing, r))) {
          col.push(r);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([r]);
      }
    }
    
    const colCount = columns.length;
    columns.forEach((col, colIdx) => {
      for (const r of col) {
        layoutResults.push({
          reservation: r,
          leftPct: (colIdx / colCount) * 100,
          widthPct: (1 / colCount) * 100
        });
      }
    });
  }

  return layoutResults;
}

const HOUR_HEIGHT = 64; // Row height in pixels (h-16)
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00
const WEEKDAY_NAMES = ['월', '화', '수', '목', '금'];

export const Calendar: React.FC<CalendarProps> = ({
  reservations,
  weekDates,
  onDelete,
  onEdit,
  onAttendanceChanged,
  roomFilter
}) => {
  const [selectedResvId, setSelectedResvId] = useState<string | null>(null);

  // Filter reservations by room
  const filteredReservations = useMemo(() => {
    return roomFilter === '전체'
      ? reservations
      : reservations.filter(r => r.room === roomFilter);
  }, [reservations, roomFilter]);

  // Group reservations by date (YYYY-MM-DD)
  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    filteredReservations.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    });
    return map;
  }, [filteredReservations]);

  // Find the currently active reservation for the details dialog
  const activeReservation = useMemo(() => {
    if (!selectedResvId) return null;
    return reservations.find(r => r.id === selectedResvId) || null;
  }, [reservations, selectedResvId]);

  const formatTime = (hour: number, min: number) => {
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  return (
    <>
      <div className="overflow-x-auto w-full">
        <div className="min-w-[700px] select-none">
          {/* Header row with weekday names and calendar dates */}
          <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b bg-card">
            <div className="border-r h-12 flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted/20">
              시간
            </div>
            {weekDates.map((date, idx) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
              return (
                <div
                  key={idx}
                  className={`p-2 text-center border-r last:border-r-0 flex flex-col items-center justify-center ${
                    isToday ? 'bg-primary/5 font-semibold' : ''
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-0.5">{WEEKDAY_NAMES[idx]}</span>
                  <span
                    className={`text-base font-bold flex items-center justify-center w-7 h-7 rounded-full ${
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {format(date, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid rows */}
          <div className="grid grid-cols-[60px_repeat(5,1fr)] relative">
            {/* Left timeline column */}
            <div className="relative border-r bg-card shrink-0">
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="h-16 pr-2 text-right border-b text-[11px] font-semibold text-muted-foreground flex items-start justify-end pt-1 bg-card"
                >
                  {formatTime(hour, 0)}
                </div>
              ))}
            </div>

            {/* Daily calendar columns */}
            {weekDates.map((date, colIdx) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayReservations = reservationsByDate.get(dateStr) || [];
              const positioned = calculateOverlappingLayout(dayReservations);

              return (
                <div key={colIdx} className="relative border-r last:border-r-0 h-[832px]">
                  {/* Background grid lines */}
                  {HOURS.map(hour => (
                    <div key={hour} className="h-16 border-b border-border/50" />
                  ))}

                  {/* Absolute positioned reservation cards */}
                  {positioned.map(({ reservation: r, leftPct, widthPct }) => {
                    const startMin = getStartMinutes(r);
                    const endMin = getEndMinutes(r);
                    const topOffset = ((startMin - 8 * 60) / 60) * HOUR_HEIGHT;
                    const durationHeight = ((endMin - startMin) / 60) * HOUR_HEIGHT;
                    
                    // Count checked in attendees
                    const checkedInCount = r.participants.filter(p => r.attendance[p]).length;

                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedResvId(r.id)}
                        className={`absolute rounded-md px-2 py-1.5 text-left border overflow-hidden flex flex-col justify-between transition-all hover:brightness-95 hover:shadow-sm z-10 ${getTeamColorClass(
                          r.teams[0] || '기타'
                        )} bg-opacity-35`}
                        style={{
                          top: `${topOffset + 2}px`,
                          height: `${Math.max(durationHeight - 4, 24)}px`,
                          left: `calc(${leftPct}% + 3px)`,
                          width: `calc(${widthPct}% - 6px)`
                        }}
                      >
                        <div className="min-w-0 w-full">
                          {r.projectName && (
                            <span className="block text-[9px] font-bold text-slate-700 truncate mb-0.5">
                              [{r.projectName}]
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
                            {r.purpose}
                          </h4>
                        </div>

                        {durationHeight >= 48 && (
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold mt-1">
                            <span className="truncate">
                              {formatTime(r.startHour, r.startMinute)} - {formatTime(r.endHour, r.endMinute)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 bg-white bg-opacity-40 px-1 rounded-sm">
                              <Users className="w-2.5 h-2.5 text-slate-500" />
                              <span>
                                {checkedInCount}/{r.participants.length}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {activeReservation && (
        <ReservationDetailModal
          reservation={activeReservation}
          onClose={() => setSelectedResvId(null)}
          onDelete={id => {
            onDelete(id);
            setSelectedResvId(null);
          }}
          onEdit={r => {
            onEdit(r);
            setSelectedResvId(null);
          }}
          onAttendanceChanged={onAttendanceChanged}
        />
      )}
    </>
  );
};
