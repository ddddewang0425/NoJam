import { useState } from 'react'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import useTaskStore from '../../store/taskStore'
import ScrollDatePicker, { ScrollTimePicker } from './ScrollDatePicker'

export default function QuickAdd() {
  const addTask = useTaskStore((s) => s.addTask)

  const [title,      setTitle]      = useState('')
  const [date,       setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time,       setTime]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim() && date && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    await addTask({ title: title.trim(), due_date: date, due_time: time || null })
    setTitle('')
    // date/time 유지 (연속 입력 편의)
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

      {/* 날짜 · 시간 · 추가 */}
      <div className="flex items-center gap-2">
        {/* 날짜 */}
        <ScrollDatePicker value={date} onChange={setDate} />

        {/* 시간 (선택) */}
        <ScrollTimePicker value={time} onChange={setTime} />

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
    </div>
  )
}
