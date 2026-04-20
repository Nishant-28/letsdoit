import { Outlet } from "react-router";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

export function SiteShell() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <TopNav />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
