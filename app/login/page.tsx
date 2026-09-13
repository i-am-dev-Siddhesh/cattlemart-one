import { loginAction } from '@/lib/actions'
import { ActionForm, SubmitButton } from '@/components/feedback'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">C</span>
        <span className="text-sm font-semibold">Cattlemart One</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to your farm</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use the email and password for your account.</p>
      <ActionForm action={loginAction} ok="Signed in" className="surface mt-8 space-y-4 rounded-xl p-6">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full" pendingLabel="Signing in…">
          Continue
        </SubmitButton>
      </ActionForm>
    </main>
  )
}
