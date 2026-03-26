import { create } from 'zustand'
import { format } from 'date-fns'
import { supabase } from '../supabase'
import useAuthStore from './authStore'

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
  if (b.priority !== a.priority) return b.priority - a.priority
  return compareByDate(a, b)
}

function sortTasks(tasks, sortMode) {
  return [...tasks].sort(sortMode === 'priority' ? compareByPriority : compareByDate)
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const getLS = (key, def) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def }
}
const setLS = (key, val) => localStorage.setItem(key, JSON.stringify(val))

// ── Store ─────────────────────────────────────────────────────────────────────
const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  currentMonth: new Date(),

  // Filter visibility (persisted)
  showInProgress: getLS('show-in-progress', true),
  showDone:       getLS('show-done',        true),
  showArchived:   getLS('show-archived',    false),

  // Sort mode (persisted): 'due_date' | 'priority'
  sortMode: getLS('sort-mode', 'due_date'),

  // Priority filter (not persisted): null = show all, number = filter to that priority
  priorityFilter: null,

  // D-Day granularity (persisted)
  ddayGranularity: localStorage.getItem('dday-granularity') || '시간',

  // Settings (persisted)
  timetableRange:   getLS('timetable-range',    [6, 30]),
  timetableRowH:    getLS('timetable-row-h',    48),
  priorityStep:     getLS('priority-step',      0.5),
  pageTransitionMs: getLS('page-transition-ms', 300),
  taskAnimMs:       getLS('task-anim-ms',        300),

  // ── Setters ────────────────────────────────────────────────────────────────
  setShowInProgress: (v) => { setLS('show-in-progress', v); set({ showInProgress: v }) },
  setShowDone:       (v) => { setLS('show-done',        v); set({ showDone:       v }) },
  setShowArchived:   (v) => { setLS('show-archived',    v); set({ showArchived:   v }) },
  setPriorityFilter: (v) => set({ priorityFilter: v }),

  setSortMode: (v) => {
    setLS('sort-mode', v)
    set((s) => ({ sortMode: v, tasks: sortTasks(s.tasks, v) }))
  },

  setCurrentMonth: (month) => set({ currentMonth: month }),

  setDdayGranularity: (g) => {
    localStorage.setItem('dday-granularity', g)
    set({ ddayGranularity: g })
  },

  setTimetableRange:     (v) => { setLS('timetable-range',    v); set({ timetableRange:   v }) },
  setTimetableRowH:      (v) => { setLS('timetable-row-h',    v); set({ timetableRowH:    v }) },
  setPriorityStep:       (v) => { setLS('priority-step',      v); set({ priorityStep:     v }) },
  setPageTransitionMs:   (v) => { setLS('page-transition-ms', v); set({ pageTransitionMs: v }) },
  setTaskAnimMs:         (v) => { setLS('task-anim-ms',        v); set({ taskAnimMs:       v }) },

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchTasks: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true, nullsFirst: false })

      if (error) throw error
      set({ tasks: sortTasks(data ?? [], get().sortMode), loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // ── Add ────────────────────────────────────────────────────────────────────
  addTask: async ({ title, due_date, due_time, is_repeat = false, repeat_days = 0, repeat_hours = 0, repeat_minutes = 0, repeat_seconds = 0 }) => {
    const user = useAuthStore.getState().user
    if (!user) return null
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title, due_date, due_time: due_time || null,
          status: 'in_progress', archived: false, priority: 3.0, user_id: user.id,
          is_repeat, repeat_days, repeat_hours, repeat_minutes, repeat_seconds,
        }])
        .select()
        .single()

      if (error) throw error
      set((s) => ({ tasks: sortTasks([...s.tasks, data], s.sortMode) }))
      return data
    } catch (err) {
      set({ error: err.message })
      return null
    }
  },

  // ── Toggle done / in_progress (archived 상태와 무관하게 독립 동작) ──────────
  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    const newStatus = task.status === 'done' ? 'in_progress' : 'done'
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, status: newStatus } : t),
    }))

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id)
    if (error) {
      set((s) => ({
        tasks: s.tasks.map((t) => t.id === id ? { ...t, status: task.status } : t),
        error: error.message,
      }))
    }
  },

  // ── Archive (archived boolean 토글, status는 유지) ─────────────────────────
  archiveTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    const newArchived = !task.archived
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, archived: newArchived } : t),
    }))

    const { error } = await supabase.from('tasks').update({ archived: newArchived }).eq('id', id)
    if (error) {
      set((s) => ({
        tasks: s.tasks.map((t) => t.id === id ? { ...t, archived: task.archived } : t),
        error: error.message,
      }))
    }
  },

  // ── Set priority (optimistic, re-sorts if in priority mode) ───────────────
  setPriority: async (id, priority) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    set((s) => ({
      tasks: sortTasks(
        s.tasks.map((t) => t.id === id ? { ...t, priority } : t),
        s.sortMode,
      ),
    }))

    const { error } = await supabase.from('tasks').update({ priority }).eq('id', id)
    if (error) {
      set((s) => ({
        tasks: s.tasks.map((t) => t.id === id ? { ...t, priority: task.priority } : t),
        error: error.message,
      }))
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteTask: async (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))

    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      get().fetchTasks()
      set({ error: error.message })
    }
  },

  // ── Advance (repeat task: move due date/time forward by repeat interval) ───
  advanceTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task || !task.is_repeat) return

    const totalMs =
      (task.repeat_days    || 0) * 86_400_000 +
      (task.repeat_hours   || 0) *  3_600_000 +
      (task.repeat_minutes || 0) *     60_000 +
      (task.repeat_seconds || 0) *      1_000

    const [y, mo, d]   = task.due_date.split('-').map(Number)
    const [h, mi]      = (task.due_time || '00:00').split(':').map(Number)
    const current      = new Date(y, mo - 1, d, h, mi)
    const next         = new Date(current.getTime() + totalMs)
    const due_date     = format(next, 'yyyy-MM-dd')
    const due_time     = task.due_time ? format(next, 'HH:mm') : null

    set((s) => ({
      tasks: sortTasks(
        s.tasks.map((t) => t.id === id ? { ...t, due_date, due_time, status: 'in_progress' } : t),
        s.sortMode,
      ),
    }))
    await supabase.from('tasks').update({ due_date, due_time, status: 'in_progress' }).eq('id', id)
  },

  // ── Retreat (repeat task: move due date/time backward by repeat interval) ──
  retreatTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task || !task.is_repeat) return

    const totalMs =
      (task.repeat_days    || 0) * 86_400_000 +
      (task.repeat_hours   || 0) *  3_600_000 +
      (task.repeat_minutes || 0) *     60_000 +
      (task.repeat_seconds || 0) *      1_000

    const [y, mo, d]   = task.due_date.split('-').map(Number)
    const [h, mi]      = (task.due_time || '00:00').split(':').map(Number)
    const current      = new Date(y, mo - 1, d, h, mi)
    const prev         = new Date(current.getTime() - totalMs)
    const due_date     = format(prev, 'yyyy-MM-dd')
    const due_time     = task.due_time ? format(prev, 'HH:mm') : null

    set((s) => ({
      tasks: sortTasks(
        s.tasks.map((t) => t.id === id ? { ...t, due_date, due_time } : t),
        s.sortMode,
      ),
    }))
    await supabase.from('tasks').update({ due_date, due_time }).eq('id', id)
  },
}))


export default useTaskStore
