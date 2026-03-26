import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    const ok = await login(username, password)
    if (ok) navigate('/tasks', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <img src="/icons/icon.svg" alt="NoJam" className="w-8 h-8" />
        <span className="text-white font-bold text-xl tracking-tight">NoJam</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
        <h2 className="text-white font-bold text-2xl mb-1">로그인</h2>
        <p className="text-zinc-500 text-sm mb-7">계정에 접속합니다</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { clearError(); setUsername(e.target.value) }}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { clearError(); setPassword(e.target.value) }}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-zinc-900 font-semibold rounded-lg text-sm hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-zinc-500 text-sm">
        계정이 없으신가요?{' '}
        <Link to="/register" className="text-zinc-300 hover:text-white font-medium transition-colors">
          회원가입
        </Link>
      </p>
    </div>
  )
}
