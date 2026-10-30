import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function AdminGuestRoute() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
  return <Outlet />
}

export function AdminRoute() {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
