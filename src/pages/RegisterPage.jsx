import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error, clearError } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!username.trim() || !password || !confirm) return

    if (username.trim().length < 2) {
      setLocalError('아이디는 2자 이상이어야 합니다.')
      return
    }
    if (password.length < 4) {
      setLocalError('비밀번호는 4자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      setLocalError('비밀번호가 일치하지 않습니다.')
      return
    }

    const ok = await register(username, password)
    if (ok) navigate('/tasks', { replace: true })
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <img src="/icons/icon.svg" alt="Dayjee" className="w-8 h-8" />
        <span className="text-white font-bold text-xl tracking-tight">Dayjee</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
        <h2 className="text-white font-bold text-2xl mb-1">회원가입</h2>
        <p className="text-zinc-500 text-sm mb-7">새 계정을 만듭니다</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { clearError(); setLocalError(''); setUsername(e.target.value) }}
              placeholder="사용할 아이디"
              autoComplete="username"
              className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { clearError(); setLocalError(''); setPassword(e.target.value) }}
              placeholder="비밀번호 (4자 이상)"
              autoComplete="new-password"
              className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { clearError(); setLocalError(''); setConfirm(e.target.value) }}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
            />
          </div>

          {displayError && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {displayError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-zinc-900 font-semibold rounded-lg text-sm hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-zinc-500 text-sm">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-zinc-300 hover:text-white font-medium transition-colors">
          로그인
        </Link>
      </p>
    </div>
  )
}
