interface AchievementProgressProps {
  value: number
  max: number
  label?: string
  className?: string
}

export function AchievementProgress({
  value,
  max,
  label = "Progresso da conquista",
  className = "",
}: AchievementProgressProps) {
  const safeMax = Math.max(1, max)
  const safeValue = Math.min(safeMax, Math.max(0, value))
  const percentage = (safeValue / safeMax) * 100

  return (
    <div className={className}>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={`${Math.round(percentage)}% concluído`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
