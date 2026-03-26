import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import useTaskStore from '../store/taskStore'
import { Analytics } from "@vercel/analytics/next"

export default function Layout() {
  const location = useLocation()
  const pageTransitionMs = useTaskStore((s) => s.pageTransitionMs)

  const transitionStyle = pageTransitionMs > 0
    ? { animation: `pageSlideIn ${pageTransitionMs}ms ease both` }
    : {}

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content — fills remaining space */}
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <div
          key={location.pathname}
          style={transitionStyle}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav — fixed, hidden on desktop */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50">
        <BottomNav />
      </nav>
    </div>
  )
}
