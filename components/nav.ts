import {
  LayoutDashboard,
  Map,
  Rows3,
  ListChecks,
  Sprout,
  IndianRupee,
  CalendarDays,
  CloudSun,
  BarChart3,
} from 'lucide-react'

export const nav = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/map', label: 'Farm map', icon: Map },
  { href: '/app/weather', label: 'Weather', icon: CloudSun },
  { href: '/app/plots', label: 'Plots', icon: Rows3 },
  { href: '/app/activities', label: 'Activities', icon: ListChecks },
  { href: '/app/cycles', label: 'Crops', icon: Sprout },
  { href: '/app/expenses', label: 'Finance', icon: IndianRupee },
  { href: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/app/reports', label: 'Reports', icon: BarChart3 },
]
