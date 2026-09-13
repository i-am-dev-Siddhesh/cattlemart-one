import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { changePasswordAction, logoutAction, updateProfileAction } from '@/lib/actions'
import { ActionForm, SubmitButton } from '@/components/feedback'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return (parts.map((p) => p[0]).join('') || 'U').toUpperCase()
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="space-y-5">
      <PageHeader title="Your profile" hint="Name, email, and password for this login." />

      <Card className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#eeedff] text-lg font-bold text-primary">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user.role} · {user.organization.name}
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your email is what you sign in with.</p>
        <ActionForm
          ok="Profile saved"
          action={async (fd) => {
            'use server'
            await updateProfileAction({
              name: String(fd.get('name') ?? ''),
              email: String(fd.get('email') ?? ''),
            })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Full name">
            <Input name="name" required defaultValue={user.name} placeholder="Ramesh Patil" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required defaultValue={user.email} placeholder="you@farm.in" />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">At least 8 characters. You stay signed in after changing it.</p>
        <ActionForm
          ok="Password changed"
          action={async (fd) => {
            'use server'
            await changePasswordAction({
              currentPassword: String(fd.get('currentPassword') ?? ''),
              newPassword: String(fd.get('newPassword') ?? ''),
              confirmPassword: String(fd.get('confirmPassword') ?? ''),
            })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <Field label="Current password">
            <Input name="currentPassword" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <Input name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
          <Field label="Repeat new password">
            <Input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
          <div className="sm:col-span-3">
            <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign out of this device.</p>
        <ActionForm action={logoutAction} ok="Signed out" className="mt-4">
          <SubmitButton variant="outline" pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </ActionForm>
      </Card>
    </div>
  )
}
