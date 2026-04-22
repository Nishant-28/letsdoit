import { Outlet } from "react-router";
import { AppTopNav } from "./AppTopNav";
import { Footer } from "@/components/Footer";

/**
 * Shared layout for every signed-in surface (`/app`, `/profile`, `/admin`).
 * It mirrors the public `SiteShell` so the product feels like one system
 * instead of two detached experiences, but swaps the top nav and content
 * background for a Stripe-style dashboard chrome.
 */
export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <AppTopNav />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
