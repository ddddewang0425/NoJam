import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, startOfWeek, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Check, Trash2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import useTimetableStore from '../../store/timetableStore'
import useTaskStore from '../../store/taskStore'
import useDayNoteStore from '../../store/dayNoteStore'
import DayNotePanel from './DayNotePanel'

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_ROW_H     = 24
const MAX_ROW_H     = 120
const STEP_ROW_H    = 12
const DEFAULT_ROW_H = 48
const DAYS_KO       = ['일', '월', '화', '수', '목', '금', '토']

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeToMinutes(t) {
  const [h, m] = t.substring(0, 5).split(':').map(Number)
  return h * 60 + m
}

function timeToY(t, rowH, startHour) {
  const mins = timeToMinutes(t)
  const startMins = startHour * 60
  const adjusted = (mins - startMins + 1440) % 1440
  return (adjusted / 60) * rowH
}

function durationToPx(start, end, rowH) {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  const dur = (e - s + 1440) % 1440
  return Math.max((dur / 60) * rowH, rowH / 2)
}

// ── Task Deadline Popover ─────────────────────────────────────────────────────
function TaskPopover({ task, onClose }) {
  const toggleTask  = useTaskStore((s) => s.toggleTask)
  const deleteTask  = useTaskStore((s) => s.deleteTask)
  const advanceTask = useTaskStore((s) => s.advanceTask)
  const done     = task.status === 'done'
  const isRepeat = task.is_repeat

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-52 overflow-hidden">
      <div className="px-3.5 pt-3 pb-2">
        <p className="text-sm font-semibold text-zinc-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {task.due_date} · {task.due_time?.substring(0,5) ?? '시간 없음'}
        </p>
        {isRepeat && <span className="text-[10px] text-blue-400 font-semibold">↻ 반복</span>}
      </div>
      <div className="border-t border-gray-100 mx-1" />
      <div className="py-1">
        {isRepeat ? (
          <button
            onClick={() => { advanceTask(task.id); onClose() }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
          >
            <RefreshCw size={13} className="text-blue-400" />
            다음으로
          </button>
        ) : (
          <button
            onClick={() => { toggleTask(task.id); onClose() }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Check size={13} className={done ? 'text-zinc-900' : 'text-gray-300'} />
            {done ? '완료 취소' : '완료하기'}
          </button>
        )}
        <button
          onClick={() => { deleteTask(task.id); onClose() }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
          삭제하기
        </button>
      </div>
    </div>
  )
}

// ── Main Grid ─────────────────────────────────────────────────────────────────
export default function TimetableGrid({ onEditEntry }) {
  const entries     = useTimetableStore((s) => s.entries)
  const deleteEntry = useTimetableStore((s) => s.deleteEntry)
  const tasks       = useTaskStore((s) => s.tasks)
  const timetableRange = useTaskStore((s) => s.timetableRange || [6, 30])
  const fetchNotes  = useDayNoteStore((s) => s.fetchNotes)

  const [startHour, endHour] = timetableRange
  const totalHours = endHour - startHour

  // Generate hour labels based on startHour and totalHours
  const HOUR_LABELS = Array.from({ length: totalHours }, (_, i) => {
    const h = (startHour + i) % 24
    return `${String(h).padStart(2, '0')}:00`
  })

  // Fetch shared notes on mount
  useEffect(() => { fetchNotes() }, [fetchNotes])

  // Row height (zoom)
  const rowH = useTaskStore((s) => s.timetableRowH)
  const setRowH = useTaskStore((s) => s.setTimetableRowH)
  const zoomOut = () => setRowH(Math.max(MIN_ROW_H, rowH - 1))
  const zoomIn  = () => setRowH(Math.min(MAX_ROW_H, rowH + 1))

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const weekStart = addDays(startOfWeek(currentTime, { weekStartsOn: 0 }), weekOffset * 7)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Day note panel
  const [openNoteDay, setOpenNoteDay] = useState(null) // day_of_week int or null

  // Popover / context menu state
  const [taskPopover, setTaskPopover] = useState(null)
  const [entryMenu,   setEntryMenu]   = useState(null)
  const popoverRef   = useRef(null)
  const entryMenuRef = useRef(null)

  useEffect(() => {
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target))
        setTaskPopover(null)
      if (entryMenuRef.current && !entryMenuRef.current.contains(e.target))
        setEntryMenu(null)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [])

  // Tasks for this week
  const weekTasks = tasks.filter((t) => {
    return weekDates.some((d) => format(d, 'yyyy-MM-dd') === t.due_date)
  })

  const handleTaskLineClick = (e, task) => {
    const POP_W = 208
    const vw    = window.innerWidth
    const rect  = e.currentTarget.getBoundingClientRect()
    const x = rect.left + POP_W > vw ? rect.left - POP_W : rect.left
    setTaskPopover({ task, x, y: rect.top + 8 })
    setEntryMenu(null)
  }

  const handleEntryCtx = (e, entry) => {
    e.preventDefault()
    const POP_W = 160
    const vw    = window.innerWidth
    const x = e.clientX + POP_W > vw ? e.clientX - POP_W : e.clientX
    setEntryMenu({ entry, x, y: e.clientY + 8 })
    setTaskPopover(null)
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white border-b border-gray-100 sticky top-0 z-20">
        {/* Prev week */}
        <button onClick={() => setWeekOffset((w) => w - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={16} className="text-gray-500" />
        </button>

        {/* Week label */}
        <span className="flex-1 text-center text-sm font-semibold text-zinc-900 select-none">
          {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} 주
        </span>

        {/* Next week */}
        <button onClick={() => setWeekOffset((w) => w + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight size={16} className="text-gray-500" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        {/* Zoom slider */}
        <div className="flex items-center gap-1.5 ml-1 mr-1">
          <button onClick={zoomOut} disabled={rowH <= MIN_ROW_H} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ZoomOut size={14} />
          </button>
          <input
            type="range"
            min={MIN_ROW_H}
            max={MAX_ROW_H}
            step={1}
            value={rowH}
            onChange={(e) => setRowH(Number(e.target.value))}
            className="w-16 sm:w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
          />
          <button onClick={zoomIn} disabled={rowH >= MAX_ROW_H} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* ── Scrollable grid ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: 480 }}>

          {/* Time labels */}
          <div className="flex-shrink-0 w-12" style={{ paddingTop: 40 }}>
            {HOUR_LABELS.map((label) => (
              <div key={label} style={{ height: rowH }}
                   className="border-b border-gray-100 flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-zinc-600 font-medium select-none leading-none">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, colIdx) => {
            const dateStr    = format(date, 'yyyy-MM-dd')
            const isToday    = dateStr === format(currentTime, 'yyyy-MM-dd')
            const jsDow      = date.getDay() // 0=Sun…6=Sat (same as DB convention)
            const colEntries = entries.filter((e) => e.day_of_week === jsDow)
            const colTasks   = weekTasks.filter((t) => t.due_date === dateStr)

            return (
              <div key={colIdx} className="flex-1 min-w-0 border-l border-gray-100">

                {/* Sticky day header — click to open note panel */}
                <div
                  onClick={() => setOpenNoteDay(openNoteDay === jsDow ? null : jsDow)}
                  className={`sticky top-0 z-10 h-10 flex flex-col items-center justify-center border-b border-gray-100 cursor-pointer select-none transition-colors ${
                    openNoteDay === jsDow
                      ? 'bg-zinc-700 text-white'
                      : isToday
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-[10px] font-semibold select-none">{DAYS_KO[colIdx]}</span>
                  <span className={`text-[10px] select-none ${openNoteDay === jsDow || isToday ? 'text-gray-300' : 'text-gray-400'}`}>
                    {format(date, 'M/d')}
                  </span>
                </div>

                {/* Hour rows + positioned elements */}
                <div className="relative" style={{ height: rowH * totalHours }}>
                  {/* Grid lines */}
                  {HOUR_LABELS.map((_, hi) => (
                    <div key={hi} style={{ top: hi * rowH, height: rowH }}
                         className="absolute inset-x-0 border-b border-gray-100" />
                  ))}

                  {/* Timetable entry blocks */}
                  {colEntries.map((entry) => {
                    const top    = timeToY(entry.start_time, rowH, startHour)
                    const height = durationToPx(entry.start_time, entry.end_time, rowH)
                    return (
                      <div key={entry.id}
                           style={{
                             position: 'absolute', top, height,
                             left: 2, right: 2,
                             backgroundColor: entry.color + 'cc',
                             borderLeft: `3px solid ${entry.color}`,
                             borderRadius: 6,
                             zIndex: 10,
                           }}
                           onContextMenu={(e) => handleEntryCtx(e, entry)}
                           className="overflow-hidden cursor-pointer hover:brightness-95 transition-filter">
                        <p className="text-[10px] font-semibold px-1.5 pt-1 leading-tight text-zinc-800 truncate">
                          {entry.title}
                        </p>
                        {height >= 28 && (
                          <p className="text-[9px] px-1.5 text-zinc-600 leading-tight">
                            {entry.start_time.substring(0,5)}–{entry.end_time.substring(0,5)}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {/* Task deadline red neon lines */}
                  {colTasks.map((task) => {
                    const timeStr = task.due_time || '24:00'
                    const top  = timeToY(timeStr, rowH, startHour)
                    const done = task.status === 'done'
                    return (
                      <div key={task.id}
                           style={{
                             position: 'absolute',
                             top: top - 1.5,
                             left: 0, right: 0, height: 3, zIndex: 50,
                             cursor: 'pointer',
                             background: done ? 'rgba(156,163,175,0.5)' : '#ef4444',
                             boxShadow: done ? 'none'
                               : '0 0 6px 2px rgba(239,68,68,0.7), 0 0 12px 4px rgba(239,68,68,0.35)',
                             opacity: done ? 0.5 : 1,
                           }}
                           onClick={(e) => handleTaskLineClick(e, task)}
                           title={task.title}
                      />
                    )
                  })}

                  {/* Current time green neon line (only for today) */}
                  {isToday && (
                    <div
                      style={{
                        position: 'absolute',
                        top: timeToY(format(currentTime, 'HH:mm'), rowH, startHour) - 1,
                        left: 0, right: 0, height: 2, zIndex: 60,
                        background: '#22c55e', // text-green-500
                        boxShadow: '0 0 6px 2px rgba(34,197,94,0.7), 0 0 12px 4px rgba(34,197,94,0.35)',
                        pointerEvents: 'none',
                      }}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-green-500 rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Task popover ──────────────────────────────────────────────────── */}
      {taskPopover && createPortal(
        <div ref={popoverRef}
             style={{ position: 'fixed', left: taskPopover.x, top: taskPopover.y, zIndex: 9999 }}>
          <TaskPopover task={taskPopover.task} onClose={() => setTaskPopover(null)} />
        </div>,
        document.body
      )}

      {/* ── Entry context menu ────────────────────────────────────────────── */}
      {entryMenu && createPortal(
        <div ref={entryMenuRef}
             style={{ position: 'fixed', left: entryMenu.x, top: entryMenu.y, zIndex: 9999 }}
             className="bg-white border border-gray-200 rounded-xl shadow-xl w-40 overflow-hidden py-1">
          <button
            onClick={() => {
              if (onEditEntry) onEditEntry(entryMenu.entry)
              setEntryMenu(null)
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            수정하기
          </button>
          <button
            onClick={() => { deleteEntry(entryMenu.entry.id); setEntryMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
            삭제하기
          </button>
        </div>,
        document.body
      )}

      {/* ── Day note panel ───────────────────────────────────────────── */}
      {openNoteDay !== null && (
        <DayNotePanel dow={openNoteDay} onClose={() => setOpenNoteDay(null)} />
      )}
    </div>
  )
}
