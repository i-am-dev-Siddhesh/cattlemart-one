'use client'

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error?.message || 'Please try again.'}</p>
    </main>
  )
}
