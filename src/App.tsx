import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminGuestRoute, AdminRoute, GuestRoute, ProtectedRoute } from './components/ProtectedRoute'
import { ToastViewport } from './components/Toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { ChatHistoryPage } from './pages/ChatHistoryPage'
import { ChatPage } from './pages/ChatPage'
import { DashboardPage } from './pages/DashboardPage'
import { DiseasePredictionPage } from './pages/DiseasePrediction'
import { EmergencyPage } from './pages/EmergencyPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HealthProfilePage } from './pages/HealthProfilePage'
import { ImageAnalysisPage } from './pages/ImageAnalysisPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NearbyCarePage } from './pages/NearbyCarePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportAnalysisPage } from './pages/ReportAnalysisPage'
import { RiskPredictionPage } from './pages/RiskPrediction'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SignupPage } from './pages/SignupPage'
import { AdminAppointmentsPage, AdminDashboardPage, AdminPredictionsPage, AdminReportsPage, AdminSmsPage, AdminSystemPage, AdminUsersPage } from './pages/admin/AdminPages'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ToastViewport />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/user/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>
              </Route>
              <Route element={<AdminGuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/admin/login" element={<LoginPage />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/disease-prediction" element={<DiseasePredictionPage />} />
                  <Route path="/risk-prediction" element={<RiskPredictionPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/chat/:chatId" element={<ChatPage />} />
                  <Route path="/chat-history" element={<ChatHistoryPage />} />
                  <Route path="/health-profile" element={<HealthProfilePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/report-analysis" element={<ReportAnalysisPage />} />
                  <Route path="/image-analysis" element={<ImageAnalysisPage />} />
                  <Route path="/appointments" element={<AppointmentsPage />} />
                  <Route path="/nearby-care" element={<NearbyCarePage />} />
                  <Route path="/emergency" element={<EmergencyPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                  <Route path="/admin/predictions" element={<AdminPredictionsPage />} />
                  <Route path="/admin/sms" element={<AdminSmsPage />} />
                  <Route path="/admin/system" element={<AdminSystemPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
