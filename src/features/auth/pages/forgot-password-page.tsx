import { ArrowLeft, LoaderCircle, Mail } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"

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

export function ForgotPasswordPage() {
  const { resetPassword, isSubmitting, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")

  useEffect(() => {
    clearError()
  }, [clearError])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const success = await resetPassword(email)
    if (success) {
      navigate("/login", { replace: true, state: { passwordReset: true } })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Recuperar senha</CardTitle>
        <CardDescription>
          Enviaremos instruções para redefinir sua senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <FormMessage>{error}</FormMessage>}
          <div className="space-y-2">
            <Label htmlFor="recovery-email">E-mail</Label>
            <Input
              id="recovery-email"
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
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Mail />
            )}
            {isSubmitting ? "Enviando..." : "Enviar instruções"}
          </Button>
        </form>

        <Button asChild className="mt-4 w-full" variant="ghost">
          <Link to="/login">
            <ArrowLeft /> Voltar para o login
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
