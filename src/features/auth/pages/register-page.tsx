import { LoaderCircle, UserPlus } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"

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

export function RegisterPage() {
  const {
    register,
    loginWithGoogle,
    isGoogleLoginEnabled,
    isSubmitting,
    error,
    clearError,
  } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    clearError()
  }, [clearError])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (name.trim().length < 2) {
      setValidationError("Informe um nome com pelo menos 2 caracteres.")
      return
    }
    if (password.length < 6) {
      setValidationError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setValidationError("As senhas informadas não coincidem.")
      return
    }

    await register(name, email, password)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Crie sua conta</CardTitle>
        <CardDescription>
          Comece a transformar sua produtividade em progressão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {(validationError || error) && (
            <FormMessage>{validationError ?? error ?? ""}</FormMessage>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">E-mail</Label>
            <Input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Senha</Label>
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              disabled={isSubmitting}
            />
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <UserPlus />
            )}
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        {isGoogleLoginEnabled && (
          <Button
            type="button"
            className="mt-3 w-full"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void loginWithGoogle()}
          >
            <span className="font-bold" aria-hidden="true">
              G
            </span>{" "}
            Cadastrar com Google
          </Button>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já possui uma conta?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
