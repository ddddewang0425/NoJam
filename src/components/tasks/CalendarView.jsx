import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X, Check, Archive, Trash2 } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns'
import useTaskStore from '../../store/taskStore'
import { ScrollTimePicker } from './ScrollDatePicker'

const DAY_LABELS  = ['일', '월', '화', '수', '목', '금', '토']
const MARGIN      = 14
const WHEEL_THR   = 60   // accumulated px to trigger month change
const ANIM_MS     = 280  // slide animation duration
const LOCK_MS     = ANIM_MS + 90  // lock window after a month change

// Get tasks for a specific date string, sorted by due_time ASC (nulls last)
function getTasksForDate(tasks, dateStr) {
  return tasks
    .filter((t) => t.due_date === dateStr)
    .sort((a, b) => {
      if (!a.due_time && !b.due_time) return 0
      if (!a.due_time) return 1
      if (!b.due_time) return -1
      return a.due_time > b.due_time ? 1 : -1
    })
}

// ── AddTaskPanel ─────────────────────────────────────────────────────────────
function AddTaskPanel({ date, onClose }) {
  const addTask = useTaskStore((s) => s.addTask)
  const [title,   setTitle]   = useState('')
  const [time,    setTime]    = useState('')
  const [loading, setLoading] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setLoading(true)
    await addTask({ title: trimmed, due_date: date, due_time: time || null })
    setLoading(false)
    onClose()
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
          새 일정 — {date}
        </span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목"
          className="w-full text-sm font-medium text-gray-900 placeholder-gray-300 border-0 border-b border-gray-200 pb-1.5 focus:outline-none focus:border-zinc-500 bg-transparent transition-colors"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8">시간</span>
          <ScrollTimePicker value={time} onChange={setTime} />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="flex-1 py-2 text-sm font-semibold bg-zinc-900 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
          >
            {loading ? '저장 중…' : '추가'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
            취소
          </button>
        </div>
      </form>
    </div>
  )
}

// ── TaskDetailPanel ──────────────────────────────────────────────────────────
function TaskDetailPanel({ taskId, onClose }) {
  const tasks        = useTaskStore((s) => s.tasks)
  const toggleTask   = useTaskStore((s) => s.toggleTask)
  const archiveTask  = useTaskStore((s) => s.archiveTask)
  const deleteTask   = useTaskStore((s) => s.deleteTask)
  const setPriority  = useTaskStore((s) => s.setPriority)
  const priorityStep = useTaskStore((s) => s.priorityStep)

  const task = tasks.find((t) => t.id === taskId)

  if (!task) return <div className="p-5 text-sm text-gray-400">일정을 찾을 수 없습니다.</div>

  const done     = task.status === 'done'
  const archived = task.archived ?? false
  const priority = task.priority ?? 3.0

  const priorityColor =
    priority >= 4.5 ? 'text-red-500'   :
    priority >= 3.5 ? 'text-amber-500' :
    priority <= 2.0 ? 'text-blue-300'  :
    'text-gray-400'

  const handleDelete = async () => { await deleteTask(task.id); onClose() }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <p className={`flex-1 text-base font-semibold leading-snug break-words ${
          done && archived ? 'line-through text-amber-400/70' :
          archived         ? 'text-amber-500'                 :
          done             ? 'line-through text-gray-400'     :
                             'text-gray-900'
        }`}>{task.title}</p>
        <button onClick={onClose} className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{task.due_date}</span>
        <span className="font-medium text-blue-500">
          {task.due_time ? task.due_time.substring(0, 5) : '시간 없음'}
        </span>
        <span className={`font-semibold ${priorityColor}`}>★ {priority.toFixed(1)}</span>
        {archived && <span className="text-amber-500 font-medium">보관됨</span>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">중요도</span>
          <span className="text-sm font-bold text-zinc-900">{priority.toFixed(1)}</span>
        </div>
        <input type="range" min={1} max={5} step={priorityStep} value={priority}
          onChange={(e) => setPriority(task.id, parseFloat(e.target.value))}
          className="w-full accent-zinc-900" />
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-300">1.0 낮음</span>
          <span className="text-[10px] text-gray-300">높음 5.0</span>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div className="flex flex-col gap-1">
        <button onClick={() => toggleTask(task.id)}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <Check size={15} strokeWidth={2.5} className={done ? 'text-zinc-900' : 'text-gray-300'} />
          {done ? '완료 취소' : '완료하기'}
        </button>
        <button onClick={() => archiveTask(task.id)}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <Archive size={15} className={archived ? 'text-amber-400' : 'text-gray-300'} />
          {archived ? '보관 취소' : '보관하기'}
        </button>
        <button onClick={handleDelete}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={15} />
          삭제하기
        </button>
      </div>
    </div>
  )
}

// ── CalendarView ─────────────────────────────────────────────────────────────
export default function CalendarView() {
  const tasks           = useTaskStore((s) => s.tasks)
  const currentMonth    = useTaskStore((s) => s.currentMonth)
  const setCurrentMonth = useTaskStore((s) => s.setCurrentMonth)

  const containerRef      = useRef(null)
  const [panel, setPanel] = useState(null)

  // ── Month slide animation ─────────────────────────────────────────────────
  const [slideDir,    setSlideDir]    = useState(0)   // +1 forward, -1 backward
  const [contentKey,  setContentKey]  = useState(0)

  // Refs to avoid stale closures inside event listener
  const wheelAccum      = useRef(0)
  const locked          = useRef(false)
  const currentMonthRef = useRef(currentMonth)
  useEffect(() => { currentMonthRef.current = currentMonth }, [currentMonth])

  const changeMonth = useCallback((delta) => {
    if (locked.current) return
    locked.current = true
    const cm = currentMonthRef.current
    setCurrentMonth(new Date(cm.getFullYear(), cm.getMonth() + delta, 1))
    setSlideDir(delta)
    setContentKey((k) => k + 1)
    wheelAccum.current = 0
    setTimeout(() => { locked.current = false }, LOCK_MS)
  }, [setCurrentMonth])

  // Non-passive wheel listener (must be imperative — React's onWheel is passive)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      wheelAccum.current += e.deltaY
      if (Math.abs(wheelAccum.current) >= WHEEL_THR) {
        changeMonth(wheelAccum.current > 0 ? 1 : -1)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [changeMonth])

  // Touch swipe (mobile) — horizontal(좌우) AND vertical(상하) 모두 월 이동
  const touchStartX   = useRef(0)
  const touchStartY   = useRef(0)
  const calSwipeLock  = useRef(null) // 'h' | 'v' | null

  const onTouchStart = (e) => {
    touchStartX.current  = e.touches[0].clientX
    touchStartY.current  = e.touches[0].clientY
    calSwipeLock.current = null
  }

  // onTouchMove: 방향 확정 후 수평이면 상위 탭 전환 막기
  const onTouchMove = (e) => {
    if (calSwipeLock.current === 'v') return
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (calSwipeLock.current === null) {
      if (dy > 8) { calSwipeLock.current = 'v'; return }
      if (dx > 8)  calSwipeLock.current = 'h'
    }
    if (calSwipeLock.current === 'h') {
      e.stopPropagation()  // TasksPage 탭 전환 막기
      e.preventDefault()
    }
  }

  const onTouchEnd = (e) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const adx = Math.abs(dx), ady = Math.abs(dy)
    if (calSwipeLock.current === 'h' && adx > 50) {
      e.stopPropagation()
      changeMonth(dx > 0 ? 1 : -1)   // 왼쪽 swipe = 다음 달
    } else if (ady > 40 && ady > adx) {
      changeMonth(dy > 0 ? 1 : -1)   // 위 swipe = 다음 달
    }
  }

  // Slide-in style applied to the content wrapper (re-keyed on change)
  const slideStyle = contentKey > 0 ? {
    animation: `${slideDir > 0 ? 'calSlideFromRight' : 'calSlideFromLeft'} ${ANIM_MS}ms ease-out both`,
  } : {}

  // ── Panel helpers ─────────────────────────────────────────────────────────
  const closePanel = useCallback(() => setPanel(null), [])

  useEffect(() => {
    if (!panel) return
    const handle = (e) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [panel, closePanel])

  const getContainerRect = () => containerRef.current?.getBoundingClientRect() ?? null

  const openAdd = (dateStr) => {
    const rect = getContainerRect()
    if (!rect) return
    setPanel({ type: 'add', date: dateStr, rect })
  }
  const openDetail = (taskId, e) => {
    e.stopPropagation()
    const rect = getContainerRect()
    if (!rect) return
    setPanel({ type: 'detail', taskId, rect })
  }

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd   = endOfMonth(currentMonth)
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  return (
    <div
      ref={containerRef}
      className="p-3 select-none relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Animated content (re-keyed on month change) ─────────────────── */}
      <div key={contentKey} style={slideStyle}>

        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)}
            className="p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="이전 달">
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-bold text-gray-900">
            {format(currentMonth, "yyyy'년' M'월'")}
          </h3>
          <button onClick={() => changeMonth(1)}
            className="p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="다음 달">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((label, i) => (
            <div key={label}
              className={`text-center text-[11px] font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}>
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {calendarDays.map((day) => {
            const dateStr        = format(day, 'yyyy-MM-dd')
            const dayTasks       = getTasksForDate(tasks, dateStr)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDate    = isToday(day)

            return (
              <div
                key={dateStr}
                onClick={() => openAdd(dateStr)}
                className={`bg-white min-h-[78px] p-1 flex flex-col cursor-pointer
                            hover:bg-blue-50/40 transition-colors ${
                              !isCurrentMonth ? 'opacity-35' : ''
                            }`}
              >
                {/* Date number */}
                <div className="flex justify-center mb-0.5">
                  <span className={`text-[11px] font-semibold w-5 h-5 flex items-center
                                    justify-center rounded-full leading-none ${
                    isTodayDate    ? 'bg-zinc-900 text-white' :
                    day.getDay() === 0 ? 'text-red-400'       :
                    day.getDay() === 6 ? 'text-blue-400'      :
                                        'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Task chips */}
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      title={task.title}
                      onClick={(e) => openDetail(task.id, e)}
                      className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate
                                  cursor-pointer hover:brightness-95 transition-all ${
                        task.archived && task.status === 'done'
                          ? 'line-through text-amber-300/70 bg-amber-50'
                          : task.archived
                          ? 'text-amber-400 bg-amber-50'
                          : task.status === 'done'
                          ? 'line-through text-gray-300 bg-gray-100'
                          : 'text-gray-700 bg-blue-50 font-medium'
                      }`}
                    >
                      <span className="text-[8px] text-gray-400 mr-0.5">
                        {task.due_time ? task.due_time.substring(0, 5) : '24:00'}
                      </span>
                      {task.title}
                    </div>
                  ))}

                  {dayTasks.length > 3 && (
                    <div className="text-[9px] text-gray-400 text-center leading-tight">
                      +{dayTasks.length - 3}개
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>{/* end animated content */}

      {/* ── Panel overlay (portal, outside animated div) ─────────────────── */}
      {panel?.rect && createPortal(
        <>
          {/* 전체화면 투명 배경: 캘린더 아래 빈 공간 클릭 시에도 닫힘 */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={closePanel}
          />
          {/* 캘린더 영역 반투명 오버레이 */}
          <div
            style={{
              position: 'fixed',
              left: panel.rect.left, top: panel.rect.top,
              width: panel.rect.width, height: panel.rect.height,
              zIndex: 200,
            }}
            className="bg-white/75 backdrop-blur-[3px]"
            onClick={closePanel}
          />
          <div
            style={{
              position: 'fixed',
              left:      panel.rect.left   + MARGIN,
              top:       panel.rect.top    + MARGIN,
              width:     panel.rect.width  - MARGIN * 2,
              maxHeight: panel.rect.height - MARGIN * 2,
              zIndex: 201,
            }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {panel.type === 'add'    && <AddTaskPanel    date={panel.date}       onClose={closePanel} />}
            {panel.type === 'detail' && <TaskDetailPanel taskId={panel.taskId}   onClose={closePanel} />}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
