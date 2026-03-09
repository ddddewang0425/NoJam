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


  // ── Update Credentials ────────────────────────────────────────────────────
  updateCredentials: async (currentPassword, newUsername, newPassword) => {
    set({ loading: true, error: null })
    try {
      const user = loadSession()
      if (!user) {
        set({ loading: false, error: '로그인이 필요합니다.' })
        return false
      }

      // 1. Check current password
      const { data: dbUser, error: authError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single()

      if (authError || !dbUser) {
        set({ loading: false, error: '사용자 정보를 확인할 수 없습니다.' })
        return false
      }

      const match = await bcrypt.compare(currentPassword, dbUser.password_hash)
      if (!match) {
        set({ loading: false, error: '현재 비밀번호가 올바르지 않습니다.' })
        return false
      }

      const updates = {}
      
      // 2. Process username update
      if (newUsername && newUsername.trim() !== user.username) {
        const _newUsername = newUsername.trim()
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', _newUsername)
          .maybeSingle()
          
        if (existing) {
          set({ loading: false, error: '이미 사용 중인 아이디입니다.' })
          return false
        }
        updates.username = _newUsername
      }

      // 3. Process password update
      if (newPassword) {
        updates.password_hash = await bcrypt.hash(newPassword, 10)
      }

      if (Object.keys(updates).length === 0) {
        set({ loading: false, error: '변경할 내용이 없습니다.' })
        return false
      }

      // 4. Update DB
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (updateError) throw updateError

      // 5. Update local session if username changed
      if (updates.username) {
        const updatedUser = { ...user, username: updates.username }
        saveSession(updatedUser)
        set({ user: updatedUser })
      }

      set({ loading: false, error: null })
      return true

    } catch (err) {
      set({ loading: false, error: err.message })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
