import useTaskStore from '../store/taskStore'

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

  const fmtAnim = (v) => v === 0 ? '0.0x' : `${(v / 300).toFixed(1)}x`

  return (
    <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">
        <h2 className="text-xl font-bold text-gray-900">설정</h2>

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
