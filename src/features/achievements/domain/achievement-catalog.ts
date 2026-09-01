import { IT_AREA_CONFIG, IT_AREA_IDS } from "@/config/it-area-config"
import type {
  AchievementAreaStatsDocument,
  AchievementCategory,
  AchievementDefinition,
  AchievementId,
  AchievementMetric,
  AchievementRarity,
  AchievementStatsDocument,
} from "@/features/achievements/types/achievement"

export const GENERAL_ACHIEVEMENT_DEFINITION_VERSION = 1 as const
export const AREA_ACHIEVEMENT_DEFINITION_VERSION = 2 as const
export const ACHIEVEMENT_DEFINITION_VERSION =
  GENERAL_ACHIEVEMENT_DEFINITION_VERSION

const GENERAL_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first-mission",
    name: "Primeira Missão",
    description: "Conclua sua primeira tarefa.",
    icon: "flag",
    category: "tasks",
    xp: 25,
    condition: {
      metric: "tasksCompleted",
      target: 1,
      label: "1 tarefa concluída",
    },
    area: "general",
    rarity: "common",
    sourceAvailable: true,
  },
  {
    id: "tasks-10",
    name: "10 tarefas concluídas",
    description: "Transforme planejamento em dez entregas concluídas.",
    icon: "list-checks",
    category: "tasks",
    xp: 50,
    condition: {
      metric: "tasksCompleted",
      target: 10,
      label: "10 tarefas concluídas",
    },
    area: "general",
    rarity: "uncommon",
    sourceAvailable: true,
  },
  {
    id: "tasks-50",
    name: "50 tarefas concluídas",
    description: "Alcance cinquenta tarefas concluídas ao longo da jornada.",
    icon: "medal",
    category: "tasks",
    xp: 150,
    condition: {
      metric: "tasksCompleted",
      target: 50,
      label: "50 tarefas concluídas",
    },
    area: "general",
    rarity: "rare",
    sourceAvailable: true,
  },
  {
    id: "tasks-100",
    name: "100 tarefas concluídas",
    description: "Complete cem tarefas e consolide uma rotina de execução.",
    icon: "crown",
    category: "tasks",
    xp: 300,
    condition: {
      metric: "tasksCompleted",
      target: 100,
      label: "100 tarefas concluídas",
    },
    area: "general",
    rarity: "epic",
    sourceAvailable: true,
  },
  {
    id: "first-pomodoro",
    name: "Primeiro Pomodoro",
    description: "Conclua sua primeira sessão de foco Pomodoro.",
    icon: "timer",
    category: "focus",
    xp: 25,
    condition: {
      metric: "pomodorosCompleted",
      target: 1,
      label: "1 Pomodoro concluído",
    },
    area: "general",
    rarity: "common",
    sourceAvailable: true,
  },
  {
    id: "pomodoros-10",
    name: "10 Pomodoros",
    description: "Complete dez sessões de foco sem interrupções.",
    icon: "clock",
    category: "focus",
    xp: 50,
    condition: {
      metric: "pomodorosCompleted",
      target: 10,
      label: "10 Pomodoros concluídos",
    },
    area: "general",
    rarity: "uncommon",
    sourceAvailable: true,
  },
  {
    id: "pomodoros-50",
    name: "50 Pomodoros",
    description: "Acumule cinquenta sessões de trabalho focado.",
    icon: "hourglass",
    category: "focus",
    xp: 150,
    condition: {
      metric: "pomodorosCompleted",
      target: 50,
      label: "50 Pomodoros concluídos",
    },
    area: "general",
    rarity: "rare",
    sourceAvailable: true,
  },
  {
    id: "streak-3",
    name: "3 dias de streak",
    description: "Comece uma sequência de produtividade por três dias.",
    icon: "flame",
    category: "consistency",
    xp: 50,
    condition: {
      metric: "bestStreak",
      target: 3,
      label: "3 dias consecutivos",
    },
    area: "general",
    rarity: "common",
    sourceAvailable: true,
  },
  {
    id: "streak-7",
    name: "7 dias de streak",
    description: "Mantenha uma sequência de produtividade por sete dias.",
    icon: "flame",
    category: "consistency",
    xp: 100,
    condition: {
      metric: "bestStreak",
      target: 7,
      label: "7 dias consecutivos",
    },
    area: "general",
    rarity: "rare",
    sourceAvailable: true,
  },
  {
    id: "streak-14",
    name: "14 dias de streak",
    description: "Sustente duas semanas de metas diárias concluídas.",
    icon: "flame",
    category: "consistency",
    xp: 200,
    condition: {
      metric: "bestStreak",
      target: 14,
      label: "14 dias consecutivos",
    },
    area: "general",
    rarity: "rare",
    sourceAvailable: true,
  },
  {
    id: "streak-30",
    name: "30 dias de streak",
    description: "Construa uma sequência extraordinária de trinta dias.",
    icon: "shield",
    category: "consistency",
    xp: 400,
    condition: {
      metric: "bestStreak",
      target: 30,
      label: "30 dias consecutivos",
    },
    area: "general",
    rarity: "legendary",
    sourceAvailable: true,
  },
  {
    id: "streak-60",
    name: "60 dias de streak",
    description: "Mantenha sessenta dias de consistência.",
    icon: "shield",
    category: "consistency",
    xp: 500,
    condition: {
      metric: "bestStreak",
      target: 60,
      label: "60 dias consecutivos",
    },
    area: "general",
    rarity: "legendary",
    sourceAvailable: true,
  },
  {
    id: "streak-100",
    name: "100 dias de streak",
    description: "Alcance cem dias de metas diárias concluídas.",
    icon: "shield",
    category: "consistency",
    xp: 750,
    condition: {
      metric: "bestStreak",
      target: 100,
      label: "100 dias consecutivos",
    },
    area: "general",
    rarity: "legendary",
    sourceAvailable: true,
  },
  {
    id: "streak-365",
    name: "365 dias de streak",
    description: "Complete um ano inteiro de consistência.",
    icon: "crown",
    category: "consistency",
    xp: 1000,
    condition: {
      metric: "bestStreak",
      target: 365,
      label: "365 dias consecutivos",
    },
    area: "general",
    rarity: "legendary",
    sourceAvailable: true,
  },
  {
    id: "perfect-week",
    name: "Semana Perfeita",
    description: "Atinja sua meta diária durante todos os dias da semana.",
    icon: "calendar-check",
    category: "consistency",
    xp: 200,
    condition: {
      metric: "perfectWeeks",
      target: 1,
      label: "1 semana perfeita",
    },
    area: "general",
    rarity: "epic",
    sourceAvailable: false,
  },
  {
    id: "first-project",
    name: "Primeiro projeto concluído",
    description: "Leve seu primeiro projeto do planejamento à conclusão.",
    icon: "folder-check",
    category: "projects",
    xp: 75,
    condition: {
      metric: "projectsCompleted",
      target: 1,
      label: "1 projeto concluído",
    },
    area: "general",
    rarity: "uncommon",
    sourceAvailable: true,
  },
  {
    id: "projects-10",
    name: "10 projetos concluídos",
    description: "Conclua dez projetos e amplie seu histórico de entregas.",
    icon: "folders",
    category: "projects",
    xp: 300,
    condition: {
      metric: "projectsCompleted",
      target: 10,
      label: "10 projetos concluídos",
    },
    area: "general",
    rarity: "epic",
    sourceAvailable: true,
  },
] as const satisfies readonly Omit<AchievementDefinition, "definitionVersion">[]

export const GENERAL_ACHIEVEMENT_CATALOG = GENERAL_ACHIEVEMENT_DEFINITIONS.map(
  (achievement) => ({
    ...achievement,
    definitionVersion: GENERAL_ACHIEVEMENT_DEFINITION_VERSION,
  }),
) satisfies readonly AchievementDefinition[]

export const AREA_ACHIEVEMENT_CATALOG = IT_AREA_IDS.map((areaId) => {
  const area = IT_AREA_CONFIG[areaId]
  return {
    id: area.achievement.id,
    name: area.achievement.name,
    description: area.achievement.description,
    icon: area.icon,
    category: "tasks",
    xp: area.achievement.rewardXp,
    condition: {
      metric: area.achievement.metric,
      target: area.achievement.target,
      label: `${area.achievement.target} tarefas concluídas em ${area.name}`,
    },
    area: areaId,
    rarity: "rare",
    sourceAvailable: true,
    definitionVersion: AREA_ACHIEVEMENT_DEFINITION_VERSION,
  } as const
}) satisfies readonly AchievementDefinition[]

export const ACHIEVEMENT_CATALOG = [
  ...GENERAL_ACHIEVEMENT_CATALOG,
  ...AREA_ACHIEVEMENT_CATALOG,
] satisfies readonly AchievementDefinition[]

export const ACHIEVEMENT_IDS = ACHIEVEMENT_CATALOG.map(
  (achievement) => achievement.id,
)

export const AREA_ACHIEVEMENT_IDS = AREA_ACHIEVEMENT_CATALOG.map(
  (achievement) => achievement.id,
)

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> =
  {
    tasks: "Tarefas",
    focus: "Foco",
    consistency: "Consistência",
    projects: "Projetos",
  }

export const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
}

export const EMPTY_ACHIEVEMENT_STATS = {
  tasksCompleted: 0,
  pomodorosCompleted: 0,
  bestStreak: 0,
  perfectWeeks: 0,
  projectsCompleted: 0,
  lastEvidenceId: null,
} as const

export function getAchievementDefinition(id: AchievementId) {
  return ACHIEVEMENT_CATALOG.find((achievement) => achievement.id === id)
}

export function getAchievementsForMetric(
  metric: AchievementMetric,
  area?: AchievementDefinition["area"],
) {
  return ACHIEVEMENT_CATALOG.filter(
    (achievement) =>
      achievement.condition.metric === metric &&
      (area === undefined || achievement.area === area),
  )
}

export function getAchievementProgressValue(
  stats:
    | Pick<
        AchievementStatsDocument,
        | "tasksCompleted"
        | "pomodorosCompleted"
        | "bestStreak"
        | "perfectWeeks"
        | "projectsCompleted"
      >
    | Pick<AchievementAreaStatsDocument, "areaId" | "tasksCompleted">,
  metric: AchievementMetric,
) {
  if (metric === "areaTasksCompleted") {
    return "areaId" in stats ? stats.tasksCompleted : 0
  }
  if ("areaId" in stats) return 0
  return stats[metric]
}
