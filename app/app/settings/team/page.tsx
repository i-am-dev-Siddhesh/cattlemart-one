import { prisma } from '@/lib/prisma'
import { currentFarm } from '@/lib/context'
import { Card } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'

export default async function TeamPage() {
  const ctx = await currentFarm()
  const users = ctx
    ? await prisma.user.findMany({ where: { organizationId: ctx.session.user.organizationId } })
    : []
  return (
    <div className="space-y-4">
      <PageHeader title="Team" />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.role}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
