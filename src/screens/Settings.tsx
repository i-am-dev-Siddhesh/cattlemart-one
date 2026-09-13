import { FarmForm } from '../components/forms'
import { Button, Field } from '../components/ui'
import { useFarmStore } from '../store'

export function SettingsPage() {
  const user = useFarmStore((s) => s.user)
  const farms = useFarmStore((s) => s.farms)
  const settings = useFarmStore((s) => s.settings)
  const setUser = useFarmStore((s) => s.setUser)
  const setSettings = useFarmStore((s) => s.setSettings)
  const setActiveFarm = useFarmStore((s) => s.setActiveFarm)
  const activeFarmId = useFarmStore((s) => s.activeFarmId)
  const resetDemo = useFarmStore((s) => s.resetDemo)
  const clearAll = useFarmStore((s) => s.clearAll)
  const addType = useFarmStore((s) => s.addActivityType)
  const types = useFarmStore((s) => s.activityTypes)

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Settings</h2>
          <p className="lede">
            English UI. Farmers may still type Hindi, Marathi, Tamil and other wording into the diary and Cattlemart One AI.
            Structured fields stay English keys.
          </p>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>Farmer</h3>
          <Field label="Name">
            <input value={user.name} onChange={(e) => setUser({ name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input value={user.phone} onChange={(e) => setUser({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input value={user.email} onChange={(e) => setUser({ email: e.target.value })} />
          </Field>
          <Field label="Village / contact">
            <input value={user.village} onChange={(e) => setUser({ village: e.target.value })} />
          </Field>
        </div>
        <div className="card">
          <h3>Units & language</h3>
          <Field label="Interface language">
            <select value={settings.locale} onChange={(e) => setSettings({ locale: e.target.value as 'en' })}>
              <option value="en">English</option>
              <option disabled>हिन्दी (soon)</option>
              <option disabled>தமிழ் (soon)</option>
              <option disabled>తెలుగు (soon)</option>
              <option disabled>ಕನ್ನಡ (soon)</option>
              <option disabled>മലയാളം (soon)</option>
              <option disabled>मराठी (soon)</option>
            </select>
          </Field>
          <Field label="Default area unit">
            <select
              value={settings.defaultAreaUnit}
              onChange={(e) => setSettings({ defaultAreaUnit: e.target.value as typeof settings.defaultAreaUnit })}
            >
              <option value="acre">Acre</option>
              <option value="hectare">Hectare</option>
              <option value="cent">Cent</option>
              <option value="guntha">Guntha</option>
              <option value="sqft">Square feet</option>
              <option value="sqm">Square metre</option>
            </select>
          </Field>
          <Field label="Seat (local notebook — not a login wall)">
            <select
              value={settings.role}
              onChange={(e) => setSettings({ role: e.target.value as typeof settings.role })}
            >
              <option value="owner">Owner</option>
              <option value="manager">Farm manager</option>
              <option value="agronomist">Agronomist</option>
              <option value="worker">Field worker</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
            </select>
          </Field>
          <Field label="Default yield unit">
            <select
              value={settings.defaultYieldUnit}
              onChange={(e) => setSettings({ defaultYieldUnit: e.target.value as typeof settings.defaultYieldUnit })}
            >
              <option value="kg">Kg</option>
              <option value="quintal">Quintal</option>
              <option value="ton">Ton</option>
              <option value="bag">Bags</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Farms</h3>
          <Field label="Active farm">
            <select value={activeFarmId || ''} onChange={(e) => setActiveFarm(e.target.value)}>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <FarmForm onDone={() => undefined} />
        </div>
        <div className="card">
          <h3>Custom activity types</h3>
          <ul>
            {types.filter((t) => t.isCustom).map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
          <Button
            kind="ghost"
            onClick={() => {
              const name = window.prompt('New activity type')
              if (name?.trim()) addType(name.trim())
            }}
          >
            Add activity type
          </Button>
          <h3 style={{ marginTop: 24 }}>Data</h3>
          <div className="row">
            <Button kind="secondary" onClick={() => resetDemo()}>
              Reload demo farm
            </Button>
            <Button
              kind="danger"
              onClick={() => {
                if (window.confirm('Clear all farms and books on this device?')) clearAll()
              }}
            >
              Clear this device
            </Button>
          </div>
          <p className="lede">
            Weather, satellite, GPS tracks, IoT, inventory, labour gangs, and crop advice can plug into this same farm →
            plot → cycle model later.
          </p>
        </div>
      </div>
    </div>
  )
}
