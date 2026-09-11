import { loginAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">F</span>
        <span className="text-sm font-semibold">FarmOS</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to your farm</h1>
      <p className="mt-1 text-sm text-muted-foreground">Demo login is prefilled. You can change it later.</p>
      <form action={loginAction} className="surface mt-8 space-y-4 rounded-xl p-6">
        <Field label="Email">
          <Input name="email" type="email" defaultValue="ramesh@greenvalley.farm" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" defaultValue="farmos-demo" required />
        </Field>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </main>
  )
}
