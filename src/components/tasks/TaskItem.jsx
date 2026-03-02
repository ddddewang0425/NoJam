import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Check, Archive } from 'lucide-react'
import useTaskStore from '../../store/taskStore'

// Display "HH:MM" from "HH:MM:SS", or "24:00" when no time is set
function formatTime(timeStr) {
  if (!timeStr) return '24:00'
  return timeStr.substring(0, 5)
}

/**
 * Compute D-day text and color class.
 */
function getDdayInfo(due_date, due_time, granularity, now) {
  const time = due_time ? due_time.substring(0, 5) : '23:59'
  const deadline = new Date(`${due_date}T${time}:00`).getTime()
  const diff = deadline - now

  if (diff <= 0) return { text: '기한 초과', cls: 'text-red-500 font-semibold' }

  const nowDate = new Date(now)
  const todayMidnight = new Date(
    nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()
  ).getTime()
  const dueMidnight = new Date(`${due_date}T00:00:00`).getTime()
  const calDays = Math.round((dueMidnight - todayMidnight) / 86_400_000)

  const cls =
    calDays >= 4 ? 'text-gray-400'
    : calDays >= 1 ? 'text-amber-500'
    : Math.floor(diff / 3_600_000) >= 6 ? 'text-orange-500'
    : Math.floor(diff / 3_600_000) >= 1 ? 'text-red-400'
    : 'text-red-500'

  if (granularity === '일') {
    if (calDays <= 0) return { text: '오늘', cls: 'text-orange-500' }
    return { text: `${calDays}일 남음`, cls }
  }

  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)

  const parts = []
  if (d > 0) parts.push(`${d}일`)

  if (granularity === '시간') {
    if (d > 0) {
      if (h > 0) parts.push(`${h}시간`)
    } else {
      if (h >= 1) parts.push(`${h}시간`)
      else return { text: '1시간 미만', cls: 'text-red-400' }
    }
    return { text: `${parts.join(' ')} 남음`, cls }
  }

  if (granularity === '분') {
    if (h > 0) parts.push(`${h}시간`)
    if (d > 0 || h > 0) {
      if (m > 0) parts.push(`${m}분`)
    } else {
      if (m >= 1) parts.push(`${m}분`)
      else return { text: '1분 미만', cls: 'text-red-500' }
    }
    return { text: `${parts.join(' ')} 남음`, cls }
  }

  if (h > 0) parts.push(`${h}시간`)
  if (m > 0) parts.push(`${m}분`)
  if (s > 0 || (d === 0 && h === 0 && m === 0)) parts.push(`${Math.max(0, s)}초`)
  return { text: `${parts.join(' ')} 남음`, cls }
}

export default function TaskItem({ task, now, granularity, index = 0, animMs = 300 }) {
  const toggleTask   = useTaskStore((s) => s.toggleTask)
  const archiveTask  = useTaskStore((s) => s.archiveTask)
  const deleteTask   = useTaskStore((s) => s.deleteTask)
  const setPriority  = useTaskStore((s) => s.setPriority)
  const priorityStep = useTaskStore((s) => s.priorityStep)

  const [showPriority, setShowPriority] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 })
  const popoverRef = useRef(null)

  // Close priority popover on outside click / touch
  useEffect(() => {
    if (!showPriority) return
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowPriority(false)
      }
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [showPriority])

  // Close on Escape
  useEffect(() => {
    if (!showPriority) return
    const handle = (e) => { if (e.key === 'Escape') setShowPriority(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [showPriority])

  const handleContextMenu = (e) => {
    e.preventDefault()
    const POP_W = 208  // w-52
    const POP_H = 240  // estimated height with actions
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = e.clientX + POP_W > vw ? e.clientX - POP_W : e.clientX
    const top  = e.clientY + POP_H > vh ? e.clientY - POP_H : e.clientY + 8
    setPopoverPos({ x: left, y: top })
    setShowPriority((v) => !v)
  }

  const done     = task.status === 'done'
  const archived = task.archived ?? false
  // D-Day는 보관 여부와 무관하게 완료됐을 때만 숨김
  const dday     = done ? null : getDdayInfo(task.due_date, task.due_time, granularity, now)

  const priority = task.priority ?? 3.0
  const priorityColor =
    priority >= 4.5 ? 'text-red-500' :
    priority >= 3.5 ? 'text-amber-500' :
    priority <= 2.0 ? 'text-blue-300' :
    'text-gray-300'

  const animStyle = animMs > 0 ? {
    animation: `taskSlideIn ${animMs}ms ease both`,
    animationDelay: `${index * Math.min(animMs * 0.15, 50)}ms`,
  } : {}

  return (
    <>
    <div
      style={animStyle}
      onContextMenu={handleContextMenu}
      className={`relative flex items-start gap-3 px-4 py-3 border-b border-gray-100 transition-colors ${
        archived && done  ? 'bg-amber-50/60 hover:bg-amber-50' :
        archived          ? 'bg-amber-50/60 hover:bg-amber-50' :
        done              ? 'bg-gray-100'                       :
                            'bg-white hover:bg-gray-50'
      }`}
    >
      {/* ── Checkbox (archived 여부와 무관하게 done 토글) ─────────────────── */}
      <button
        onClick={() => toggleTask(task.id)}
        aria-label={done ? '완료 취소' : '완료 표시'}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center
                    justify-center transition-colors ${
                      done && archived  ? 'bg-amber-300 border-amber-300' :
                      done              ? 'bg-gray-300 border-gray-300'   :
                      archived          ? 'border-amber-300 hover:border-amber-500' :
                                          'border-gray-300 hover:border-zinc-600'
                    }`}
      >
        {done && <Check size={12} strokeWidth={3} className="text-white" />}
      </button>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-snug ${
            done && archived  ? 'line-through text-amber-400/70' :
            archived          ? 'text-amber-500'                 :
            done              ? 'line-through text-gray-400'     :
                                'text-gray-900'
          }`}
        >
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-xs ${done || archived ? 'text-gray-300' : 'text-gray-400'}`}>
            {task.due_date}
          </span>
          <span className={`text-xs font-medium ${done || archived ? 'text-gray-300' : 'text-blue-500'}`}>
            {formatTime(task.due_time)}
          </span>

          {/* Priority badge */}
          <span className={`text-[10px] font-semibold ${priorityColor}`}>
            ★ {priority.toFixed(1)}
          </span>

          {dday && (
            <>
              <span className="text-gray-200 text-xs select-none">·</span>
              <span className={`text-xs ${dday.cls}`}>{dday.text}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {/* Archive toggle */}
        <button
          onClick={() => archiveTask(task.id)}
          aria-label={archived ? '보관 취소' : '보관하기'}
          title={archived ? '보관 취소' : '보관하기'}
          className={`transition-colors ${
            archived
              ? 'text-amber-400 hover:text-amber-600'
              : 'text-gray-200 hover:text-amber-400'
          }`}
        >
          <Archive size={14} />
        </button>

        {/* Delete */}
        <button
          onClick={() => deleteTask(task.id)}
          aria-label="삭제"
          className="text-gray-200 hover:text-red-400 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

    </div>

    {/* ── Context Menu — portal to body ────────────────────────────────── */}
    {showPriority && createPortal(
      <div
        ref={popoverRef}
        style={{ position: 'fixed', left: popoverPos.x, top: popoverPos.y, zIndex: 9999 }}
        className="bg-white border border-gray-200 rounded-xl shadow-xl w-52 overflow-hidden"
      >
        {/* Priority slider section */}
        <div className="px-3.5 pt-3 pb-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 select-none uppercase tracking-wide">
              중요도
            </span>
            <span className="text-sm font-bold text-zinc-900">{priority.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={priorityStep}
            value={priority}
            onChange={(e) => setPriority(task.id, parseFloat(e.target.value))}
            className="w-full accent-zinc-900"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-300">1.0 낮음</span>
            <span className="text-[10px] text-gray-300">높음 5.0</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mx-1" />

        {/* Action buttons */}
        <div className="py-1">
          {/* 완료하기 / 완료 취소 */}
          <button
            onClick={() => { if (!archived) toggleTask(task.id); setShowPriority(false) }}
            disabled={archived}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700
                       hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Check size={14} strokeWidth={2.5} className={done ? 'text-zinc-900' : 'text-gray-300'} />
            {done ? '완료 취소' : '완료하기'}
          </button>

          {/* 보관하기 / 보관 취소 */}
          <button
            onClick={() => { archiveTask(task.id); setShowPriority(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700
                       hover:bg-gray-50 transition-colors"
          >
            <Archive size={14} className={archived ? 'text-amber-400' : 'text-gray-300'} />
            {archived ? '보관 취소' : '보관하기'}
          </button>

          {/* Divider */}
          <div className="border-t border-gray-100 mx-1 my-1" />

          {/* 삭제하기 */}
          <button
            onClick={() => { deleteTask(task.id); setShowPriority(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500
                       hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            삭제하기
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
