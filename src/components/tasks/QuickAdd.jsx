import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import useTaskStore from '../../store/taskStore'
import ScrollDatePicker, { ScrollTimePicker } from './ScrollDatePicker'

export default function QuickAdd() {
  const addTask = useTaskStore((s) => s.addTask)

  const [title,      setTitle]      = useState('')
  const [date,       setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time,       setTime]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Repeat ────────────────────────────────────────────────────────────────
  const [isRepeat,       setIsRepeat]       = useState(false)
  const [repeatDays,     setRepeatDays]     = useState(0)
  const [repeatHours,    setRepeatHours]    = useState(0)
  const [repeatMinutes,  setRepeatMinutes]  = useState(0)
  const [repeatSeconds,  setRepeatSeconds]  = useState(0)

  const canSubmit = title.trim() && date && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    await addTask({
      title: title.trim(),
      due_date: date,
      due_time: time || null,
      is_repeat: isRepeat,
      repeat_days:    isRepeat ? repeatDays    : 0,
      repeat_hours:   isRepeat ? repeatHours   : 0,
      repeat_minutes: isRepeat ? repeatMinutes : 0,
      repeat_seconds: isRepeat ? repeatSeconds : 0,
    })
    setTitle('')
    setSubmitting(false)
  }

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      {/* 제목 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKey}
        placeholder="새 일정 제목..."
        disabled={submitting}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent
                   placeholder-gray-400 disabled:opacity-50"
      />

      {/* 날짜 · 시간 · 반복 체크박스 · 추가 */}
      <div className="flex items-center gap-2">
        {/* 날짜 */}
        <ScrollDatePicker value={date} onChange={setDate} />

        {/* 시간 (선택) */}
        <ScrollTimePicker value={time} onChange={setTime} />

        {/* 반복 체크박스 */}
        <label
          className={`flex items-center gap-1 cursor-pointer select-none px-2 py-1.5 rounded-md border transition-colors ${
            isRepeat
              ? 'border-zinc-400 bg-zinc-50 text-zinc-700'
              : 'border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
          title="반복 일정"
        >
          <input
            type="checkbox"
            checked={isRepeat}
            onChange={(e) => setIsRepeat(e.target.checked)}
            className="sr-only"
          />
          <RefreshCw size={13} className={isRepeat ? 'text-zinc-700' : 'text-gray-400'} />
          <span className="text-xs font-medium">반복</span>
        </label>

        {/* 여백 */}
        <div className="flex-1" />

        {/* + 추가 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 text-white text-sm
                     font-medium rounded-lg hover:bg-zinc-700 active:bg-zinc-800
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Plus size={15} />
          추가
        </button>
      </div>

      {/* 반복 간격 설정 (확장 패널) */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isRepeat ? '1fr' : '0fr',
          transition: 'grid-template-rows 250ms ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pt-1 pb-0.5 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400 font-semibold select-none">반복 간격</span>

            {[
              { label: '일', value: repeatDays,    set: setRepeatDays,    max: 365 },
              { label: '시간', value: repeatHours,  set: setRepeatHours,  max: 23  },
              { label: '분',   value: repeatMinutes, set: setRepeatMinutes, max: 59 },
              { label: '초',   value: repeatSeconds, set: setRepeatSeconds, max: 59 },
            ].map(({ label, value, set, max }) => (
              <label key={label} className="flex items-center gap-1 select-none">
                <input
                  type="number"
                  min={0}
                  max={max}
                  value={value}
                  onChange={(e) => set(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
                  className="w-12 text-center text-sm border border-gray-200 rounded-md px-1 py-1
                             focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <span className="text-[11px] text-gray-500">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
