import { NavLink } from 'react-router-dom'
import { CheckSquare, BookOpen, Settings } from 'lucide-react'

const navItems = [
  { to: '/tasks', icon: CheckSquare, label: '일정' },
  { to: '/ledger', icon: BookOpen, label: '가계부' },
  { to: '/settings', icon: Settings, label: '설정' },
]

export default function BottomNav() {
  return (
    <div className="bg-white border-t border-gray-200 flex safe-area-pb">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-zinc-900' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="mt-0.5">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}
