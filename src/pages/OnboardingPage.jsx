import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { useEffect } from 'react'

// Detect if running inside Capacitor (native app wrapping)
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

export default function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) navigate('/tasks', { replace: true })
  }, [user, navigate])

  if (isNative) return <NativeOnboarding navigate={navigate} />
  return <WebOnboarding navigate={navigate} />
}

/* ─── 네이티브 앱 온보딩 ─────────────────────────────────────────── */
function NativeOnboarding({ navigate }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 px-8">
      <div className="flex flex-col items-center gap-5 flex-1 justify-center">
        <img
          src="/icons/icon.svg"
          alt="NoJam"
          className="w-24 h-24 drop-shadow-[0_0_24px_rgba(161,161,170,0.4)]"
        />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">NoJam</h1>
          <p className="text-zinc-400 text-sm mt-1">나만의 일정 관리</p>
        </div>
      </div>

      <div className="w-full pb-16 flex flex-col gap-3">
        <button
          onClick={() => navigate('/register')}
          className="w-full py-4 rounded-2xl bg-white text-zinc-900 font-semibold text-base active:scale-95 transition-transform"
        >
          회원가입
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-4 rounded-2xl border border-zinc-700 text-white font-semibold text-base active:scale-95 transition-transform"
        >
          로그인
        </button>
      </div>
    </div>
  )
}

/* ─── 웹 온보딩 (Supabase 스타일) ───────────────────────────────── */
function WebOnboarding({ navigate }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="NoJam" className="w-7 h-7" />
          <span className="text-white font-semibold text-lg tracking-tight">NoJam</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-zinc-300 hover:text-white text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-zinc-800"
          >
            로그인
          </button>
          <button
            onClick={() => navigate('/register')}
            className="bg-white text-zinc-900 text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-zinc-100 transition-colors"
          >
            회원가입
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        {/* background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/60 text-zinc-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            일정 관리의 새로운 방법
          </div>

          <div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
              막힘 없는<br />
              <span className="bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                나만의 플로우
              </span>
            </h1>
            <p className="mt-5 text-zinc-400 text-lg leading-relaxed">
              NoJam으로 할 일을 정리하고,<br className="hidden sm:block" />
              데드라인을 놓치지 마세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-100 transition-colors text-sm shadow-lg shadow-black/20"
            >
              무료로 시작하기
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 border border-zinc-700 text-zinc-300 font-semibold rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors text-sm"
            >
              로그인
            </button>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px border-t border-zinc-800/60 bg-zinc-800/30">
        {[
          { icon: '📋', title: '스마트 할 일 관리', desc: '리스트·캘린더 뷰로 한눈에' },
          { icon: '⏱', title: 'D-Day 카운트다운', desc: '초 단위까지 실시간 추적' },
          { icon: '📱', title: 'PWA + 네이티브 앱', desc: '어디서나 동일한 경험' },
        ].map((f) => (
          <div key={f.title} className="bg-zinc-950 px-8 py-8">
            <div className="text-2xl mb-3">{f.icon}</div>
            <div className="text-white font-semibold text-sm mb-1">{f.title}</div>
            <div className="text-zinc-500 text-xs">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-zinc-800/60 text-center text-zinc-600 text-xs">
        © 2025 NoJam. All rights reserved.
      </div>
    </div>
  )
}
