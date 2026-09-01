import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Target,
  ListChecks,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import { AreaIcon } from "@/components/area-icon"
import { IT_AREA_CONFIG } from "@/config/it-area-config"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormMessage } from "@/components/ui/form-message"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthErrorState } from "@/features/auth/components/auth-error-state"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_PRESET,
} from "@/features/profile/components/avatar-presets"
import { UserAvatar } from "@/features/profile/components/user-avatar"
import {
  IT_AREAS,
  PRIMARY_OBJECTIVES,
  type ITAreaId,
  type PrimaryObjectiveId,
} from "@/features/profile/types/user-profile"

const WIZARD_STEPS = [
  { title: "Seu perfil", description: "Como você quer aparecer no TI Focus?" },
  {
    title: "Área principal",
    description: "Qual é sua principal área de atuação?",
  },
  {
    title: "Áreas secundárias",
    description: "Selecione outros interesses profissionais.",
  },
  {
    title: "Objetivo principal",
    description: "O que você quer alcançar primeiro?",
  },
  {
    title: "Meta diária",
    description: "Quantas tarefas você quer concluir por dia?",
  },
] as const

const DAILY_GOAL_PRESETS = [3, 5, 8] as const
const MAX_SECONDARY_AREAS = 5

type WizardStep = 1 | 2 | 3 | 4 | 5

export function OnboardingPage() {
  const {
    user,
    profile,
    error,
    isSubmitting,
    completeOnboarding,
    reloadProfile,
    logout,
  } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>(1)
  const [name, setName] = useState(profile?.name ?? "")
  const [avatar, setAvatar] = useState<string>(
    profile?.avatar ?? user?.photoURL ?? DEFAULT_AVATAR_PRESET,
  )
  const [primaryArea, setPrimaryArea] = useState<ITAreaId | "">(
    profile?.primaryArea ?? "",
  )
  const [secondaryAreas, setSecondaryAreas] = useState<ITAreaId[]>(
    profile?.secondaryAreas ?? [],
  )
  const [primaryObjective, setPrimaryObjective] = useState<
    PrimaryObjectiveId | ""
  >(profile?.primaryObjective ?? "")
  const [dailyTaskGoal, setDailyTaskGoal] = useState<number | "">(
    profile?.dailyTaskGoal ?? 5,
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const stepContentRef = useRef<HTMLDivElement>(null)
  const hasShownFirstStep = useRef(false)

  useEffect(() => {
    if (profile?.onboardingCompleted) navigate("/dashboard", { replace: true })
  }, [navigate, profile?.onboardingCompleted])

  useEffect(() => {
    if (!profile) return
    if (!hasShownFirstStep.current) {
      hasShownFirstStep.current = true
      return
    }
    stepContentRef.current?.focus()
  }, [profile, step])

  if (!profile) {
    return (
      <AuthErrorState
        message={error ?? "Seu perfil ainda não está disponível."}
        onRetry={() => void reloadProfile()}
        onLogout={() => void logout()}
      />
    )
  }
  if (profile.onboardingCompleted) return <Navigate to="/dashboard" replace />

  const currentStep = WIZARD_STEPS[step - 1]
  const timezone =
    profile.settings.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC"

  function getStepError(current: WizardStep) {
    if (current === 1 && name.trim().length < 2) {
      return "Informe seu nome com pelo menos 2 caracteres."
    }
    if (current === 2 && !primaryArea) {
      return "Selecione sua área principal de atuação."
    }
    if (current === 4 && !primaryObjective) {
      return "Selecione seu objetivo principal."
    }
    if (
      current === 5 &&
      (dailyTaskGoal === "" ||
        !Number.isInteger(dailyTaskGoal) ||
        dailyTaskGoal < 1 ||
        dailyTaskGoal > 50)
    ) {
      return "Defina uma meta diária entre 1 e 50 tarefas."
    }
    return null
  }

  function goForward() {
    const nextError = getStepError(step)
    if (nextError) {
      setValidationError(nextError)
      return
    }

    setValidationError(null)
    if (step < 5) setStep((step + 1) as WizardStep)
  }

  function goBack() {
    setValidationError(null)
    if (step > 1) setStep((step - 1) as WizardStep)
  }

  function selectPrimaryArea(areaId: ITAreaId) {
    setPrimaryArea(areaId)
    setSecondaryAreas((current) => current.filter((area) => area !== areaId))
  }

  function toggleSecondaryArea(areaId: ITAreaId) {
    setSecondaryAreas((current) =>
      current.includes(areaId)
        ? current.filter((item) => item !== areaId)
        : current.length < MAX_SECONDARY_AREAS
          ? [...current, areaId]
          : current,
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step < 5) {
      goForward()
      return
    }

    const finalError = getStepError(5)
    if (
      finalError ||
      !primaryArea ||
      !primaryObjective ||
      dailyTaskGoal === ""
    ) {
      setValidationError(finalError ?? "Revise as informações do seu perfil.")
      return
    }

    setValidationError(null)
    const success = await completeOnboarding({
      name: name.trim(),
      avatar,
      primaryArea,
      secondaryAreas,
      primaryObjective,
      dailyTaskGoal,
      timezone,
    })
    if (success) navigate("/dashboard", { replace: true })
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold">TI Focus</p>
              <p className="text-xs text-muted-foreground">
                Configuração inicial
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void logout()}
            disabled={isSubmitting}
          >
            <LogOut /> Sair
          </Button>
        </header>

        <ol
          className="mb-6 grid grid-cols-5 gap-2"
          aria-label="Progresso do onboarding"
        >
          {WIZARD_STEPS.map((item, index) => {
            const itemStep = (index + 1) as WizardStep
            const isCurrent = itemStep === step
            const isComplete = itemStep < step
            return (
              <li
                key={item.title}
                aria-current={isCurrent ? "step" : undefined}
              >
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    itemStep <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
                <p
                  className={`mt-2 hidden text-xs sm:block ${
                    isCurrent
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {isComplete ? "Concluída" : `Etapa ${itemStep}`}
                </p>
              </li>
            )
          })}
        </ol>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/25">
            <div
              ref={stepContentRef}
              className="flex items-start gap-4 outline-none"
              role="group"
              tabIndex={-1}
              aria-labelledby="onboarding-step-title"
              aria-describedby="onboarding-step-description"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {step === 1 && <UserRound aria-hidden="true" />}
                {step === 2 && <BriefcaseBusiness aria-hidden="true" />}
                {step === 3 && <ListChecks aria-hidden="true" />}
                {step === 4 && <Target aria-hidden="true" />}
                {step === 5 && <Sparkles aria-hidden="true" />}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  Etapa {step} de 5
                </p>
                <CardTitle id="onboarding-step-title" className="mt-1 text-2xl">
                  {currentStep.title}
                </CardTitle>
                <CardDescription
                  id="onboarding-step-description"
                  className="mt-1"
                >
                  {currentStep.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-7">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {(validationError || error) && (
                <FormMessage>{validationError ?? error ?? ""}</FormMessage>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
                    <UserAvatar avatar={avatar} name={name} size="lg" />
                    <div className="space-y-2">
                      <Label htmlFor="onboarding-name">Seu nome</Label>
                      <Input
                        id="onboarding-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={80}
                        autoComplete="name"
                        autoFocus
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        É assim que vamos chamar você no seu workspace.
                      </p>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="text-sm font-medium">
                      Escolha um avatar
                    </legend>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Você poderá alterar essa escolha futuramente.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {user?.photoURL && (
                        <button
                          type="button"
                          className={`rounded-xl border-2 p-1.5 transition ${
                            avatar === user.photoURL
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-border"
                          }`}
                          aria-label="Usar foto da conta"
                          aria-pressed={avatar === user.photoURL}
                          onClick={() =>
                            setAvatar(user.photoURL ?? DEFAULT_AVATAR_PRESET)
                          }
                          disabled={isSubmitting}
                        >
                          <UserAvatar
                            avatar={user.photoURL}
                            name={name}
                            size="md"
                          />
                        </button>
                      )}
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className={`relative rounded-xl border-2 p-1.5 transition ${
                            avatar === preset.value
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-border"
                          }`}
                          aria-label={`Selecionar avatar ${preset.label}`}
                          aria-pressed={avatar === preset.value}
                          onClick={() => setAvatar(preset.value)}
                          disabled={isSubmitting}
                        >
                          <UserAvatar
                            avatar={preset.value}
                            name={name}
                            size="md"
                          />
                          {avatar === preset.value && (
                            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-3" aria-hidden="true" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {step === 2 && (
                <fieldset>
                  <legend className="sr-only">Área principal de TI</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {IT_AREAS.map((area) => {
                      const selected = primaryArea === area.id
                      const areaConfig = IT_AREA_CONFIG[area.id]
                      return (
                        <button
                          key={area.id}
                          type="button"
                          className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                              : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                          }`}
                          aria-label={area.label}
                          aria-pressed={selected}
                          onClick={() => selectPrimaryArea(area.id)}
                          disabled={isSubmitting}
                        >
                          <AreaIcon
                            icon={areaConfig.icon}
                            className="mt-0.5 size-5 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {area.label}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {areaConfig.description}
                            </span>
                          </span>
                          {selected && (
                            <CheckCircle2
                              className="ml-auto size-4 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              {step === 3 && (
                <fieldset>
                  <legend className="sr-only">Áreas secundárias de TI</legend>
                  <div className="mb-4 flex items-center justify-between gap-3 text-sm">
                    <p className="text-muted-foreground">
                      Opcional. Selecione até cinco áreas.
                    </p>
                    <span className="rounded-full bg-muted px-3 py-1 font-medium">
                      {secondaryAreas.length}/{MAX_SECONDARY_AREAS}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {IT_AREAS.filter((area) => area.id !== primaryArea).map(
                      (area) => {
                        const selected = secondaryAreas.includes(area.id)
                        const areaConfig = IT_AREA_CONFIG[area.id]
                        const disabled =
                          isSubmitting ||
                          (!selected &&
                            secondaryAreas.length >= MAX_SECONDARY_AREAS)
                        return (
                          <label
                            key={area.id}
                            className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-sm transition ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background"
                            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"}`}
                          >
                            <input
                              aria-label={area.label}
                              type="checkbox"
                              className="mt-1 size-4 accent-[var(--primary)]"
                              checked={selected}
                              onChange={() => toggleSecondaryArea(area.id)}
                              disabled={disabled}
                            />
                            <AreaIcon
                              icon={areaConfig.icon}
                              className="mt-0.5 size-5 shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium">
                                {area.label}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {areaConfig.description}
                              </span>
                            </span>
                          </label>
                        )
                      },
                    )}
                  </div>
                </fieldset>
              )}

              {step === 4 && (
                <fieldset>
                  <legend className="sr-only">Objetivo principal</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PRIMARY_OBJECTIVES.map((objective) => {
                      const selected = primaryObjective === objective.id
                      return (
                        <button
                          key={objective.id}
                          type="button"
                          className={`flex min-h-20 items-center gap-4 rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                              : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                          }`}
                          aria-pressed={selected}
                          onClick={() => setPrimaryObjective(objective.id)}
                          disabled={isSubmitting}
                        >
                          <Target
                            className="size-5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium">
                            {objective.label}
                          </span>
                          {selected && (
                            <CheckCircle2
                              className="ml-auto size-4"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <fieldset>
                    <legend className="text-sm font-medium">
                      Escolha uma meta inicial
                    </legend>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {DAILY_GOAL_PRESETS.map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          className={`rounded-xl border px-3 py-5 text-center transition ${
                            dailyTaskGoal === goal
                              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                              : "border-border hover:border-primary/40 hover:bg-accent"
                          }`}
                          aria-label={`${goal} tarefas por dia`}
                          aria-pressed={dailyTaskGoal === goal}
                          onClick={() => setDailyTaskGoal(goal)}
                          disabled={isSubmitting}
                        >
                          <strong className="block text-2xl">{goal}</strong>
                          <span className="text-xs text-muted-foreground">
                            tarefas por dia
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <Label htmlFor="custom-daily-goal">
                      Ou defina outro valor
                    </Label>
                    <Input
                      id="custom-daily-goal"
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={dailyTaskGoal}
                      onChange={(event) =>
                        setDailyTaskGoal(
                          event.target.value === ""
                            ? ""
                            : event.target.valueAsNumber,
                        )
                      }
                      disabled={isSubmitting}
                      className="max-w-48"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comece com uma meta possível. Você poderá ajustá-la
                      depois.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  disabled={step === 1 || isSubmitting}
                >
                  <ArrowLeft /> Voltar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="animate-spin" /> Salvando
                      perfil...
                    </>
                  ) : step === 5 ? (
                    <>
                      Concluir e ir ao Dashboard <Check />
                    </>
                  ) : (
                    <>
                      Continuar <ArrowRight />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
