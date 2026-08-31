import { Bell, Database, Palette, Timer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isFirebaseConfigured } from "@/services/firebase"

const settingsGroups = [
  {
    icon: Palette,
    title: "Aparência",
    description: "Tema escuro ativo nesta fundação.",
  },
  {
    icon: Timer,
    title: "Pomodoro",
    description: "Configuração padrão: 25 / 5 / 15 minutos.",
  },
  {
    icon: Bell,
    title: "Notificações",
    description: "Preferências serão habilitadas em uma próxima fase.",
  },
]

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Configurações
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Base preparada para preferências pessoais, integrações e segurança.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {settingsGroups.map((group) => {
          const Icon = group.icon
          return (
            <Card key={group.title}>
              <CardContent className="p-5">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{group.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {group.description}
                </p>
                <Button className="mt-5" size="sm" variant="outline">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5 text-primary" /> Firebase
            </CardTitle>
            <CardDescription className="mt-1.5">
              A inicialização é segura e só ocorre quando as variáveis
              obrigatórias estão presentes.
            </CardDescription>
          </div>
          <Badge variant={isFirebaseConfigured ? "success" : "outline"}>
            {isFirebaseConfigured ? "Configurado" : "Aguardando ambiente"}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Copie{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">
              .env.example
            </code>{" "}
            para
            <code className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-foreground">
              .env.local
            </code>{" "}
            e informe as credenciais públicas do seu projeto Firebase.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
