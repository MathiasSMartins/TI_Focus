import {
  BriefcaseBusiness,
  Target,
  ListChecks,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  getAreaLabel,
  getPrimaryObjectiveLabel,
} from "@/features/profile/types/user-profile"

export function ProfilePage() {
  const { user, profile } = useAuth()
  const displayName = profile?.name ?? user?.displayName ?? "Profissional de TI"
  const avatar = profile?.avatar ?? user?.photoURL

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
            <Button className="mt-6 w-full" variant="outline" disabled>
              Edição de perfil em breve
            </Button>
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
