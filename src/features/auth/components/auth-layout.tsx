import type { CSSProperties } from "react"
import { Link, Outlet } from "react-router-dom"

const authenticationTheme = {
  backgroundImage: "url('/auth-background.svg')",
  "--primary": "oklch(0.74 0.16 238)",
  "--ring": "oklch(0.74 0.16 238)",
} as CSSProperties

export function AuthLayout() {
  return (
    <main
      className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-x-hidden bg-[#030617] bg-cover bg-center bg-no-repeat px-4 py-10 sm:px-6"
      style={authenticationTheme}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,18,0.2),rgba(2,4,18,0.6)),radial-gradient(circle_at_center,rgba(2,5,22,0.16),rgba(2,5,22,0.72)_78%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(168,36,255,0.1),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(0,174,255,0.1),transparent_30%)]" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/login"
          className="group mx-auto mb-7 flex w-fit items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-[#030617]"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-[#05081d]/75 p-1 shadow-[0_12px_40px_-10px_rgba(36,143,255,0.75)] backdrop-blur-md transition duration-300 group-hover:-translate-y-0.5 group-hover:border-cyan-300/40">
            <img
              src="/favicon.svg"
              alt=""
              width="48"
              height="48"
              className="size-12 rounded-xl"
              aria-hidden="true"
            />
          </span>
          <span className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            <span className="block text-xl font-bold tracking-tight text-white">
              TI Focus
            </span>
            <span className="block text-xs font-medium tracking-wide text-white/65">
              Produtividade em evolução
            </span>
          </span>
        </Link>

        <div className="[&_[data-slot=card]]:rounded-2xl [&_[data-slot=card]]:border-white/15 [&_[data-slot=card]]:bg-[#06091a]/90 [&_[data-slot=card]]:shadow-[0_28px_90px_-32px_rgba(39,105,255,0.75)] [&_[data-slot=card]]:backdrop-blur-xl [&_[data-slot=input]]:border-white/15 [&_[data-slot=input]]:bg-black/25 [&_[data-slot=input]]:shadow-inner">
          <Outlet />
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] font-medium tracking-[0.16em] text-white/45 uppercase drop-shadow-md">
          <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.95)]" />
          Planeje. Conclua. Evolua.
        </p>
      </div>
    </main>
  )
}
