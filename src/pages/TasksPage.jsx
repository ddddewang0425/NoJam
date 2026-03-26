import { useEffect, useRef, useState } from 'react'
import { List, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import useTaskStore from '../store/taskStore'
import QuickAdd from '../components/tasks/QuickAdd'
import ListView, { ListViewControls } from '../components/tasks/ListView'
import CalendarView from '../components/tasks/CalendarView'

const MIN_CAL_W  = 280
const MAX_CAL_W  = 720
const INIT_CAL_W = 520

export default function TasksPage() {
  const fetchTasks      = useTaskStore((state) => state.fetchTasks)
  const taskAnimMs      = useTaskStore((s) => s.taskAnimMs)
  const [mobileTab, setMobileTab] = useState('list')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [calWidth, setCalWidth]   = useState(INIT_CAL_W)
  const dragging  = useRef(false)
  const startX    = useRef(0)
  const startW    = useRef(0)

  // ── Swipe gesture state ───────────────────────────────────────────────────
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const swipeLocked = useRef(null) // 'h' | 'v' | null

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── Drag-to-resize (mouse) ────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      setCalWidth(Math.max(MIN_CAL_W, Math.min(MAX_CAL_W, startW.current + delta)))
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor    = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const onDividerDown = (e) => {
    dragging.current   = true
    startX.current     = e.clientX
    startW.current     = calWidth
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  // ── Swipe handlers ────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeLocked.current = null
  }

  const onTouchMove = (e) => {
    if (swipeLocked.current === 'v') return
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (swipeLocked.current === null) {
      if (dy > 8) { swipeLocked.current = 'v'; return }
      if (dx > 8)  swipeLocked.current = 'h'
    }
    if (swipeLocked.current === 'h') e.preventDefault()
  }

  const onTouchEnd = (e) => {
    if (swipeLocked.current !== 'h') return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) < 60 || dy > Math.abs(dx)) return
    if (dx < 0 && mobileTab === 'list')     setMobileTab('calendar')
    if (dx > 0 && mobileTab === 'calendar') setMobileTab('list')
  }

  const animDuration = `${taskAnimMs}ms`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top Header ── safe area + app identity ──────────────────────── */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* 앱 아이콘 + 이름 */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
          <img src="/icons/icon.svg" alt="NoJam" className="w-7 h-7 rounded-lg" />
          <span className="text-base font-semibold text-zinc-900 tracking-tight">NoJam</span>
        </div>
        {/* 일정 입력 */}
        <QuickAdd />
      </div>

      {/* ── Mobile Tab Bar ── hidden on desktop ──────────────────────────── */}
      <div className="lg:hidden flex-shrink-0 flex bg-white border-b border-gray-100 relative">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'list' ? 'text-zinc-900' : 'text-gray-400'
          }`}
        >
          <List size={15} />
          리스트
        </button>
        <button
          onClick={() => setMobileTab('calendar')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'calendar' ? 'text-zinc-900' : 'text-gray-400'
          }`}
        >
          <CalendarDays size={15} />
          캘린더
        </button>
        {/* 슬라이딩 인디케이터 */}
        <span
          className="absolute bottom-0 h-0.5 w-1/2 bg-zinc-900 rounded-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${mobileTab === 'list' ? '0%' : '100%'})` }}
        />
      </div>

      {/* ── Mobile Options Panel ── only shown in list mode ──────────────── */}
      {mobileTab === 'list' && (
        <div className="lg:hidden flex-shrink-0 bg-white border-b border-gray-100 overflow-hidden">
          {/* Animated expand/collapse wrapper */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: optionsOpen ? '1fr' : '0fr',
              transition: `grid-template-rows ${animDuration} ease`,
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <ListViewControls />
              {/* Close button */}
              <button
                onClick={() => setOptionsOpen(false)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors select-none border-t border-gray-100"
              >
                <ChevronUp size={14} />
                옵션 닫기
              </button>
            </div>
          </div>

          {/* Open button — visible when closed */}
          {!optionsOpen && (
            <button
              onClick={() => setOptionsOpen(true)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors select-none"
            >
              <ChevronDown size={14} />
              옵션 열기
            </button>
          )}
        </div>
      )}

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {/* Desktop: resizable split view */}
        <div className="hidden lg:flex h-full">
          <section className="flex-1 overflow-y-auto min-w-0">
            {/* Desktop shows controls inside ListView */}
            <ListView />
          </section>

          {/* ── Drag handle ─────────────────────────────────────────────── */}
          <div
            onMouseDown={onDividerDown}
            className="group w-1.5 flex-shrink-0 bg-gray-200 hover:bg-zinc-400
                       active:bg-zinc-600 cursor-col-resize transition-colors
                       flex items-center justify-center select-none"
          >
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {[0,1,2].map((i) => (
                <div key={i} className="w-0.5 h-0.5 rounded-full bg-white" />
              ))}
            </div>
          </div>

          <section
            style={{ width: calWidth, flexShrink: 0 }}
            className="overflow-y-auto bg-gray-50/50"
          >
            <CalendarView />
          </section>
        </div>

        {/* Mobile: sliding panel (swipe + tab) */}
        <div
          className="lg:hidden h-full overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              width: '200%',
              transform: `translateX(${mobileTab === 'list' ? '0%' : '-50%'})`,
            }}
          >
            {/* 리스트 패널 — hideControls: controls are in the options panel above */}
            <div className="w-1/2 h-full overflow-y-auto pb-16">
              <ListView hideControls />
            </div>
            {/* 캘린더 패널 */}
            <div className="w-1/2 h-full overflow-y-auto pb-16">
              <CalendarView />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
