import { Link, NavLink, Outlet } from "react-router";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-surface text-on-surface">
      <aside className="w-60 bg-surface-container-lowest border-r border-outline-variant/15 flex flex-col">
        <Link
          to="/"
          className="px-6 py-6 text-xl font-bold tracking-tighter text-primary font-['Space_Grotesk'] border-b border-outline-variant/10"
        >
          LET'S DO IT
          <div className="text-xs text-on-surface-variant font-normal mt-1 uppercase tracking-widest">
            Admin
          </div>
        </Link>
        <nav className="flex-grow flex flex-col p-3 gap-1">
          <SideLink to="/admin" end icon="dashboard">
            Overview
          </SideLink>
          <SideLink to="/admin/jobs" icon="work">
            Jobs
          </SideLink>
          <SideLink to="/admin/jobs/new" icon="add">
            New Job
          </SideLink>
          <SideLink to="/admin/companies" icon="domain">
            Companies
          </SideLink>
          <SideLink to="/admin/categories" icon="category">
            Categories
          </SideLink>
        </nav>
        <Link
          to="/"
          className="px-6 py-4 text-on-surface-variant text-sm flex items-center gap-2 hover:text-primary border-t border-outline-variant/10"
        >
          <Icon name="arrow_back" className="text-base" /> Back to site
        </Link>
      </aside>
      <main className="flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SideLink({
  to,
  end,
  icon,
  children,
}: {
  to: string;
  end?: boolean;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md font-label text-sm",
          isActive
            ? "bg-surface-container-high text-primary"
            : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
        )
      }
    >
      <Icon name={icon} className="text-base" />
      {children}
    </NavLink>
  );
}
