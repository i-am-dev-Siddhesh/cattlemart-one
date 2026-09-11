import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { t } from '../i18n'
import { useFarmStore } from '../store'

const links = [
  ['/', t('nav.dashboard')],
  ['/map', t('nav.map')],
  ['/plots', t('nav.plots')],
  ['/assistant', t('nav.assistant')],
  ['/ops', t('nav.ops')],
  ['/activities', t('nav.activities')],
  ['/crops', t('nav.crops')],
  ['/finance', t('nav.finance')],
  ['/calendar', t('nav.calendar')],
  ['/compare', t('nav.compare')],
  ['/reports', t('nav.reports')],
  ['/settings', t('nav.settings')],
] as const

function Side({ onNavigate }: { onNavigate?: () => void }) {
  const user = useFarmStore((s) => s.user)
  const farm = useFarmStore((s) => s.farms.find((f) => f.id === s.activeFarmId))
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>{t('appName')}</h1>
        <p>{t('appTag')}</p>
      </div>
      <nav className="nav">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="farmer-chip">
        <strong>{user.name}</strong>
        <span>{farm?.name || 'No farm yet'}</span>
      </div>
    </aside>
  )
}

export function Layout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="app-shell">
      <Side />
      <div className={`overlay-nav ${open ? 'open' : ''}`} onClick={() => setOpen(false)} hidden={!open}>
        <div onClick={(e) => e.stopPropagation()}>
          <Side onNavigate={() => setOpen(false)} />
        </div>
      </div>
      <main className="main">
        <button type="button" className="btn secondary small menu-btn" onClick={() => setOpen(true)}>
          Menu
        </button>
        <Outlet />
      </main>
    </div>
  )
}
