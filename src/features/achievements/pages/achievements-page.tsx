import {
  Award,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getITAreaConfig } from "@/config/it-area-config"
import { AchievementCard } from "@/features/achievements/components/achievement-card"
import { AchievementProgress } from "@/features/achievements/components/achievement-progress"
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_RARITY_LABELS,
} from "@/features/achievements/domain/achievement-catalog"
import { useAchievements } from "@/features/achievements/hooks/use-achievements"
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_RARITIES,
  type AchievementCategory,
  type AchievementRarity,
  type AchievementStatus,
  type ResolvedAchievement,
} from "@/features/achievements/types/achievement"
import { useAuth } from "@/features/auth"

const STATUS_LABELS: Record<AchievementStatus, string> = {
  unlocked: "Desbloqueadas",
  locked: "Bloqueadas",
  unavailable: "Em breve",
}

type StatusFilter = AchievementStatus | "all"
type CategoryFilter = AchievementCategory | "all"
type RarityFilter = AchievementRarity | "all"

function AchievementGrid({
  id,
  title,
  description,
  achievements,
}: {
  id: string
  title: string
  description: string
  achievements: ResolvedAchievement[]
}) {
  if (achievements.length === 0) return null

  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 id={id} className="text-lg font-semibold">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{achievements.length}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </section>
  )
}

export function AchievementsPage() {
  const { user, profile } = useAuth()
  const areaConfig = getITAreaConfig(profile?.primaryArea)
  const achievementState = useAchievements(
    user?.uid,
    profile?.streak ?? 0,
    profile?.primaryArea ?? null,
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all")

  const unlockedAchievements = achievementState.achievements.filter(
    (achievement) => achievement.status === "unlocked",
  )
  const availableAchievements = achievementState.achievements.filter(
    (achievement) => achievement.status !== "unavailable",
  )
  const earnedXp = unlockedAchievements.reduce(
    (total, achievement) => total + achievement.xpAwarded,
    0,
  )
  const overallPercentage =
    availableAchievements.length > 0
      ? (unlockedAchievements.length / availableAchievements.length) * 100
      : 0

  const filteredAchievements = useMemo(
    () =>
      achievementState.achievements.filter(
        (achievement) =>
          (statusFilter === "all" || achievement.status === statusFilter) &&
          (categoryFilter === "all" ||
            achievement.category === categoryFilter) &&
          (rarityFilter === "all" || achievement.rarity === rarityFilter),
      ),
    [achievementState.achievements, categoryFilter, rarityFilter, statusFilter],
  )

  const filteredUnlocked = filteredAchievements.filter(
    (achievement) => achievement.status === "unlocked",
  )
  const filteredLocked = filteredAchievements.filter(
    (achievement) => achievement.status !== "unlocked",
  )

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/80 via-card to-blue-950/70 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
            <Sparkles className="size-4" aria-hidden="true" />
            Sua jornada
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            {areaConfig.titles.achievements}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            {areaConfig.description} Acompanhe marcos gerais e operacionais,
            desbloqueie medalhas e transforme sua evolução em XP.
          </p>
        </div>
      </section>

      {achievementState.error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {achievementState.error}
        </div>
      )}

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo das conquistas"
      >
        {[
          {
            label: "Desbloqueadas",
            value: unlockedAchievements.length,
            icon: CheckCircle2,
            color: "text-violet-300",
          },
          {
            label: "Disponíveis",
            value: availableAchievements.length,
            icon: Award,
            color: "text-blue-300",
          },
          {
            label: "XP conquistado",
            value: earnedXp,
            icon: Zap,
            color: "text-amber-300",
          },
          {
            label: "Total no catálogo",
            value: achievementState.achievements.length,
            icon: Trophy,
            color: "text-purple-300",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
              <item.icon
                className={`size-6 ${item.color}`}
                aria-hidden="true"
              />
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden border-violet-400/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Progresso geral</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {unlockedAchievements.length} de {availableAchievements.length}{" "}
                conquistas disponíveis desbloqueadas
              </p>
            </div>
            <strong className="text-2xl text-violet-300">
              {Math.round(overallPercentage)}%
            </strong>
          </div>
          <AchievementProgress
            className="mt-4"
            value={unlockedAchievements.length}
            max={availableAchievements.length}
            label="Progresso geral das conquistas"
          />
        </CardContent>
      </Card>

      <section
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Filtros de conquistas"
      >
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Categoria
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as CategoryFilter)
            }
            className="block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">Todas as categorias</option>
            {ACHIEVEMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {ACHIEVEMENT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Raridade
          <select
            value={rarityFilter}
            onChange={(event) =>
              setRarityFilter(event.target.value as RarityFilter)
            }
            className="block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">Todas as raridades</option>
            {ACHIEVEMENT_RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {ACHIEVEMENT_RARITY_LABELS[rarity]}
              </option>
            ))}
          </select>
        </label>
      </section>

      {achievementState.isLoading ? (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" aria-hidden="true" />
            Carregando conquistas...
          </CardContent>
        </Card>
      ) : filteredAchievements.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <LockKeyhole
              className="size-11 text-violet-300/70"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Nenhuma conquista encontrada</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Ajuste os filtros para visualizar outros marcos da sua jornada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <AchievementGrid
            id="achievements-unlocked"
            title="Desbloqueadas"
            description="Marcos que já fazem parte da sua jornada."
            achievements={filteredUnlocked}
          />
          <AchievementGrid
            id="achievements-locked"
            title="Bloqueadas e futuras"
            description="Continue evoluindo e acompanhe as próximas fontes de progresso."
            achievements={filteredLocked}
          />
        </div>
      )}
    </div>
  )
}
