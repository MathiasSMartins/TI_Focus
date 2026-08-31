export const AVATAR_PRESETS = [
  { value: "preset:indigo", label: "Índigo" },
  { value: "preset:emerald", label: "Esmeralda" },
  { value: "preset:amber", label: "Âmbar" },
  { value: "preset:rose", label: "Rosa" },
  { value: "preset:sky", label: "Azul" },
  { value: "preset:slate", label: "Grafite" },
] as const

export const DEFAULT_AVATAR_PRESET = AVATAR_PRESETS[0].value

export const AVATAR_PRESET_STYLES: Record<string, string> = {
  indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
}
