import { Activity, BarChart3, FileText, LayoutDashboard, LogOut, Menu, MessageSquareText, ShieldCheck, Users, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button, Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils'

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/predictions', label: 'ML Predictions', icon: BarChart3 },
  { to: '/admin/sms', label: 'SMS & Reminders', icon: MessageSquareText },
  { to: '/admin/system', label: 'System', icon: Activity },
]

function AdminNav({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  return <aside className="flex h-full w-[256px] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div className="px-5 py-5"><Logo to="/admin" /><p className="mt-2 text-xs font-bold tracking-[0.18em] text-violet-700 dark:text-violet-300">ADMIN PANEL</p></div>
    <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
      {items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/admin'} onClick={onNavigate} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900')}><Icon className="h-4 w-4" />{label}</NavLink>)}
    </nav>
    <div className="space-y-1 p-3">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"><ShieldCheck className="h-4 w-4" />Back to User App</Link>
      <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-950/40"><LogOut className="h-4 w-4" />Logout</button>
    </div>
  </aside>
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const onLogout = () => { logout(); navigate('/login') }
  return <div className="flex min-h-svh bg-slate-50 dark:bg-slate-950">
    <div className="hidden lg:block"><AdminNav onLogout={onLogout} /></div>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Close admin menu" onClick={() => setOpen(false)} /><div className="relative h-full w-[256px]"><AdminNav onLogout={onLogout} onNavigate={() => setOpen(false)} /></div></div>}
    <div className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open admin navigation" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Administration</span></div><span className="text-sm text-slate-500">{user?.name}</span></header><main className="flex-1 overflow-auto p-4 sm:p-6"><div className="page-enter mx-auto max-w-7xl"><Outlet /></div></main></div>
  </div>
}
