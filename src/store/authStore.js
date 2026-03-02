import { create } from 'zustand'
import bcrypt from 'bcryptjs'
import { supabase } from '../supabase'

const SESSION_KEY = 'nojam_user'

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveSession = (user) => {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else localStorage.removeItem(SESSION_KEY)
}

const useAuthStore = create((set) => ({
  user: loadSession(), // { id, username }
  loading: false,
  error: null,

  // ── Login ─────────────────────────────────────────────────────────────────
  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, password_hash')
        .eq('username', username.trim())
        .single()

      if (error || !data) {
        set({ loading: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
        return false
      }

      const match = await bcrypt.compare(password, data.password_hash)
      if (!match) {
        set({ loading: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
        return false
      }

      const user = { id: data.id, username: data.username }
      saveSession(user)
      set({ user, loading: false, error: null })
      return true
    } catch (err) {
      set({ loading: false, error: err.message })
      return false
    }
  },

  // ── Register ──────────────────────────────────────────────────────────────
  register: async (username, password) => {
    set({ loading: true, error: null })
    try {
      // Check duplicate
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle()

      if (existing) {
        set({ loading: false, error: '이미 사용 중인 아이디입니다.' })
        return false
      }

      const password_hash = await bcrypt.hash(password, 10)

      const { data, error } = await supabase
        .from('users')
        .insert([{ username: username.trim(), password_hash }])
        .select('id, username')
        .single()

      if (error) throw error

      const user = { id: data.id, username: data.username }
      saveSession(user)
      set({ user, loading: false, error: null })
      return true
    } catch (err) {
      set({ loading: false, error: err.message })
      return false
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout: () => {
    saveSession(null)
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
