import { ConvexProviderWithAuth } from "convex/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { convex } from "./lib/convex";
import { AuthProvider } from "./lib/auth";
import { useConvexAuthFromAuthKit } from "./lib/convexWithAuthKit";
import { Explore } from "./routes/Explore";
import { JobDetail } from "./routes/JobDetail";
import { Pricing } from "./routes/Pricing";
import { Tracker } from "./routes/Tracker";
import { Account } from "./routes/Account";
import { Login } from "./routes/Login";
import { Signup } from "./routes/Signup";
import { VerifyEmail } from "./routes/VerifyEmail";
import { ForgotPassword } from "./routes/ForgotPassword";
import { ResetPassword } from "./routes/ResetPassword";
import { Onboard } from "./routes/Onboard";
import { Logout } from "./routes/Logout";
import { AdminJobs } from "./routes/admin/AdminJobs";
import { AdminJobForm } from "./routes/admin/AdminJobForm";
import { AdminLayout } from "./routes/admin/AdminLayout";
import { AdminCompanies } from "./routes/admin/AdminCompanies";
import { AdminCompanyForm } from "./routes/admin/AdminCompanyForm";
import { AdminCategories } from "./routes/admin/AdminCategories";
import { AdminDashboard } from "./routes/admin/AdminDashboard";
import { SiteShell } from "./components/SiteShell";
import { RequireAuth } from "./components/RequireAuth";

export function App() {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromAuthKit}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteShell />}>
              <Route index element={<Explore />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="pricing" element={<Pricing />} />
              <Route
                path="tracker"
                element={
                  <RequireAuth>
                    <Tracker />
                  </RequireAuth>
                }
              />
              <Route
                path="account"
                element={
                  <RequireAuth>
                    <Account />
                  </RequireAuth>
                }
              />

              {/* Public auth flows */}
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />

              {/* Authenticated one-time onboarding */}
              <Route
                path="onboard"
                element={
                  <RequireAuth skipOnboardCheck>
                    <Onboard />
                  </RequireAuth>
                }
              />
              <Route path="logout" element={<Logout />} />
            </Route>
            <Route
              path="admin"
              element={
                <RequireAuth adminOnly>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="jobs/new" element={<AdminJobForm />} />
              <Route path="jobs/:id" element={<AdminJobForm />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="companies/new" element={<AdminCompanyForm />} />
              <Route path="companies/:id" element={<AdminCompanyForm />} />
              <Route path="categories" element={<AdminCategories />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConvexProviderWithAuth>
  );
}

export default App;
