import { Bell, BellRing, LoaderCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useNotifications } from "@/features/notifications/hooks/use-notifications"
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_DESCRIPTIONS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationPreferences,
} from "@/features/notifications/types/notification"

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-primary" : "bg-secondary"
      } disabled:cursor-not-allowed disabled:opacity-50`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  )
}

export function NotificationPreferencesCard() {
  const { preferences } = useNotifications()
  return (
    <NotificationPreferencesForm
      key={JSON.stringify(preferences)}
      initialPreferences={preferences}
    />
  )
}

function NotificationPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: Required<NotificationPreferences>
}) {
  const {
    browserPermission,
    isSavingPreferences,
    error,
    savePreferences,
    requestBrowserPermission,
  } = useNotifications()
  const [draft, setDraft] =
    useState<Required<NotificationPreferences>>(initialPreferences)
  const [message, setMessage] = useState<string | null>(null)

  const changePush = async (enabled: boolean) => {
    setMessage(null)
    if (!enabled) {
      setDraft((current) => ({ ...current, push: false }))
      return
    }
    const permission = await requestBrowserPermission()
    if (permission !== "granted") {
      setMessage(
        permission === "unsupported"
          ? "Este navegador não oferece notificações nativas."
          : "A permissão do navegador não foi concedida.",
      )
      return
    }
    setDraft((current) => ({ ...current, push: true }))
  }

  const handleSave = async () => {
    setMessage(null)
    if (await savePreferences(draft)) {
      setMessage("Preferências salvas.")
    }
  }

  return (
    <Card id="notification-preferences">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-5 text-primary" /> Notificações
        </CardTitle>
        <CardDescription>
          Escolha o que é útil para você. IDs determinísticos evitam lembretes
          repetidos, e o navegador recebe no máximo três alertas em cinco
          minutos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">No TI Focus</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Registra novos itens no centro de notificações.
              </p>
            </div>
            <Toggle
              label="Notificações no TI Focus"
              checked={draft.inApp}
              onChange={(inApp) =>
                setDraft((current) => ({ ...current, inApp }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">No navegador</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Funciona enquanto o TI Focus estiver aberto.
              </p>
            </div>
            <Toggle
              label="Notificações do navegador"
              checked={draft.push}
              disabled={browserPermission === "unsupported"}
              onChange={(enabled) => void changePush(enabled)}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Tipos de notificação</h3>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {NOTIFICATION_TYPE_LABELS[type]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {NOTIFICATION_TYPE_DESCRIPTIONS[type]}
                  </p>
                </div>
                <Toggle
                  label={NOTIFICATION_TYPE_LABELS[type]}
                  checked={draft.types[type]}
                  onChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      types: { ...current.types, [type]: checked },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {(message || error) && (
          <p className="text-sm text-muted-foreground" role="status">
            {message ?? error}
          </p>
        )}
        <Button
          type="button"
          disabled={isSavingPreferences}
          onClick={() => void handleSave()}
        >
          {isSavingPreferences ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Bell />
          )}
          Salvar preferências
        </Button>
      </CardContent>
    </Card>
  )
}
