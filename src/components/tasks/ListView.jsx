import { useMemo, useState, useEffect, useRef } from 'react'
import useTaskStore from '../../store/taskStore'
import TaskItem from './TaskItem'

const GRANULARITY_OPTIONS = ['일', '시간', '분', '초']

const CURRENT_YEAR = new Date().getFullYear()

// ── Sort comparators ──────────────────────────────────────────────────────────
function compareByDate(a, b) {
  if (a.due_date !== b.due_date) return a.due_date > b.due_date ? 1 : -1
  if (!a.due_time && !b.due_time) return a.title.localeCompare(b.title)
  if (!a.due_time) return 1
  if (!b.due_time) return -1
  if (a.due_time !== b.due_time) return a.due_time > b.due_time ? 1 : -1
  return a.title.localeCompare(b.title)
}

function compareByPriority(a, b) {
  const pa = a.priority ?? 3.0
  const pb = b.priority ?? 3.0
  if (pb !== pa) return pb - pa
  return compareByDate(a, b)
}

// Compare done tasks: most recently due first (descending due_date)
function compareByDateDesc(a, b) {
  if (a.due_date !== b.due_date) return a.due_date > b.due_date ? -1 : 1
  if (!a.due_time && !b.due_time) return a.title.localeCompare(b.title)
  if (!a.due_time) return -1
  if (!b.due_time) return 1
  if (a.due_time !== b.due_time) return a.due_time > b.due_time ? -1 : 1
  return a.title.localeCompare(b.title)
}

// Format a due_date for the separator label
function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  const y = parseInt(year, 10)
  if (y !== CURRENT_YEAR) return `${year}-${month}-${day}`
  return `${month}-${day}`
}

// ── Controls (filter checkboxes + sort + granularity + priority filter) ──────
// Exported so TasksPage can embed them in the mobile panel
export function ListViewControls() {
  const showInProgress    = useTaskStore((s) => s.showInProgress)
  const showDone          = useTaskStore((s) => s.showDone)
  const showArchived      = useTaskStore((s) => s.showArchived)
  const setShowInProgress = useTaskStore((s) => s.setShowInProgress)
  const setShowDone       = useTaskStore((s) => s.setShowDone)
  const setShowArchived   = useTaskStore((s) => s.setShowArchived)
  const sortMode          = useTaskStore((s) => s.sortMode)
  const setSortMode       = useTaskStore((s) => s.setSortMode)
  const granularity       = useTaskStore((s) => s.ddayGranularity)
  const setGranularity    = useTaskStore((s) => s.setDdayGranularity)
  const priorityFilter    = useTaskStore((s) => s.priorityFilter)
  const setPriorityFilter = useTaskStore((s) => s.setPriorityFilter)
  const priorityStep      = useTaskStore((s) => s.priorityStep)

  const filterBoxes = [
    { key: 'in_progress', label: '진행중', checked: showInProgress, set: setShowInProgress },
    { key: 'done',        label: '완료됨', checked: showDone,        set: setShowDone },
    { key: 'archived',    label: '보관됨', checked: showArchived,    set: setShowArchived },
  ]

  return (
    <>
      {/* Filter checkboxes + sort buttons */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        {/* Checkboxes */}
        <div className="flex items-center gap-3">
          {filterBoxes.map(({ key, label, checked, set }) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.target.checked)}
                className="w-3.5 h-3.5 accent-zinc-900 cursor-pointer"
              />
              <span className={`text-xs font-medium transition-colors ${
                checked ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Sort mode — hidden when priority filter is active */}
        {priorityFilter === null && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortMode('due_date')}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors select-none ${
                sortMode === 'due_date'
                  ? 'bg-zinc-900 text-white'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              기한순
            </button>
            <button
              onClick={() => setSortMode('priority')}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors select-none ${
                sortMode === 'priority'
                  ? 'bg-zinc-900 text-white'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              중요도순
            </button>
          </div>
        )}
        {priorityFilter !== null && (
          <span className="text-[11px] font-semibold text-zinc-500 select-none">기한순</span>
        )}
      </div>

      {/* D-Day granularity */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/70">
        <span className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">
          D-Day 단위
        </span>
        <div className="flex items-center gap-1">
          {GRANULARITY_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors select-none ${
                granularity === g
                  ? 'bg-zinc-900 text-white'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Priority filter slider */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide select-none">
            중요도 필터
          </span>
          <span className={`text-[11px] font-bold ${priorityFilter !== null ? 'text-zinc-900' : 'text-gray-300'}`}>
            {priorityFilter !== null ? `★ ${priorityFilter.toFixed(1)}` : '전체'}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={priorityStep}
          value={priorityFilter ?? 3.0}
          onChange={(e) => setPriorityFilter(parseFloat(e.target.value))}
          className="w-full accent-zinc-900"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-300">1.0 낮음</span>
          <button
            onClick={() => setPriorityFilter(null)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors select-none ${
              priorityFilter === null
                ? 'bg-zinc-900 text-white'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            선택 안 함
          </button>
          <span className="text-[10px] text-gray-300">높음 5.0</span>
        </div>
      </div>
    </>
  )
}

export default function ListView({ hideControls = false }) {
  const tasks             = useTaskStore((s) => s.tasks)
  const loading           = useTaskStore((s) => s.loading)
  const showInProgress    = useTaskStore((s) => s.showInProgress)
  const showDone          = useTaskStore((s) => s.showDone)
  const showArchived      = useTaskStore((s) => s.showArchived)
  const sortMode          = useTaskStore((s) => s.sortMode)
  const granularity       = useTaskStore((s) => s.ddayGranularity)
  const taskAnimMs        = useTaskStore((s) => s.taskAnimMs)
  const priorityFilter    = useTaskStore((s) => s.priorityFilter)

  // ── Live clock ─────────────────────────────────────────────────────────────
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const ms = granularity === '초' ? 1_000 : 60_000
    const timer = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(timer)
  }, [granularity])

  // ── Anim key: bumps when filter or sort changes ────────────────────────────
  const [animKey, setAnimKey] = useState(0)
  const prevRef = useRef({ showInProgress, showDone, showArchived, sortMode, priorityFilter })

  useEffect(() => {
    const prev = prevRef.current
    if (
      prev.showInProgress  !== showInProgress  ||
      prev.showDone        !== showDone        ||
      prev.showArchived    !== showArchived    ||
      prev.sortMode        !== sortMode        ||
      prev.priorityFilter  !== priorityFilter
    ) {
      setAnimKey((k) => k + 1)
      prevRef.current = { showInProgress, showDone, showArchived, sortMode, priorityFilter }
    }
  }, [showInProgress, showDone, showArchived, sortMode, priorityFilter])

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const comparator = sortMode === 'priority' ? compareByPriority : compareByDate

  // Apply priority filter to a task array
  const applyPriorityFilter = (arr) => {
    if (priorityFilter === null) return arr
    return arr.filter((t) => (t.priority ?? 3.0) === priorityFilter)
  }

  const { inProgressTasks, unarchivedIncomplete, doneTasks, splitMode } = useMemo(() => {
    const inP  = tasks.filter((t) => !t.archived && t.status === 'in_progress')
    const done = tasks.filter((t) => t.status === 'done') // includes archived+done
    const archiveNotDone = tasks.filter((t) => t.archived && t.status !== 'done')

    const split = showInProgress && (showDone || showArchived)

    if (split) {
      // Top group: in-progress (non-archived) — sorted by comparator
      const topGroup = [...applyPriorityFilter(inP)].sort(comparator)

      // Bottom group: unarchived incomplete (archived & in_progress) first,
      // then done tasks sorted by most recent due_date first
      const archNotDoneVisible = showArchived ? applyPriorityFilter(archiveNotDone) : []
      const doneVisible        = showDone     ? applyPriorityFilter(done)          : []

      const sortedArchNotDone  = [...archNotDoneVisible].sort(compareByDate)
      const sortedDone         = [...doneVisible].sort(compareByDateDesc)

      return {
        inProgressTasks: topGroup,
        unarchivedIncomplete: sortedArchNotDone,
        doneTasks: sortedDone,
        splitMode: true,
      }
    }

    // Single flat list mode
    const visible = applyPriorityFilter(tasks.filter((t) => {
      if (t.archived && t.status !== 'done') return showArchived
      if (t.archived && t.status === 'done') return showDone || showArchived
      if (t.status === 'in_progress') return showInProgress
      if (t.status === 'done')        return showDone
      return true
    }))

    return {
      inProgressTasks: [...visible].sort(comparator),
      unarchivedIncomplete: [],
      doneTasks: [],
      splitMode: false,
    }
  }, [tasks, showInProgress, showDone, showArchived, sortMode, priorityFilter])

  // ── Build done rows with date separators ───────────────────────────────────
  const doneRows = useMemo(() => {
    if (!splitMode || doneTasks.length === 0) return []
    const rows = []
    let prevDate = null
    for (const task of doneTasks) {
      const d = task.due_date
      if (d !== prevDate) {
        rows.push({ type: 'separator', date: d, key: `sep-${d}` })
        prevDate = d
      }
      rows.push({ type: 'task', task, key: task.id })
    }
    return rows
  }, [doneTasks, splitMode])

  // Flat tasks for non-split mode (already in inProgressTasks when !splitMode)
  const flatTasks = splitMode ? [] : inProgressTasks

  const isEmpty = splitMode
    ? inProgressTasks.length === 0 && unarchivedIncomplete.length === 0 && doneTasks.length === 0
    : flatTasks.length === 0

  return (
    <div>
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        {!hideControls && <ListViewControls />}
      </div>

      {/* ── Loading spinner ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-zinc-700 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <p className="text-sm font-medium">일정이 없습니다</p>
          <p className="text-xs mt-1">위에서 새 일정을 추가해 보세요</p>
        </div>
      )}

      {/* ── Task list ──────────────────────────────────────────────────────── */}
      {!loading && splitMode ? (
        <>
          {/* 진행중 그룹 */}
          {inProgressTasks.map((task, idx) => (
            <TaskItem
              key={`${animKey}-${task.id}`}
              task={task}
              now={now}
              granularity={granularity}
              index={idx}
              animMs={taskAnimMs}
            />
          ))}

          {/* 구분선: 진행중 → 보관(미완료) / 완료 그룹 */}
          {(unarchivedIncomplete.length > 0 || doneTasks.length > 0) && (
            <div className="flex items-center justify-center py-3">
              <div className="w-24 border-t border-dashed border-gray-200" />
            </div>
          )}

          {/* 완료 안 된 보관 그룹 */}
          {unarchivedIncomplete.map((task, idx) => (
            <TaskItem
              key={`${animKey}-${task.id}`}
              task={task}
              now={now}
              granularity={granularity}
              index={inProgressTasks.length + 1 + idx}
              animMs={taskAnimMs}
            />
          ))}

          {/* 마진: 미완료 보관 → 완료 그룹 */}
          {unarchivedIncomplete.length > 0 && doneTasks.length > 0 && (
            <div className="py-2" />
          )}

          {/* 완료 그룹 (날짜 구분선 포함) */}
          {doneRows.map((row, rowIdx) => {
            if (row.type === 'separator') {
              return (
                <div key={row.key} className="flex items-center gap-2 px-4 py-1.5">
                  <div className="flex-1 border-t border-gray-100" />
                  <span className="text-[10px] font-medium text-gray-300 select-none">
                    {formatDateLabel(row.date)}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
              )
            }
            return (
              <TaskItem
                key={`${animKey}-${row.key}`}
                task={row.task}
                now={now}
                granularity={granularity}
                index={inProgressTasks.length + unarchivedIncomplete.length + 2 + rowIdx}
                animMs={taskAnimMs}
              />
            )
          })}
        </>
      ) : (
        !loading && flatTasks.map((task, idx) => (
          <TaskItem
            key={`${animKey}-${task.id}`}
            task={task}
            now={now}
            granularity={granularity}
            index={idx}
            animMs={taskAnimMs}
          />
        ))
      )}
    </div>
  )
}
