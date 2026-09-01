import {
  BriefcaseBusiness,
  CheckCircle2,
  ListChecks,
  LoaderCircle,
  Mail,
  MapPin,
  ShieldCheck,
  Target,
} from "lucide-react"
import { useState, type FormEvent } from "react"

import { AreaIcon } from "@/components/area-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  IT_AREAS,
  IT_AREA_CONFIG,
  type ITAreaId,
} from "@/config/it-area-config"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/features/auth"
import { XpProgress } from "@/features/gamification"
import { UserAvatar } from "@/features/profile/components/user-avatar"
import { updateUserAreas } from "@/features/profile/services/user-profile-repository"
import {
  getAreaLabel,
  getPrimaryObjectiveLabel,
} from "@/features/profile/types/user-profile"

const MAX_SECONDARY_AREAS = 5

type AreaSaveStatus = "idle" | "saving" | "error" | "success"

export function ProfilePage() {
  const { user, profile } = useAuth()
  const displayName = profile?.name ?? user?.displayName ?? "Profissional de TI"
  const avatar = profile?.avatar ?? user?.photoURL
  const [isEditingAreas, setIsEditingAreas] = useState(false)
  const [primaryArea, setPrimaryArea] = useState<ITAreaId | "">(
    profile?.primaryArea ?? "",
  )
  const [secondaryAreas, setSecondaryAreas] = useState<ITAreaId[]>(
    profile?.secondaryAreas ?? [],
  )
  const [saveStatus, setSaveStatus] = useState<AreaSaveStatus>("idle")
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  function toggleAreaEditing() {
    if (isEditingAreas) {
      setPrimaryArea(profile?.primaryArea ?? "")
      setSecondaryAreas(profile?.secondaryAreas ?? [])
      setSaveStatus("idle")
      setSaveMessage(null)
      setIsEditingAreas(false)
      return
    }

    setPrimaryArea(profile?.primaryArea ?? "")
    setSecondaryAreas(profile?.secondaryAreas ?? [])
    setSaveStatus("idle")
    setSaveMessage(null)
    setIsEditingAreas(true)
  }

  function selectPrimaryArea(areaId: ITAreaId) {
    setPrimaryArea(areaId)
    setSecondaryAreas((current) => current.filter((area) => area !== areaId))
  }

  function toggleSecondaryArea(areaId: ITAreaId) {
    setSecondaryAreas((current) =>
      current.includes(areaId)
        ? current.filter((area) => area !== areaId)
        : current.length < MAX_SECONDARY_AREAS
          ? [...current, areaId]
          : current,
    )
  }

  async function handleAreaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !primaryArea) {
      setSaveStatus("error")
      setSaveMessage("Selecione uma área principal válida.")
      return
    }

    setSaveStatus("saving")
    setSaveMessage(null)
    try {
      await updateUserAreas(user.uid, primaryArea, secondaryAreas)
      setSaveStatus("success")
      setSaveMessage("Áreas profissionais atualizadas com sucesso.")
      setIsEditingAreas(false)
    } catch (error) {
      setSaveStatus("error")
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar as áreas profissionais.",
      )
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Perfil profissional
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua identidade personaliza categorias, metas e conquistas.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <UserAvatar avatar={avatar} name={displayName} size="lg" />
            <h3 className="mt-4 text-xl font-semibold">{displayName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {getAreaLabel(profile?.primaryArea ?? null)}
            </p>
            <Badge className="mt-4">
              Nível {String(profile?.level ?? 1).padStart(2, "0")}
            </Badge>
            <XpProgress
              totalXp={profile?.xp ?? 0}
              className="mt-5 w-full text-left"
            />
            <Button
              className="mt-6 w-full"
              variant="outline"
              type="button"
              onClick={toggleAreaEditing}
              disabled={!user || saveStatus === "saving"}
              aria-expanded={isEditingAreas}
              aria-controls="professional-areas-editor"
            >
              {isEditingAreas
                ? "Cancelar edição"
                : "Editar áreas profissionais"}
            </Button>
            {saveStatus === "success" && saveMessage && (
              <p className="mt-3 text-sm text-emerald-500" role="status">
                {saveMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações profissionais</CardTitle>
            <CardDescription>
              Dados protegidos da sua conta e personalização.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoItem
              icon={Mail}
              label="E-mail"
              value={profile?.email ?? user?.email ?? "Não informado"}
            />
            <InfoItem
              icon={BriefcaseBusiness}
              label="Área principal"
              value={getAreaLabel(profile?.primaryArea ?? null)}
            />
            <InfoItem
              icon={Target}
              label="Objetivo principal"
              value={getPrimaryObjectiveLabel(
                profile?.primaryObjective ?? null,
              )}
            />
            <InfoItem
              icon={ListChecks}
              label="Meta diária"
              value={
                profile?.dailyTaskGoal
                  ? `${profile.dailyTaskGoal} tarefas por dia`
                  : "A definir"
              }
            />
            <InfoItem
              icon={MapPin}
              label="Fuso horário"
              value={profile?.settings.timezone ?? "Não informado"}
            />
            <InfoItem
              icon={ShieldCheck}
              label="Conta"
              value="Protegida pelo Firebase Auth"
            />
          </CardContent>
        </Card>
      </div>

      {isEditingAreas && (
        <Card id="professional-areas-editor">
          <CardHeader>
            <CardTitle>Editar áreas profissionais</CardTitle>
            <CardDescription>
              Escolha uma área principal e até {MAX_SECONDARY_AREAS} áreas
              secundárias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleAreaSubmit}>
              <p
                id="areas-preservation-note"
                className="rounded-lg border border-border bg-background/35 p-3 text-sm text-muted-foreground"
              >
                Esta alteração personaliza novas sugestões. Tarefas, metas,
                estatísticas e conquistas já registradas serão preservadas.
              </p>

              <fieldset aria-describedby="areas-preservation-note">
                <legend className="text-sm font-medium">Área principal</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {IT_AREAS.map((area) => {
                    const selected = primaryArea === area.id
                    const areaConfig = IT_AREA_CONFIG[area.id]
                    return (
                      <button
                        key={area.id}
                        type="button"
                        className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                            : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                        }`}
                        aria-pressed={selected}
                        onClick={() => selectPrimaryArea(area.id)}
                        disabled={saveStatus === "saving"}
                      >
                        <AreaIcon
                          icon={areaConfig.icon}
                          className="mt-0.5 size-5 shrink-0"
                        />
                        <span className="min-w-0 text-sm font-medium">
                          {area.label}
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

              <fieldset>
                <legend className="text-sm font-medium">
                  Áreas secundárias
                </legend>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Opcionais, únicas e sempre diferentes da área principal.
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {secondaryAreas.length}/{MAX_SECONDARY_AREAS}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {IT_AREAS.filter((area) => area.id !== primaryArea).map(
                    (area) => {
                      const selected = secondaryAreas.includes(area.id)
                      const disabled =
                        saveStatus === "saving" ||
                        (!selected &&
                          secondaryAreas.length >= MAX_SECONDARY_AREAS)
                      return (
                        <label
                          key={area.id}
                          className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background"
                          } ${
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer hover:bg-accent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 size-4 accent-[var(--primary)]"
                            checked={selected}
                            onChange={() => toggleSecondaryArea(area.id)}
                            disabled={disabled}
                          />
                          <AreaIcon
                            icon={IT_AREA_CONFIG[area.id].icon}
                            className="mt-0.5 size-5 shrink-0"
                          />
                          <span className="font-medium">{area.label}</span>
                        </label>
                      )
                    },
                  )}
                </div>
              </fieldset>

              {saveStatus === "error" && saveMessage && (
                <p className="text-sm text-destructive" role="alert">
                  {saveMessage}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleAreaEditing}
                  disabled={saveStatus === "saving"}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveStatus === "saving"}>
                  {saveStatus === "saving" && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {saveStatus === "saving" ? "Salvando..." : "Salvar áreas"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface InfoItemProps {
  icon: typeof Mail
  label: string
  value: string
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="rounded-lg border border-border bg-background/35 p-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
