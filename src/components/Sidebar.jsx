import { NavLink, useNavigate } from 'react-router-dom'
import { CheckSquare, BookOpen, Settings, LogOut, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useTaskStore from '../store/taskStore'

const navItems = [
  { to: '/tasks', icon: CheckSquare, label: '일정 관리' },
  { to: '/ledger', icon: BookOpen, label: '가계부' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const clearTasks = useTaskStore((s) => s.tasks)

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="h-full bg-zinc-900 text-white flex flex-col select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <CheckSquare size={16} className="text-zinc-900" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">NoJam</h1>
            <p className="text-[10px] text-zinc-400 mt-0.5">Task Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-zinc-900'
                  : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-1 border-t border-zinc-700 space-y-1">
        {/* Settings Link */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-white text-zinc-900'
                : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={17} strokeWidth={isActive ? 2.5 : 1.8} />
              설정
            </>
          )}
        </NavLink>

        {/* User info + Logout */}
        <div className="flex items-center gap-2 px-3 py-2">
          <User size={14} className="text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-400 flex-1 truncate">{user?.username}</span>
          <button
            onClick={handleLogout}
            title="로그아웃"
            className="text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>

        <p className="text-[10px] text-zinc-500 px-3 pt-0.5">v0.1.0 · NoJam</p>
      </div>
    </div>
  )
}

