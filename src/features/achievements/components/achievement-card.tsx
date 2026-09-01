import {
  CalendarCheck,
  Check,
  Clock,
  Crown,
  Flag,
  Flame,
  FolderCheck,
  Folders,
  Hourglass,
  ListChecks,
  LockKeyhole,
  Medal,
  Shield,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AchievementProgress } from "@/features/achievements/components/achievement-progress"
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_RARITY_LABELS,
} from "@/features/achievements/domain/achievement-catalog"
import type {
  AchievementIconName,
  AchievementRarity,
  ResolvedAchievement,
} from "@/features/achievements/types/achievement"

interface AchievementCardProps {
  achievement: ResolvedAchievement
}

const ICONS: Record<AchievementIconName, LucideIcon> = {
  flag: Flag,
  "list-checks": ListChecks,
  medal: Medal,
  crown: Crown,
  timer: Timer,
  clock: Clock,
  hourglass: Hourglass,
  flame: Flame,
  shield: Shield,
  "calendar-check": CalendarCheck,
  "folder-check": FolderCheck,
  folders: Folders,
}

const RARITY_STYLES: Record<AchievementRarity, string> = {
  common: "border-blue-400/30 bg-blue-500/8 text-blue-300",
  uncommon: "border-blue-400/45 bg-blue-500/12 text-blue-200",
  rare: "border-violet-400/45 bg-violet-500/12 text-violet-200",
  epic: "border-purple-400/50 bg-purple-500/15 text-purple-200",
  legendary: "border-amber-400/55 bg-amber-500/15 text-amber-200",
}

const CARD_ACCENTS: Record<AchievementRarity, string> = {
  common: "from-blue-500/12",
  uncommon: "from-blue-500/16",
  rare: "from-violet-500/16",
  epic: "from-purple-500/20",
  legendary: "from-amber-500/20",
}

const STATUS_LABELS = {
  unlocked: "Desbloqueada",
  locked: "Bloqueada",
  unavailable: "Em breve",
} as const

function formatUnlockDate(achievement: ResolvedAchievement) {
  if (!achievement.unlockedAt) return null
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(achievement.unlockedAt.toDate())
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const Icon = ICONS[achievement.icon]
  const isUnlocked = achievement.status === "unlocked"
  const isUnavailable = achievement.status === "unavailable"
  const unlockDate = formatUnlockDate(achievement)

  return (
    <Card
      className={`relative h-full overflow-hidden border transition-colors ${
        isUnlocked
          ? "border-primary/35"
          : isUnavailable
            ? "border-border/60 opacity-75"
            : "border-border"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${CARD_ACCENTS[achievement.rarity]} via-transparent to-blue-500/5`}
      />
      <CardContent className="relative flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border ${RARITY_STYLES[achievement.rarity]}`}
          >
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge
              variant="outline"
              className={RARITY_STYLES[achievement.rarity]}
            >
              {ACHIEVEMENT_RARITY_LABELS[achievement.rarity]}
            </Badge>
            <Badge variant={isUnlocked ? "success" : "secondary"}>
              {isUnlocked ? (
                <Check className="mr-1 size-3" aria-hidden="true" />
              ) : (
                <LockKeyhole className="mr-1 size-3" aria-hidden="true" />
              )}
              {STATUS_LABELS[achievement.status]}
            </Badge>
          </div>
        </div>

        <div className="mt-5 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {ACHIEVEMENT_CATEGORY_LABELS[achievement.category]}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {achievement.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {achievement.description}
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-border/70 bg-background/45 p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              {achievement.condition.label}
            </span>
            <span className="font-semibold text-foreground">
              {Math.min(achievement.progress, achievement.condition.target)}/
              {achievement.condition.target}
            </span>
          </div>
          <AchievementProgress
            className="mt-2"
            value={achievement.progress}
            max={achievement.condition.target}
            label={`Progresso de ${achievement.name}`}
          />
          {isUnavailable && (
            <p className="mt-2 text-xs text-muted-foreground">
              A fonte deste progresso ainda não está disponível.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
            <Zap className="size-4" aria-hidden="true" />
            {achievement.xp} XP
          </span>
          {unlockDate && (
            <span className="text-right text-xs text-muted-foreground">
              Desbloqueada em {unlockDate}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
