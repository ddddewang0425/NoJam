import { create } from 'zustand'
import { supabase } from '../supabase'
import useAuthStore from './authStore'
import useTaskStore from './taskStore'

const useTimetableStore = create((set, get) => ({
  entries: [],
  loading: false,
  error: null,

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchEntries: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time')
      if (error) throw error
      set({ entries: data ?? [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // ── Add (called with an array of day_of_week values for multi-day support) ─
  addEntry: async ({ title, subtitle, days, start_time, end_time, color, taskIds }) => {
    // days = array of day_of_week ints, taskIds = parallel array (null if no link)
    const user = useAuthStore.getState().user
    if (!user) return

    const rows = days.map((dow, i) => ({
      user_id:     user.id,
      title,
      subtitle:    subtitle || null,
      day_of_week: dow,
      start_time,
      end_time,
      color,
      task_id:     taskIds?.[i] ?? null,
    }))

    try {
      const { data, error } = await supabase
        .from('timetable_entries')
        .insert(rows)
        .select()
      if (error) throw error
      set((s) => ({ entries: [...s.entries, ...(data ?? [])] }))
      return data
    } catch (err) {
      set({ error: err.message })
      return null
    }
  },

  // ── Delete (also deletes linked task, which cascades to this entry) ────────
  deleteEntry: async (id) => {
    const entry = get().entries.find((e) => e.id === id)
    if (!entry) return

    // Optimistic remove
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))

    if (entry.task_id) {
      // Deleting the task will CASCADE-delete this entry in the DB
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', entry.task_id)
      if (error) {
        // Restore on failure
        set((s) => ({ entries: [...s.entries, entry], error: error.message }))
        return
      }
      // Also remove from taskStore state
      useTaskStore.setState((s) => ({
        tasks: s.tasks.filter((t) => t.id !== entry.task_id),
      }))
    } else {
      // No linked task — delete the entry directly
      const { error } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('id', id)
      if (error) {
        set((s) => ({ entries: [...s.entries, entry], error: error.message }))
      }
    }
  },

  // ── Update color / title ───────────────────────────────────────────────────
  updateEntry: async (id, patch) => {
    set((s) => ({
      entries: s.entries.map((e) => e.id === id ? { ...e, ...patch } : e),
    }))
    const { error } = await supabase
      .from('timetable_entries')
      .update(patch)
      .eq('id', id)
    if (error) {
      get().fetchEntries()
      set({ error: error.message })
    }
  },
}))

export default useTimetableStore
