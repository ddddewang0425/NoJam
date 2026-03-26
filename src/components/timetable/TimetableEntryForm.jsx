import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { format, startOfWeek, addDays, nextDay } from 'date-fns'
import useTimetableStore from '../../store/timetableStore'
import useTaskStore from '../../store/taskStore'
import { TimetableTimePicker } from '../tasks/ScrollDatePicker'

const DAYS = [
  { label: '일', dow: 0 },
  { label: '월', dow: 1 },
  { label: '화', dow: 2 },
  { label: '수', dow: 3 },
  { label: '목', dow: 4 },
  { label: '금', dow: 5 },
  { label: '토', dow: 6 },
]

const PALETTE = [
  '#a5b4fc', '#86efac', '#fca5a5', '#fcd34d',
  '#67e8f9', '#f9a8d4', '#fdba74', '#c4b5fd',
  '#6ee7b7', '#93c5fd', '#d1d5db',
]

// Find the next occurrence of a given JS day_of_week from today (or today if it matches)
function nextOccurrenceDate(dow) {
  const today = new Date()
  const todayDow = today.getDay()
  const diff = (dow - todayDow + 7) % 7
  const result = new Date(today)
  result.setDate(today.getDate() + diff)
  return format(result, 'yyyy-MM-dd')
}

export default function TimetableEntryForm({ onClose, initialData = null }) {
  const addEntry    = useTimetableStore((s) => s.addEntry)
  const updateEntry = useTimetableStore((s) => s.updateEntry)
  const addTask     = useTaskStore((s) => s.addTask)

  const isEdit = !!initialData

  const [title,      setTitle]      = useState(initialData?.title || '')
  const [subtitle,   setSubtitle]   = useState(initialData?.subtitle || '')
  const [selectedDays, setSelectedDays] = useState(initialData ? [initialData.day_of_week] : [])
  const [startTime,  setStartTime]  = useState(initialData?.start_time?.substring(0,5) || '09:00')
  const [endTime,    setEndTime]    = useState(initialData?.end_time?.substring(0,5) || '10:00')
  const [color,      setColor]      = useState(initialData?.color || PALETTE[0])
  const [linkTask,   setLinkTask]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const toggleDay = (dow) => {
    setSelectedDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    )
  }

  const canSubmit = title.trim() && selectedDays.length > 0 && startTime && endTime && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    if (isEdit) {
      // Editing an existing entry (only one day supported intrinsically via Day selection)
      await updateEntry(initialData.id, {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        day_of_week: selectedDays[0] ?? initialData.day_of_week,
        start_time: startTime,
        end_time: endTime,
        color,
      })
    } else {
      let taskIds = null
      if (linkTask) {
        taskIds = await Promise.all(
          selectedDays.map(async (dow) => {
            const due_date = nextOccurrenceDate(dow)
            const task = await addTask({
              title: title.trim(),
              due_date,
              due_time: endTime,
              is_repeat: true,
              repeat_days: 7,
              repeat_hours: 0,
              repeat_minutes: 0,
              repeat_seconds: 0,
            })
            return task?.id ?? null
          })
        )
      }

      await addEntry({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        days: selectedDays,
        start_time: startTime,
        end_time: endTime,
        color,
        taskIds,
      })
    }

    setSubmitting(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900">
          {isEdit ? '시간표 일정 수정' : '시간표 일정 추가'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="수업 또는 일정 제목..."
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent
                     placeholder-gray-400"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">부제목 (선택)</label>
        <textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="강의실, 교수님, 혹은 관련된 메모..."
          rows={2}
          className="mt-1 w-full px-3 py-2 text-xs border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent
                     placeholder-gray-400 resize-none"
        />
      </div>

      {/* Day selection */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">
          {isEdit ? '요일' : '요일 (복수 선택 가능)'}
        </label>
        <div className="mt-1.5 flex gap-1.5 flex-wrap">
          {DAYS.map(({ label, dow }) => {
            const isSelected = selectedDays.includes(dow);
            // In edit mode, clicking a different day replaces the selection instead of toggling multiple
            const handleClick = () => {
              if (isEdit) {
                setSelectedDays([dow])
              } else {
                toggleDay(dow)
              }
            }
            return (
              <button
                key={dow}
                onClick={handleClick}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all select-none ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time range */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">시간</label>
        <div className="mt-1.5 flex items-center gap-2">
          <TimetableTimePicker value={startTime} onChange={setStartTime} label="시작 시간" />
          <span className="text-gray-400 text-sm">~</span>
          <TimetableTimePicker value={endTime}   onChange={setEndTime}   label="종료 시간" />
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">색상</label>
        <div className="mt-1.5 flex gap-1.5 flex-wrap">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-transform select-none ${
                color === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-400' : 'hover:scale-110'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Link to task (Only show when creating new entry) */}
      {!isEdit && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            onClick={() => setLinkTask((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              linkTask ? 'bg-zinc-900' : 'bg-gray-200'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                linkTask ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 select-none">일정에도 추가</p>
            <p className="text-[10px] text-gray-400 select-none">
              {linkTask
                ? '각 요일마다 7일 반복 일정이 생성되며 연동됩니다'
                : '선택하면 반복 일정과 연동됩니다'}
            </p>
          </div>
        </label>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl
                   hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? '저장 중...' : isEdit ? '수정하기' : '추가하기'}
      </button>
    </div>
  )
}
