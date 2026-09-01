import {
  Bug,
  ChartBar,
  CircleEllipsis,
  ClipboardList,
  Cloud,
  Code2,
  Database,
  GitBranch,
  Headphones,
  Network,
  Server,
  ShieldCheck,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"

import {
  IT_AREA_ICON_NAMES,
  type ITAreaIconName,
} from "@/config/it-area-config"

const AREA_ICONS = {
  "shield-check": ShieldCheck,
  "code-2": Code2,
  server: Server,
  headphones: Headphones,
  "git-branch": GitBranch,
  "chart-bar": ChartBar,
  cloud: Cloud,
  bug: Bug,
  "clipboard-list": ClipboardList,
  network: Network,
  database: Database,
  "circle-ellipsis": CircleEllipsis,
} as const satisfies Record<ITAreaIconName, LucideIcon>

function isITAreaIconName(value: unknown): value is ITAreaIconName {
  return (
    typeof value === "string" &&
    (IT_AREA_ICON_NAMES as readonly string[]).includes(value)
  )
}

export interface AreaIconProps extends LucideProps {
  icon?: string | null
}

export function AreaIcon({ icon, ...props }: AreaIconProps) {
  const Icon = AREA_ICONS[isITAreaIconName(icon) ? icon : "circle-ellipsis"]

  return <Icon aria-hidden="true" {...props} />
}
