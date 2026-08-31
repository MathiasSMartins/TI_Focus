export function getInitials(name: string | null | undefined) {
  if (!name?.trim()) return "TF"

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
