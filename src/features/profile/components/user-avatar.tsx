import { useState } from "react"

import { AVATAR_PRESET_STYLES } from "@/features/profile/components/avatar-presets"
import { getInitials } from "@/utils/get-initials"

const SIZE_STYLES = {
  sm: "size-10 rounded-lg text-sm",
  md: "size-14 rounded-xl text-base",
  lg: "size-24 rounded-2xl text-2xl",
} as const

interface UserAvatarProps {
  avatar?: string | null
  name?: string | null
  size?: keyof typeof SIZE_STYLES
  className?: string
}

interface AvatarVisualProps {
  accessibleName: string
  className: string
  name?: string | null
  presetStyle: string
  sizing: string
}

function AvatarFallback({
  accessibleName,
  className,
  name,
  presetStyle,
  sizing,
}: AvatarVisualProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-bold ${sizing} ${presetStyle} ${className}`}
      role="img"
      aria-label={accessibleName}
    >
      {getInitials(name)}
    </div>
  )
}

function RemoteAvatar({
  avatar,
  accessibleName,
  className,
  name,
  presetStyle,
  sizing,
}: AvatarVisualProps & { avatar: string }) {
  const [hasFailed, setHasFailed] = useState(false)

  if (hasFailed) {
    return (
      <AvatarFallback
        accessibleName={accessibleName}
        className={className}
        name={name}
        presetStyle={presetStyle}
        sizing={sizing}
      />
    )
  }

  return (
    <img
      src={avatar}
      alt={accessibleName}
      className={`${sizing} shrink-0 object-cover ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setHasFailed(true)}
    />
  )
}

export function UserAvatar({
  avatar,
  name,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const isPreset = avatar?.startsWith("preset:") ?? false
  const presetId = isPreset ? avatar?.slice("preset:".length) : undefined
  const presetStyle =
    (presetId && AVATAR_PRESET_STYLES[presetId]) ?? "bg-primary/15 text-primary"
  const accessibleName = name ? `Avatar de ${name}` : "Avatar do usuário"
  const sizing = SIZE_STYLES[size]
  const visualProps: AvatarVisualProps = {
    accessibleName,
    className,
    name,
    presetStyle,
    sizing,
  }

  if (avatar && !isPreset) {
    return <RemoteAvatar key={avatar} avatar={avatar} {...visualProps} />
  }

  return <AvatarFallback {...visualProps} />
}
