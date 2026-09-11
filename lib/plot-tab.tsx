import { format } from 'date-fns'
import { plotDetail } from '@/lib/queries'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'

export async function PlotRecords({
  farmId,
  plotId,
  tab,
}: {
  farmId: string
  plotId: string
  tab: string
}) {
  const { plot } = await plotDetail(farmId, plotId)
  if (tab === 'activities') {
    return plot.activities.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Work</Th>
              <Th className="text-right">Cost</Th>
            </tr>
          </thead>
          <tbody>
            {plot.activities.map((a) => (
              <tr key={a.id}>
                <Td>{format(a.date, 'd MMM yyyy')}</Td>
                <Td>
                  {a.type}
                  {a.description ? ` · ${a.description}` : ''}
                </Td>
                <Td className="num text-right">{inr(a.totalCost)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No activities" body="Log work from the dashboard. It posts to this plot automatically." />
    )
  }
  if (tab === 'expenses') {
    return plot.expenses.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Category</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {plot.expenses.map((e) => (
              <tr key={e.id}>
                <Td>{format(e.date, 'd MMM yyyy')}</Td>
                <Td>{e.category}</Td>
                <Td className="num text-right">{inr(e.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No expenses" body="Costs appear here when activities or expenses are saved." />
    )
  }
  if (tab === 'irrigation') {
    return plot.irrigations.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Method</Th>
              <Th className="text-right">Litres</Th>
            </tr>
          </thead>
          <tbody>
            {plot.irrigations.map((i) => (
              <tr key={i.id}>
                <Td>{format(i.date, 'd MMM yyyy')}</Td>
                <Td>{i.method ?? 'Irrigation'}</Td>
                <Td className="num text-right">{i.quantityL ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No irrigation records" body="Log water from the dashboard activity form." />
    )
  }
  if (tab === 'health') {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <h3 className="text-sm font-semibold">Observations</h3>
          {plot.observations.length ? (
            <Table className="mt-2">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {plot.observations.map((o) => (
                  <tr key={o.id}>
                    <Td>{format(o.date, 'd MMM')}</Td>
                    <Td>{o.note}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None stored.</p>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold">Pests</h3>
          {plot.pests.length ? (
            <Table className="mt-2">
              <thead>
                <tr>
                  <Th>Pest</Th>
                  <Th>Severity</Th>
                </tr>
              </thead>
              <tbody>
                {plot.pests.map((o) => (
                  <tr key={o.id}>
                    <Td>{o.pest}</Td>
                    <Td>{o.severity}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None stored.</p>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold">Diseases</h3>
          {plot.diseases.length ? (
            <Table className="mt-2">
              <thead>
                <tr>
                  <Th>Disease</Th>
                  <Th>Severity</Th>
                </tr>
              </thead>
              <tbody>
                {plot.diseases.map((o) => (
                  <tr key={o.id}>
                    <Td>{o.disease}</Td>
                    <Td>{o.severity}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None stored.</p>
          )}
        </Card>
      </div>
    )
  }
  if (tab === 'soil') {
    return plot.soilTests.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>pH</Th>
              <Th>OC</Th>
              <Th>N</Th>
              <Th>P</Th>
              <Th>K</Th>
              <Th>Lab</Th>
            </tr>
          </thead>
          <tbody>
            {plot.soilTests.map((s) => (
              <tr key={s.id}>
                <Td>{format(s.date, 'd MMM yyyy')}</Td>
                <Td className="num">{s.ph ?? '—'}</Td>
                <Td className="num">{s.oc ?? '—'}</Td>
                <Td className="num">{s.n ?? '—'}</Td>
                <Td className="num">{s.p ?? '—'}</Td>
                <Td className="num">{s.k ?? '—'}</Td>
                <Td>{s.lab}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No soil tests" body="Stored lab values only. Nothing is invented." />
    )
  }
  if (tab === 'labour') {
    return plot.labour.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th className="text-right">Workers</Th>
              <Th className="text-right">Cost</Th>
            </tr>
          </thead>
          <tbody>
            {plot.labour.map((l) => (
              <tr key={l.id}>
                <Td>{format(l.date, 'd MMM yyyy')}</Td>
                <Td className="num text-right">{l.workers}</Td>
                <Td className="num text-right">{inr(l.cost)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No labour records" body="Labour on activities writes here and to expenses." />
    )
  }
  if (tab === 'harvest') {
    return plot.harvests.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th className="text-right">Quantity</Th>
            </tr>
          </thead>
          <tbody>
            {plot.harvests.map((h) => (
              <tr key={h.id}>
                <Td>{format(h.date, 'd MMM yyyy')}</Td>
                <Td className="num text-right">
                  {h.quantity} {h.unit}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No harvests" body="Record quantity only when it is weighed." />
    )
  }
  if (tab === 'sales') {
    return plot.sales.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th className="text-right">Net</Th>
            </tr>
          </thead>
          <tbody>
            {plot.sales.map((s) => (
              <tr key={s.id}>
                <Td>{format(s.date, 'd MMM yyyy')}</Td>
                <Td>{s.paymentStatus}</Td>
                <Td className="num text-right">{inr(s.net)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No sales" body="Revenue appears after a sale is saved." />
    )
  }
  if (tab === 'history') {
    return plot.cycles.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Year</Th>
              <Th>Crop</Th>
              <Th>Months</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {plot.cycles.map((c) => (
              <tr key={c.id}>
                <Td>{c.year}</Td>
                <Td>{c.crop.name}</Td>
                <Td>{cyclePeriod(c)}</Td>
                <Td className="capitalize">{c.status}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No crop cycles" body="Plant a new cycle from the crop tab. History is never overwritten." />
    )
  }
  if (tab === 'documents') {
    return plot.documents.length ? (
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
            </tr>
          </thead>
          <tbody>
            {plot.documents.map((d) => (
              <tr key={d.id}>
                <Td>{d.title}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    ) : (
      <EmptyState title="No documents" body="Attach bills and soil reports when storage is configured." />
    )
  }
  if (tab === 'inputs') {
    return (
      <EmptyState
        title="Inputs follow activities"
        body="Fertilizer and protection applications are created from activities so inventory and expenses stay in one ledger."
      />
    )
  }
  return null
}
