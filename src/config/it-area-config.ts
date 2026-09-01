export const IT_AREA_IDS = [
  "information-security",
  "software-development",
  "infrastructure",
  "support",
  "devops-sre",
  "data-analytics",
  "cloud",
  "qa-testing",
  "it-project-management",
  "networks",
  "database",
  "other",
] as const

export type ITAreaId = (typeof IT_AREA_IDS)[number]

export const IT_AREA_ICON_NAMES = [
  "shield-check",
  "code-2",
  "server",
  "headphones",
  "git-branch",
  "chart-bar",
  "cloud",
  "bug",
  "clipboard-list",
  "network",
  "database",
  "circle-ellipsis",
] as const

export type ITAreaIconName = (typeof IT_AREA_ICON_NAMES)[number]

export type ITAreaGoalCadence = "daily" | "weekly" | "monthly"

export type ITAreaGoalMetric =
  "tasksCompleted" | "xpEarned" | "pomodorosCompleted" | "focusedSeconds"

export type ITAreaTaskPriority = "low" | "medium" | "high" | "critical"

export type ITAreaStatKey =
  | "areaTasksCompleted"
  | "areaTasksPending"
  | "areaTasksTotal"
  | "areaCompletionRate"

export interface ITAreaAchievement {
  id: `area-${ITAreaId}-specialist`
  name: string
  description: string
  metric: "areaTasksCompleted"
  target: 5
  rewardXp: 75
}

export interface ITAreaSuggestedGoal {
  cadence: ITAreaGoalCadence
  metric: ITAreaGoalMetric
  target: number
  label: string
  description: string
}

export interface ITAreaTitles {
  dashboard: string
  tasks: string
  goals: string
  achievements: string
  workspace: string
}

export interface ITAreaTaskTemplate {
  id: string
  label: string
  title: string
  description: string
  category: string
  priority: ITAreaTaskPriority
  tags: readonly string[]
  estimateMinutes: number
}

export interface ITAreaStat {
  key: ITAreaStatKey
  label: string
  description: string
}

export interface ITAreaConfig {
  name: string
  icon: ITAreaIconName
  description: string
  categories: readonly string[]
  achievement: ITAreaAchievement
  goals: readonly [
    ITAreaSuggestedGoal,
    ITAreaSuggestedGoal,
    ITAreaSuggestedGoal,
  ]
  titles: ITAreaTitles
  taskTemplates: readonly ITAreaTaskTemplate[]
  stats: readonly [ITAreaStat, ITAreaStat, ITAreaStat, ITAreaStat]
}

const AREA_STATS = [
  {
    key: "areaTasksCompleted",
    label: "Tarefas concluídas",
    description: "Quantidade de tarefas concluídas nesta área.",
  },
  {
    key: "areaTasksPending",
    label: "Tarefas pendentes",
    description: "Quantidade de tarefas ainda pendentes nesta área.",
  },
  {
    key: "areaTasksTotal",
    label: "Total de tarefas",
    description: "Quantidade total de tarefas registradas nesta área.",
  },
  {
    key: "areaCompletionRate",
    label: "Taxa de conclusão",
    description: "Percentual de tarefas concluídas nesta área.",
  },
] as const satisfies readonly [ITAreaStat, ITAreaStat, ITAreaStat, ITAreaStat]

export const IT_AREA_CONFIG = {
  "information-security": {
    name: "Segurança da Informação",
    icon: "shield-check",
    description:
      "Proteja dados, identidades e sistemas com prevenção, detecção e resposta a riscos.",
    categories: [
      "SOC",
      "Vulnerabilidades",
      "Incidentes",
      "GRC",
      "IAM",
      "SIEM",
      "Compliance",
      "Threat Intelligence",
      "Cloud Security",
      "Monitoramento",
    ],
    achievement: {
      id: "area-information-security-specialist",
      name: "Especialista em Segurança da Informação",
      description: "Conclua 5 tarefas de Segurança da Informação.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 3,
        label: "Proteção diária",
        description: "Conclua 3 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "pomodorosCompleted",
        target: 10,
        label: "Semana de análise",
        description: "Complete 10 pomodoros na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_000,
        label: "Evolução em segurança",
        description: "Conquiste 2.000 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Segurança",
      tasks: "Operações de Segurança",
      goals: "Metas de Proteção",
      achievements: "Conquistas de Segurança",
      workspace: "Central de Segurança",
    },
    taskTemplates: [
      {
        id: "security-review-alerts",
        label: "Revisar alertas",
        title: "Revisar alertas de segurança",
        description:
          "Classificar alertas, registrar evidências e definir ações.",
        category: "SOC",
        priority: "high",
        tags: ["seguranca", "monitoramento"],
        estimateMinutes: 60,
      },
      {
        id: "security-fix-vulnerability",
        label: "Corrigir vulnerabilidade",
        title: "Corrigir vulnerabilidade identificada",
        description:
          "Validar impacto, aplicar a correção e documentar o resultado.",
        category: "Vulnerabilidades",
        priority: "critical",
        tags: ["seguranca", "vulnerabilidade"],
        estimateMinutes: 120,
      },
      {
        id: "security-incident-review",
        label: "Analisar incidente",
        title: "Analisar incidente de segurança",
        description:
          "Preservar evidências, identificar impacto e registrar ações.",
        category: "Incidentes",
        priority: "critical",
        tags: ["seguranca", "incidente"],
        estimateMinutes: 90,
      },
    ],
    stats: AREA_STATS,
  },
  "software-development": {
    name: "Desenvolvimento de Software",
    icon: "code-2",
    description:
      "Construa e evolua software com qualidade, colaboração e entregas incrementais.",
    categories: [
      "Feature",
      "Bug",
      "Code Review",
      "Refactoring",
      "Testes",
      "Deploy",
      "Frontend",
      "Backend",
      "Banco de Dados",
      "Documentação",
    ],
    achievement: {
      id: "area-software-development-specialist",
      name: "Especialista em Desenvolvimento de Software",
      description: "Conclua 5 tarefas de Desenvolvimento de Software.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 4,
        label: "Entrega diária",
        description: "Conclua 4 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "focusedSeconds",
        target: 36_000,
        label: "Semana de código",
        description: "Acumule 10 horas de foco na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 3_000,
        label: "Evolução técnica",
        description: "Conquiste 3.000 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Desenvolvimento",
      tasks: "Backlog de Desenvolvimento",
      goals: "Metas de Entrega",
      achievements: "Conquistas de Código",
      workspace: "Workspace de Desenvolvimento",
    },
    taskTemplates: [
      {
        id: "development-user-story",
        label: "Implementar história",
        title: "Implementar história de usuário",
        description: "Implementar critérios de aceite, testes e documentação.",
        category: "Feature",
        priority: "high",
        tags: ["desenvolvimento", "feature"],
        estimateMinutes: 180,
      },
      {
        id: "development-code-review",
        label: "Revisar código",
        title: "Revisar pull request",
        description: "Revisar comportamento, testes e riscos de regressão.",
        category: "Code Review",
        priority: "medium",
        tags: ["desenvolvimento", "code-review"],
        estimateMinutes: 45,
      },
      {
        id: "development-fix-bug",
        label: "Corrigir bug",
        title: "Investigar e corrigir bug",
        description:
          "Reproduzir o problema, corrigir a causa e validar a solução.",
        category: "Backend",
        priority: "high",
        tags: ["desenvolvimento", "bug"],
        estimateMinutes: 120,
      },
    ],
    stats: AREA_STATS,
  },
  infrastructure: {
    name: "Infraestrutura",
    icon: "server",
    description:
      "Opere ambientes confiáveis, disponíveis e preparados para recuperação.",
    categories: [
      "Servidores",
      "Redes",
      "Cloud",
      "Monitoramento",
      "Backup",
      "Virtualização",
      "Troubleshooting",
      "Automação",
    ],
    achievement: {
      id: "area-infrastructure-specialist",
      name: "Especialista em Infraestrutura",
      description: "Conclua 5 tarefas de Infraestrutura.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 4,
        label: "Operação diária",
        description: "Conclua 4 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "pomodorosCompleted",
        target: 12,
        label: "Semana operacional",
        description: "Complete 12 pomodoros na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_500,
        label: "Evolução da infraestrutura",
        description: "Conquiste 2.500 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Infraestrutura",
      tasks: "Rotinas de Infraestrutura",
      goals: "Metas Operacionais",
      achievements: "Conquistas de Infraestrutura",
      workspace: "Central de Infraestrutura",
    },
    taskTemplates: [
      {
        id: "infrastructure-maintenance",
        label: "Executar manutenção",
        title: "Executar manutenção preventiva",
        description: "Validar saúde, atualizações e plano de retorno.",
        category: "Servidores",
        priority: "high",
        tags: ["infraestrutura", "manutencao"],
        estimateMinutes: 120,
      },
      {
        id: "infrastructure-backup",
        label: "Validar backup",
        title: "Validar rotina de backup",
        description: "Confirmar execução, retenção e teste de restauração.",
        category: "Backup",
        priority: "critical",
        tags: ["infraestrutura", "backup"],
        estimateMinutes: 60,
      },
      {
        id: "infrastructure-capacity",
        label: "Revisar capacidade",
        title: "Revisar capacidade do ambiente",
        description: "Analisar consumo, tendência e necessidade de expansão.",
        category: "Monitoramento",
        priority: "medium",
        tags: ["infraestrutura", "capacidade"],
        estimateMinutes: 60,
      },
    ],
    stats: AREA_STATS,
  },
  support: {
    name: "Suporte / Help Desk",
    icon: "headphones",
    description:
      "Resolva solicitações com comunicação clara, registro e foco no usuário.",
    categories: [
      "Atendimento",
      "Incidentes",
      "Requisições",
      "Acesso",
      "Hardware",
      "Software",
    ],
    achievement: {
      id: "area-support-specialist",
      name: "Especialista em Suporte",
      description: "Conclua 5 tarefas de Suporte / Help Desk.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 8,
        label: "Atendimento diário",
        description: "Conclua 8 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "tasksCompleted",
        target: 30,
        label: "Semana resolutiva",
        description: "Conclua 30 tarefas na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_500,
        label: "Evolução no suporte",
        description: "Conquiste 2.500 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Suporte",
      tasks: "Fila de Atendimento",
      goals: "Metas de Atendimento",
      achievements: "Conquistas de Suporte",
      workspace: "Central de Suporte",
    },
    taskTemplates: [
      {
        id: "support-request",
        label: "Atender solicitação",
        title: "Atender solicitação de usuário",
        description: "Diagnosticar, orientar e registrar a solução.",
        category: "Atendimento",
        priority: "medium",
        tags: ["suporte", "atendimento"],
        estimateMinutes: 30,
      },
      {
        id: "support-critical-incident",
        label: "Investigar incidente",
        title: "Investigar incidente crítico",
        description: "Coletar contexto, reduzir impacto e manter comunicação.",
        category: "Incidentes",
        priority: "critical",
        tags: ["suporte", "incidente"],
        estimateMinutes: 90,
      },
    ],
    stats: AREA_STATS,
  },
  "devops-sre": {
    name: "DevOps / SRE",
    icon: "git-branch",
    description:
      "Automatize entregas e opere serviços confiáveis com observabilidade.",
    categories: [
      "CI/CD",
      "Observabilidade",
      "Automação",
      "Plataforma",
      "Confiabilidade",
      "Incidentes",
    ],
    achievement: {
      id: "area-devops-sre-specialist",
      name: "Especialista em DevOps / SRE",
      description: "Conclua 5 tarefas de DevOps / SRE.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 4,
        label: "Melhoria diária",
        description: "Conclua 4 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "focusedSeconds",
        target: 28_800,
        label: "Semana confiável",
        description: "Acumule 8 horas de foco na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 3_000,
        label: "Evolução de plataforma",
        description: "Conquiste 3.000 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel DevOps / SRE",
      tasks: "Backlog Operacional",
      goals: "Metas de Confiabilidade",
      achievements: "Conquistas DevOps / SRE",
      workspace: "Central de Operações",
    },
    taskTemplates: [
      {
        id: "devops-pipeline",
        label: "Automatizar pipeline",
        title: "Automatizar etapa do pipeline",
        description: "Implementar, testar e documentar a automação.",
        category: "CI/CD",
        priority: "high",
        tags: ["devops", "automacao"],
        estimateMinutes: 120,
      },
      {
        id: "devops-alert",
        label: "Revisar alerta",
        title: "Revisar alerta operacional",
        description: "Validar sinal, impacto e ação recomendada.",
        category: "Observabilidade",
        priority: "high",
        tags: ["sre", "observabilidade"],
        estimateMinutes: 45,
      },
    ],
    stats: AREA_STATS,
  },
  "data-analytics": {
    name: "Dados / Data Analytics",
    icon: "chart-bar",
    description:
      "Transforme dados confiáveis em análises e decisões compreensíveis.",
    categories: [
      "Análise de Dados",
      "Engenharia de Dados",
      "BI",
      "Visualização",
      "Modelagem",
      "Qualidade de Dados",
    ],
    achievement: {
      id: "area-data-analytics-specialist",
      name: "Especialista em Dados / Data Analytics",
      description: "Conclua 5 tarefas de Dados / Data Analytics.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 3,
        label: "Análise diária",
        description: "Conclua 3 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "pomodorosCompleted",
        target: 15,
        label: "Semana analítica",
        description: "Complete 15 pomodoros na semana.",
      },
      {
        cadence: "monthly",
        metric: "focusedSeconds",
        target: 108_000,
        label: "Mês de insights",
        description: "Acumule 30 horas de foco no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Dados",
      tasks: "Backlog de Dados",
      goals: "Metas Analíticas",
      achievements: "Conquistas de Dados",
      workspace: "Laboratório de Dados",
    },
    taskTemplates: [
      {
        id: "data-analysis",
        label: "Analisar dados",
        title: "Analisar conjunto de dados",
        description:
          "Validar qualidade, explorar padrões e registrar conclusões.",
        category: "Análise de Dados",
        priority: "high",
        tags: ["dados", "analise"],
        estimateMinutes: 120,
      },
      {
        id: "data-dashboard",
        label: "Atualizar dashboard",
        title: "Atualizar painel de indicadores",
        description: "Revisar fontes, métricas e visualizações.",
        category: "Visualização",
        priority: "medium",
        tags: ["dados", "dashboard"],
        estimateMinutes: 90,
      },
    ],
    stats: AREA_STATS,
  },
  cloud: {
    name: "Cloud",
    icon: "cloud",
    description:
      "Projete e opere soluções em nuvem seguras, elásticas e eficientes.",
    categories: [
      "Arquitetura Cloud",
      "Infraestrutura como Código",
      "FinOps",
      "Segurança Cloud",
      "Serverless",
      "Containers",
    ],
    achievement: {
      id: "area-cloud-specialist",
      name: "Especialista em Cloud",
      description: "Conclua 5 tarefas de Cloud.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 4,
        label: "Cloud diária",
        description: "Conclua 4 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "focusedSeconds",
        target: 28_800,
        label: "Semana na nuvem",
        description: "Acumule 8 horas de foco na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 3_000,
        label: "Evolução em cloud",
        description: "Conquiste 3.000 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel Cloud",
      tasks: "Backlog Cloud",
      goals: "Metas de Cloud",
      achievements: "Conquistas de Cloud",
      workspace: "Central Cloud",
    },
    taskTemplates: [
      {
        id: "cloud-provision-resource",
        label: "Provisionar recurso",
        title: "Provisionar recurso em cloud",
        description:
          "Definir requisitos, segurança e infraestrutura como código.",
        category: "Infraestrutura como Código",
        priority: "high",
        tags: ["cloud", "infra-as-code"],
        estimateMinutes: 120,
      },
      {
        id: "cloud-cost-review",
        label: "Revisar custos",
        title: "Revisar custos de cloud",
        description:
          "Analisar consumo, anomalias e oportunidades de otimização.",
        category: "FinOps",
        priority: "medium",
        tags: ["cloud", "finops"],
        estimateMinutes: 60,
      },
    ],
    stats: AREA_STATS,
  },
  "qa-testing": {
    name: "QA / Testes",
    icon: "bug",
    description:
      "Previna defeitos com estratégia, automação e evidências de qualidade.",
    categories: [
      "Testes Funcionais",
      "Automação",
      "Performance",
      "Acessibilidade",
      "Testes de API",
      "Qualidade de Software",
    ],
    achievement: {
      id: "area-qa-testing-specialist",
      name: "Especialista em QA / Testes",
      description: "Conclua 5 tarefas de QA / Testes.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 5,
        label: "Qualidade diária",
        description: "Conclua 5 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "pomodorosCompleted",
        target: 12,
        label: "Semana de testes",
        description: "Complete 12 pomodoros na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_500,
        label: "Evolução em qualidade",
        description: "Conquiste 2.500 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Qualidade",
      tasks: "Plano de Testes",
      goals: "Metas de Qualidade",
      achievements: "Conquistas de QA",
      workspace: "Laboratório de Qualidade",
    },
    taskTemplates: [
      {
        id: "qa-test-plan",
        label: "Executar testes",
        title: "Executar plano de testes",
        description:
          "Executar cenários, registrar evidências e comunicar desvios.",
        category: "Testes Funcionais",
        priority: "high",
        tags: ["qa", "testes"],
        estimateMinutes: 90,
      },
      {
        id: "qa-automate-scenario",
        label: "Automatizar cenário",
        title: "Automatizar cenário crítico",
        description: "Criar teste estável e integrado ao pipeline.",
        category: "Automação",
        priority: "high",
        tags: ["qa", "automacao"],
        estimateMinutes: 120,
      },
    ],
    stats: AREA_STATS,
  },
  "it-project-management": {
    name: "Gestão de Projetos de TI",
    icon: "clipboard-list",
    description:
      "Conduza iniciativas de TI com alinhamento, visibilidade e entrega de valor.",
    categories: [
      "Planejamento",
      "Execução",
      "Riscos",
      "Stakeholders",
      "Portfólio",
      "Agilidade",
    ],
    achievement: {
      id: "area-it-project-management-specialist",
      name: "Especialista em Gestão de Projetos de TI",
      description: "Conclua 5 tarefas de Gestão de Projetos de TI.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 4,
        label: "Gestão diária",
        description: "Conclua 4 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "xpEarned",
        target: 700,
        label: "Semana de entregas",
        description: "Conquiste 700 XP na semana.",
      },
      {
        cadence: "monthly",
        metric: "tasksCompleted",
        target: 80,
        label: "Portfólio em movimento",
        description: "Conclua 80 tarefas no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Projetos",
      tasks: "Plano de Ação",
      goals: "Metas de Projeto",
      achievements: "Conquistas de Gestão",
      workspace: "Escritório de Projetos",
    },
    taskTemplates: [
      {
        id: "project-plan-review",
        label: "Revisar plano",
        title: "Revisar plano do projeto",
        description: "Atualizar escopo, marcos, dependências e riscos.",
        category: "Planejamento",
        priority: "high",
        tags: ["projetos", "planejamento"],
        estimateMinutes: 60,
      },
      {
        id: "project-status",
        label: "Preparar status",
        title: "Preparar acompanhamento de status",
        description: "Consolidar progresso, impedimentos e próximas ações.",
        category: "Stakeholders",
        priority: "medium",
        tags: ["projetos", "status"],
        estimateMinutes: 45,
      },
    ],
    stats: AREA_STATS,
  },
  networks: {
    name: "Redes",
    icon: "network",
    description:
      "Opere conectividade segura, observável e resiliente entre ambientes.",
    categories: [
      "LAN e WAN",
      "Wireless",
      "Roteamento",
      "Switching",
      "Firewalls",
      "Monitoramento de Rede",
    ],
    achievement: {
      id: "area-networks-specialist",
      name: "Especialista em Redes",
      description: "Conclua 5 tarefas de Redes.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 4,
        label: "Rede diária",
        description: "Conclua 4 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "pomodorosCompleted",
        target: 10,
        label: "Semana conectada",
        description: "Complete 10 pomodoros na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_500,
        label: "Evolução em redes",
        description: "Conquiste 2.500 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Redes",
      tasks: "Operações de Rede",
      goals: "Metas de Conectividade",
      achievements: "Conquistas de Redes",
      workspace: "Central de Redes",
    },
    taskTemplates: [
      {
        id: "network-diagnosis",
        label: "Diagnosticar conexão",
        title: "Diagnosticar falha de conectividade",
        description:
          "Isolar a falha, coletar evidências e registrar a correção.",
        category: "Monitoramento de Rede",
        priority: "critical",
        tags: ["redes", "diagnostico"],
        estimateMinutes: 90,
      },
      {
        id: "network-config-review",
        label: "Revisar configuração",
        title: "Revisar configuração de rede",
        description: "Validar padrão, segurança, redundância e documentação.",
        category: "Roteamento",
        priority: "high",
        tags: ["redes", "configuracao"],
        estimateMinutes: 60,
      },
    ],
    stats: AREA_STATS,
  },
  database: {
    name: "Banco de Dados",
    icon: "database",
    description:
      "Mantenha dados íntegros, disponíveis, eficientes e recuperáveis.",
    categories: [
      "Modelagem",
      "Administração",
      "Performance",
      "Backup e Recuperação",
      "Segurança de Dados",
      "Migrações",
    ],
    achievement: {
      id: "area-database-specialist",
      name: "Especialista em Banco de Dados",
      description: "Conclua 5 tarefas de Banco de Dados.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 3,
        label: "Dados em dia",
        description: "Conclua 3 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "focusedSeconds",
        target: 28_800,
        label: "Semana de dados",
        description: "Acumule 8 horas de foco na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_500,
        label: "Evolução em bancos",
        description: "Conquiste 2.500 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de Banco de Dados",
      tasks: "Rotinas de Banco de Dados",
      goals: "Metas de Dados",
      achievements: "Conquistas de Banco de Dados",
      workspace: "Central de Banco de Dados",
    },
    taskTemplates: [
      {
        id: "database-query-performance",
        label: "Otimizar consulta",
        title: "Revisar desempenho de consulta",
        description: "Analisar plano, índices, volume e impacto.",
        category: "Performance",
        priority: "high",
        tags: ["banco-de-dados", "performance"],
        estimateMinutes: 90,
      },
      {
        id: "database-backup",
        label: "Validar backup",
        title: "Validar rotina de backup",
        description: "Confirmar execução, retenção e teste de restauração.",
        category: "Backup e Recuperação",
        priority: "critical",
        tags: ["banco-de-dados", "backup"],
        estimateMinutes: 60,
      },
    ],
    stats: AREA_STATS,
  },
  other: {
    name: "Outra",
    icon: "circle-ellipsis",
    description:
      "Organize uma atuação multidisciplinar ou outra especialidade de TI.",
    categories: [
      "Geral",
      "Documentação",
      "Pesquisa",
      "Automação",
      "Processos",
      "Aprendizado",
    ],
    achievement: {
      id: "area-other-specialist",
      name: "Especialista em TI",
      description: "Conclua 5 tarefas desta área de TI.",
      metric: "areaTasksCompleted",
      target: 5,
      rewardXp: 75,
    },
    goals: [
      {
        cadence: "daily",
        metric: "tasksCompleted",
        target: 3,
        label: "Progresso diário",
        description: "Conclua 3 tarefas no dia.",
      },
      {
        cadence: "weekly",
        metric: "pomodorosCompleted",
        target: 10,
        label: "Semana produtiva",
        description: "Complete 10 pomodoros na semana.",
      },
      {
        cadence: "monthly",
        metric: "xpEarned",
        target: 2_000,
        label: "Evolução em TI",
        description: "Conquiste 2.000 XP no mês.",
      },
    ],
    titles: {
      dashboard: "Painel de TI",
      tasks: "Tarefas de TI",
      goals: "Metas de TI",
      achievements: "Conquistas de TI",
      workspace: "Workspace de TI",
    },
    taskTemplates: [
      {
        id: "other-plan-delivery",
        label: "Planejar entrega",
        title: "Planejar próxima entrega",
        description:
          "Definir resultado, etapas, riscos e critério de conclusão.",
        category: "Processos",
        priority: "medium",
        tags: ["ti", "planejamento"],
        estimateMinutes: 45,
      },
      {
        id: "other-document-solution",
        label: "Documentar solução",
        title: "Documentar solução técnica",
        description: "Registrar contexto, decisão e orientações de operação.",
        category: "Documentação",
        priority: "medium",
        tags: ["ti", "documentacao"],
        estimateMinutes: 60,
      },
    ],
    stats: AREA_STATS,
  },
} as const satisfies Record<ITAreaId, ITAreaConfig>

export interface ITAreaOption {
  id: ITAreaId
  label: string
}

export const IT_AREAS = IT_AREA_IDS.map((id) => ({
  id,
  label: IT_AREA_CONFIG[id].name,
})) satisfies readonly ITAreaOption[]

export function isITAreaId(value: unknown): value is ITAreaId {
  return (
    typeof value === "string" &&
    (IT_AREA_IDS as readonly string[]).includes(value)
  )
}

export function getITAreaConfig(value: unknown): ITAreaConfig {
  return IT_AREA_CONFIG[isITAreaId(value) ? value : "other"]
}

export function getAreaLabel(value: unknown): string {
  return isITAreaId(value) ? IT_AREA_CONFIG[value].name : "A definir"
}
