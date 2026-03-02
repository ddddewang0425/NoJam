import { create } from 'zustand'
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

  setPriorityStep:     (v) => { setLS('priority-step',      v); set({ priorityStep:     v }) },
  setPageTransitionMs: (v) => { setLS('page-transition-ms', v); set({ pageTransitionMs: v }) },
  setTaskAnimMs:       (v) => { setLS('task-anim-ms',        v); set({ taskAnimMs:       v }) },

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
  addTask: async ({ title, due_date, due_time }) => {
    const user = useAuthStore.getState().user
    if (!user) return null
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title, due_date, due_time: due_time || null, status: 'in_progress', archived: false, priority: 3.0, user_id: user.id }])
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
}))

export default useTaskStore
