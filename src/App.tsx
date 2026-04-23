import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { convex } from "./lib/convex";
import { usePageView, useIdentifyUser } from "./lib/posthog";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Explore } from "./routes/Explore";
import { JobDetail } from "./routes/JobDetail";
import { Pricing } from "./routes/Pricing";
import { PaymentReturn } from "./routes/PaymentReturn";
import { Billing } from "./routes/Billing";
import { SiteShell } from "./components/SiteShell";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireAdmin } from "./components/auth/RequireAdmin";
import { Login } from "./routes/Login";
import { Signup } from "./routes/Signup";
import { Callback } from "./routes/Callback";
import { Onboarding } from "./routes/Onboarding";
import { Profile } from "./routes/Profile";
import { AppHome } from "./routes/AppHome";
import { AdminDashboard } from "./routes/admin/AdminDashboard";
import { AdminJobs } from "./routes/admin/AdminJobs";
import { AdminJobForm } from "./routes/admin/AdminJobForm";
import { AdminCompanies } from "./routes/admin/AdminCompanies";
import { AdminCompanyForm } from "./routes/admin/AdminCompanyForm";
import { AdminCategories } from "./routes/admin/AdminCategories";
import { AdminUsers } from "./routes/admin/AdminUsers";
import { AdminPayments } from "./routes/admin/AdminPayments";

const WORKOS_CLIENT_ID = process.env.VITE_WORKOS_CLIENT_ID ?? "";
const WORKOS_REDIRECT_URI = process.env.VITE_WORKOS_REDIRECT_URI ?? "";

if (!WORKOS_CLIENT_ID || !WORKOS_REDIRECT_URI) {
  throw new Error(
    "Missing WorkOS environment variables. Check .env.local and restart.",
  );
}

function PageViewTracker() {
  usePageView();
  return null;
}

function UserTracker() {
  const me = useQuery(api.users.me);
  useIdentifyUser(me);
  return null;
}

export function App() {
  return (
    <AuthKitProvider
      clientId={WORKOS_CLIENT_ID}
      redirectUri={WORKOS_REDIRECT_URI}
      devMode={process.env.NODE_ENV !== "production"}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <PageViewTracker />
          <UserTracker />
          <Routes>
            {/* Auth handoff pages - no chrome, they own the viewport. */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/callback" element={<Callback />} />

            {/* First-run onboarding lives outside the dashboard shell
                so it can feel like a dedicated setup experience. */}
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />

            {/* Everything else shares the unified SiteShell. */}
            <Route element={<SiteShell />}>
              <Route index element={<Explore />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="pricing" element={<Pricing />} />

              {/* Payment landing page — users hit this after PayU
                  checkout. Public because the user may not have fully
                  resumed their session yet after redirect. */}
              <Route path="payment/return" element={<PaymentReturn />} />

              {/* Authenticated routes */}
              <Route
                path="app"
                element={
                  <RequireAuth>
                    <AppHome />
                  </RequireAuth>
                }
              />
              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="billing"
                element={
                  <RequireAuth>
                    <Billing />
                  </RequireAuth>
                }
              />

              {/* Admin routes */}
              <Route
                path="admin"
                element={
                  <RequireAdmin>
                    <AdminDashboard />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/jobs"
                element={
                  <RequireAdmin>
                    <AdminJobs />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/jobs/new"
                element={
                  <RequireAdmin>
                    <AdminJobForm />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/jobs/:id/edit"
                element={
                  <RequireAdmin>
                    <AdminJobForm />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/companies"
                element={
                  <RequireAdmin>
                    <AdminCompanies />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/companies/new"
                element={
                  <RequireAdmin>
                    <AdminCompanyForm />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/companies/:id/edit"
                element={
                  <RequireAdmin>
                    <AdminCompanyForm />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/categories"
                element={
                  <RequireAdmin>
                    <AdminCategories />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/users"
                element={
                  <RequireAdmin>
                    <AdminUsers />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/payments"
                element={
                  <RequireAdmin>
                    <AdminPayments />
                  </RequireAdmin>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  );
}

export default App;
