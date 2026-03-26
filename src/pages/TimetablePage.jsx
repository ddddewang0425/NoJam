import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import useTimetableStore from '../store/timetableStore'
import TimetableGrid from '../components/timetable/TimetableGrid'
import TimetableEntryForm from '../components/timetable/TimetableEntryForm'

export default function TimetablePage() {
  const fetchEntries = useTimetableStore((s) => s.fetchEntries)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleEditEntry = (entry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setEditingEntry(null)
    setShowForm(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-3">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="Dayjee" className="w-7 h-7 rounded-lg" />
            <span className="text-base font-semibold text-zinc-900 tracking-tight">시간표</span>
          </div>
          <button
            onClick={() => { setEditingEntry(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-sm
                       font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Plus size={15} />
            추가
          </button>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden pb-16 lg:pb-0">
        <TimetableGrid onEditEntry={handleEditEntry} />
      </div>

      {/* ── Add/Edit Entry Modal ───────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          {/* Card */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 mb-4 sm:mb-0 overflow-y-auto max-h-[90vh]">
            <TimetableEntryForm onClose={handleCloseForm} initialData={editingEntry} />
          </div>
        </div>
      )}
    </div>
  )
}
