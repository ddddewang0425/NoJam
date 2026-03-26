import { BookOpen } from 'lucide-react'

export default function LedgerPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-16 lg:pb-0 text-gray-400">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <BookOpen size={28} strokeWidth={1.5} className="text-gray-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-500">가계부</h2>
          <p className="text-sm mt-1">업데이트 예정입니다</p>
          <p className="text-xs mt-0.5 text-gray-300">Coming Soon...</p>
        </div>
      </div>
    </div>
  )
}
