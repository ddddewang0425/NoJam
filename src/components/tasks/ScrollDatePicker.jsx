import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { format, getDaysInMonth } from 'date-fns'

/* ─── 상수 ─── */
const ITEM_H = 36
const VISIBLE = 3
const PAD = Math.floor(VISIBLE / 2) // = 1

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/* ─── 단일 드럼롤 컬럼 ─── */
function Drum({ items, value, onChange, width = 52 }) {
  const listRef     = useRef(null)
  const isDragging  = useRef(false)
  const startY      = useRef(0)
  const startScroll = useRef(0)
  const velocity    = useRef(0)
  const lastY       = useRef(0)
  const lastT       = useRef(0)
  const rafId       = useRef(null)
  const wheelTimer  = useRef(null)

  /* 인덱스 → 스크롤 위치 */
  const scrollTo = useCallback((i, smooth = false) => {
    const el = listRef.current
    if (!el) return
    const target = i * ITEM_H
    if (smooth) el.scrollTo({ top: target, behavior: 'smooth' })
    else        el.scrollTop = target
  }, [])

  /* value 또는 items 배열이 바뀌면 항상 재동기화 */
  useEffect(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current)
    clearTimeout(wheelTimer.current)
    const newIdx = items.indexOf(value)
    if (newIdx >= 0) scrollTo(newIdx)
  }, [value, items, scrollTo])

  /* 가장 가까운 칸으로 snap */
  const snap = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const i = Math.round(el.scrollTop / ITEM_H)
    const c = Math.max(0, Math.min(items.length - 1, i))
    scrollTo(c, true)
    onChange(items[c])
  }, [items, onChange, scrollTo])

  /* 관성 스크롤 */
  const applyMomentum = useCallback(() => {
    const el = listRef.current
    if (!el) return
    let v = velocity.current * 14
    const tick = () => {
      if (Math.abs(v) < 0.4) { snap(); return }
      el.scrollTop += v
      v *= 0.90
      rafId.current = requestAnimationFrame(tick)
    }
    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(tick)
  }, [snap])

  /* ── 휠: passive:false 로 직접 등록 ── */
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      el.scrollTop += Math.sign(e.deltaY) * ITEM_H
      clearTimeout(wheelTimer.current)
      wheelTimer.current = setTimeout(snap, 150)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [snap])

  /* ── 마우스 드래그 ── */
  const onMouseDown = (e) => {
    e.preventDefault()
    if (rafId.current) cancelAnimationFrame(rafId.current)
    isDragging.current  = true
    startY.current      = e.clientY
    startScroll.current = listRef.current.scrollTop
    velocity.current    = 0
    lastY.current       = e.clientY
    lastT.current       = Date.now()
  }
  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    listRef.current.scrollTop = startScroll.current + (startY.current - e.clientY)
    const now = Date.now(); const dt = now - lastT.current || 1
    velocity.current = (lastY.current - e.clientY) / dt
    lastY.current = e.clientY; lastT.current = now
  }, [])
  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    applyMomentum()
  }, [applyMomentum])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',  onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',  onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  /* ── 터치 ── */
  const onTouchStart = (e) => {
    const t = e.touches[0]
    if (rafId.current) cancelAnimationFrame(rafId.current)
    isDragging.current  = true
    startY.current      = t.clientY
    startScroll.current = listRef.current.scrollTop
    velocity.current    = 0
    lastY.current       = t.clientY; lastT.current = Date.now()
  }
  const onTouchMove = useCallback((e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const t  = e.touches[0]
    listRef.current.scrollTop = startScroll.current + (startY.current - t.clientY)
    const now = Date.now(); const dt = now - lastT.current || 1
    velocity.current = (lastY.current - t.clientY) / dt
    lastY.current = t.clientY; lastT.current = now
  }, [])
  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    applyMomentum()
  }, [applyMomentum])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [onTouchMove])

  return (
    <div className="relative select-none overflow-hidden rounded-lg"
         style={{ width, height: ITEM_H * VISIBLE }}>
      {/* 하이라이트 (배경) */}
      <div className="pointer-events-none absolute left-0 right-0 rounded-md bg-zinc-100"
           style={{ top: PAD * ITEM_H, height: ITEM_H, zIndex: 0 }} />

      {/* 목록 */}
      <div ref={listRef}
           onMouseDown={onMouseDown}
           onTouchStart={onTouchStart}
           onTouchEnd={onTouchEnd}
           className="relative h-full overflow-hidden cursor-grab active:cursor-grabbing"
           style={{ scrollbarWidth: 'none', zIndex: 1 }}>
        {Array(PAD).fill(null).map((_, i) => <div key={`pt-${i}`} style={{ height: ITEM_H }} />)}
        {items.map((item) => (
          <div key={item} style={{ height: ITEM_H }}
               className={`flex items-center justify-center text-sm font-semibold transition-colors
                 ${item === value ? 'text-zinc-900' : 'text-zinc-400'}`}>
            {String(item).padStart(2, '0')}
          </div>
        ))}
        {Array(PAD).fill(null).map((_, i) => <div key={`pb-${i}`} style={{ height: ITEM_H }} />)}
      </div>

      {/* 페이드 오버레이 */}
      <div className="pointer-events-none absolute inset-x-0 top-0"
           style={{ height: ITEM_H * PAD, background: 'linear-gradient(to bottom, white 30%, transparent)', zIndex: 2 }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0"
           style={{ height: ITEM_H * PAD, background: 'linear-gradient(to top, white 30%, transparent)', zIndex: 2 }} />
    </div>
  )
}

/* ─── 드롭다운 위치를 트리거 기준으로 계산해 portal로 띄우는 래퍼 ─── */
function PickerPortal({ triggerRef, children, onClose }) {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left })
  }, [triggerRef])

  // 외부 클릭 닫기
  useEffect(() => {
    const h = (e) => {
      if (triggerRef.current && !triggerRef.current.closest('[data-picker-root]')?.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, triggerRef])

  if (!pos) return null

  return createPortal(
    <div
      data-picker-dropdown
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
      }}
      className="bg-white rounded-xl shadow-2xl border border-gray-100 p-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}

/* ─── 날짜 피커 ─── */
export function ScrollDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const rootRef = useRef(null)

  const parsed = value ? new Date(value + 'T00:00:00') : new Date()
  const [year,  setYear]  = useState(parsed.getFullYear())
  const [month, setMonth] = useState(parsed.getMonth() + 1)
  const [day,   setDay]   = useState(parsed.getDate())

  const years  = range(2020, 2035)
  const months = range(1, 12)
  const days   = range(1, getDaysInMonth(new Date(year, month - 1)))

  useEffect(() => {
    const maxDay = getDaysInMonth(new Date(year, month - 1))
    if (day > maxDay) setDay(maxDay)
  }, [year, month])

  const confirm = () => {
    onChange(format(new Date(year, month - 1, day), 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <div ref={rootRef} data-picker-root className="relative inline-block">
      <button ref={btnRef} type="button" onClick={() => setOpen(p => !p)}
              className="text-sm text-gray-700 border border-gray-200 rounded-md px-2 py-1.5
                         focus:outline-none focus:border-zinc-400 transition-colors hover:border-zinc-300 whitespace-nowrap">
        {value || '날짜 선택'}
      </button>

      {open && (
        <PickerPortal triggerRef={btnRef} onClose={() => setOpen(false)}>
          <p className="text-xs text-zinc-400 text-center mb-2 font-medium tracking-wide">날짜 선택</p>
          <div className="flex items-center justify-center gap-0.5">
            <Drum items={years}  value={year}  onChange={setYear}  width={72} />
            <span className="text-zinc-300 text-xs px-0.5">년</span>
            <Drum items={months} value={month} onChange={setMonth} width={54} />
            <span className="text-zinc-300 text-xs px-0.5">월</span>
            <Drum items={days}   value={day}   onChange={setDay}   width={54} />
            <span className="text-zinc-300 text-xs px-0.5">일</span>
          </div>
          <button onClick={confirm}
                  className="mt-3 w-full py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            확인
          </button>
        </PickerPortal>
      )}
    </div>
  )
}

/* ─── 시간 피커 ─── */
export function ScrollTimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  const parseTime = (v) => {
    if (!v) return { h: 9, m: 0 }
    const [hh, mm] = v.split(':').map(Number)
    return { h: hh, m: mm }
  }
  const { h: initH, m: initM } = parseTime(value)
  const [hour, setHour] = useState(initH)
  const [min,  setMin]  = useState(initM)

  const hours   = range(0, 23)
  const minutes = range(0, 59)

  const confirm = () => {
    onChange(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    setOpen(false)
  }
  const clear = () => { onChange(''); setOpen(false) }

  return (
    <div data-picker-root className="relative inline-block">
      <button ref={btnRef} type="button" onClick={() => setOpen(p => !p)}
              className="text-sm text-gray-700 border border-gray-200 rounded-md px-2 py-1.5
                         focus:outline-none focus:border-zinc-400 transition-colors hover:border-zinc-300 whitespace-nowrap">
        {value || '시간 선택'}
      </button>

      {open && (
        <PickerPortal triggerRef={btnRef} onClose={() => setOpen(false)}>
          <p className="text-xs text-zinc-400 text-center mb-2 font-medium tracking-wide">시간 선택</p>
          <div className="flex items-center justify-center gap-0.5">
            <Drum items={hours}   value={hour} onChange={setHour} width={62} />
            <span className="text-zinc-400 text-base font-bold px-1">:</span>
            <Drum items={minutes} value={min}  onChange={setMin}  width={62} />
          </div>
          <button onClick={confirm}
                  className="mt-3 w-full py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            확인
          </button>
          <button onClick={clear}
                  className="mt-1 w-full py-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            시간 없음
          </button>
        </PickerPortal>
      )}
    </div>
  )
}

/* 기본 export (하위 호환) */
export default ScrollDatePicker
