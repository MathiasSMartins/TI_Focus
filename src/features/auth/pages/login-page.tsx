import { LoaderCircle, LogIn } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"

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
import { useAuth } from "@/features/auth/hooks/use-auth"

interface LoginLocationState {
  passwordReset?: boolean
}

export function LoginPage() {
  const {
    login,
    loginWithGoogle,
    isGoogleLoginEnabled,
    isSubmitting,
    error,
    clearError,
  } = useAuth()
  const location = useLocation()
  const state = location.state as LoginLocationState | null
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    clearError()
  }, [clearError])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await login(email, password)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Acesse seu workspace</CardTitle>
        <CardDescription>
          Entre para continuar sua progressão profissional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {state?.passwordReset && (
            <FormMessage variant="success">
              Enviamos as instruções de recuperação, caso o e-mail esteja
              cadastrado.
            </FormMessage>
          )}
          {error && <FormMessage>{error}</FormMessage>}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Senha</Label>
              <Link
                to="/recuperar-senha"
                className="text-xs font-medium text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <LogIn />
            )}
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        {isGoogleLoginEnabled && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou continue com
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              className="w-full"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => void loginWithGoogle()}
            >
              <span className="font-bold" aria-hidden="true">
                G
              </span>{" "}
              Google
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não possui uma conta?{" "}
          <Link
            to="/cadastro"
            className="font-medium text-primary hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
