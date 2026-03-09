import { useState } from 'react'
import useTaskStore from '../store/taskStore'
import useAuthStore from '../store/authStore'

const PRIORITY_STEPS = [0.1, 0.25, 0.5, 1.0]

function SliderRow({ label, desc, value, min, max, step, onChange, formatVal }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
        </div>
        <span className="text-sm font-bold text-zinc-900 ml-4 w-12 text-right flex-shrink-0">
          {formatVal(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-zinc-900"
      />
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-300">{formatVal(min)}</span>
        <span className="text-[10px] text-gray-300">{formatVal(max)}</span>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const priorityStep       = useTaskStore((s) => s.priorityStep)
  const pageTransitionMs   = useTaskStore((s) => s.pageTransitionMs)
  const taskAnimMs         = useTaskStore((s) => s.taskAnimMs)
  const setPriorityStep    = useTaskStore((s) => s.setPriorityStep)
  const setPageTransitionMs = useTaskStore((s) => s.setPageTransitionMs)
  const setTaskAnimMs      = useTaskStore((s) => s.setTaskAnimMs)

  const { user, updateCredentials, logout } = useAuthStore()

  // Account Settings state
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountError, setAccountError] = useState(null)
  const [accountSuccess, setAccountSuccess] = useState(false)

  const handleUpdateAccount = async (e) => {
    e.preventDefault()
    setAccountError(null)
    setAccountSuccess(false)
    
    if (!currentPassword) {
      setAccountError('현재 비밀번호를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    const success = await updateCredentials(
      currentPassword, 
      newUsername || null, 
      newPassword || null
    )
    setIsSubmitting(false)

    if (success) {
      setAccountSuccess(true)
      setIsEditingAccount(false)
      setCurrentPassword('')
      setNewUsername('')
      setNewPassword('')
      setTimeout(() => setAccountSuccess(false), 3000)
    } else {
      setAccountError(useAuthStore.getState().error)
    }
  }

  const fmtAnim = (v) => v === 0 ? '0.0x' : `${(v / 300).toFixed(1)}x`

  return (
    <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">
        <h2 className="text-xl font-bold text-gray-900">설정</h2>

        {/* ── 계정 설정 ──────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            계정 관리
          </h3>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
            {!isEditingAccount ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">로그인 계정</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user?.username}</p>
                  </div>
                  <button
                    onClick={() => setIsEditingAccount(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    정보 변경
                  </button>
                </div>
                {accountSuccess && (
                  <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                    계정 정보가 성공적으로 변경되었습니다.
                  </p>
                )}
                <div className="border-t border-gray-50 pt-3 flex justify-end">
                   <button
                    onClick={logout}
                    className="text-xs text-red-500 font-medium hover:text-red-600 px-2 py-1"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    현재 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setAccountError(null); setCurrentPassword(e.target.value) }}
                    placeholder="본인 확인용"
                    className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                  />
                </div>
                <div className="border-t border-gray-50" />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">새 아이디 (선택)</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => { setAccountError(null); setNewUsername(e.target.value) }}
                    placeholder={`현재: ${user?.username}`}
                    className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">새 비밀번호 (선택)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setAccountError(null); setNewPassword(e.target.value) }}
                    placeholder="변경을 원할 경우 입력"
                    className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                  />
                </div>

                {accountError && (
                  <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                    {accountError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAccount(false)
                      setAccountError(null)
                      setCurrentPassword('')
                      setNewUsername('')
                      setNewPassword('')
                    }}
                    className="flex-1 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!currentPassword)}
                    className="flex-1 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── 중요도 슬라이더 ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            중요도 슬라이더
          </h3>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">슬라이더 간격</p>
              <p className="text-xs text-gray-400 mt-0.5">
                우클릭 중요도 슬라이더의 최소 이동 단위
              </p>
            </div>
            <div className="flex gap-2">
              {PRIORITY_STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => setPriorityStep(step)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    priorityStep === step
                      ? 'bg-zinc-900 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 애니메이션 ──────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            애니메이션
          </h3>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-6">
            <SliderRow
              label="화면 전환 속도"
              desc="페이지 이동 시 애니메이션 지속 시간 · 0.0x = 없음"
              value={pageTransitionMs}
              min={0}
              max={800}
              step={50}
              onChange={setPageTransitionMs}
              formatVal={fmtAnim}
            />

            <div className="border-t border-gray-50" />

            <SliderRow
              label="일정 전환 속도"
              desc="필터·정렬 변경 시 일정 목록 애니메이션 · 0.0x = 없음"
              value={taskAnimMs}
              min={0}
              max={800}
              step={50}
              onChange={setTaskAnimMs}
              formatVal={fmtAnim}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
