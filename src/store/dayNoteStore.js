import { create } from 'zustand'
import { supabase } from '../supabase'

const useDayNoteStore = create((set, get) => ({
  notes: {},    // { [day_of_week]: content string }
  loading: false,

  fetchNotes: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('day_notes')
      .select('day_of_week, content')
    const notes = {}
    for (const row of data ?? []) notes[row.day_of_week] = row.content
    set({ notes, loading: false })
  },

  upsertNote: async (dow, content) => {
    // Optimistic update
    set((s) => ({ notes: { ...s.notes, [dow]: content } }))
    await supabase
      .from('day_notes')
      .upsert({ day_of_week: dow, content, updated_at: new Date().toISOString() },
               { onConflict: 'day_of_week' })
  },
}))

export default useDayNoteStore
