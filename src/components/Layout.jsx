import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, UserCheck, StickyNote, MessageSquare, Menu, LogOut, Sun, Moon, CalendarDays, Table, Plane, Network, CalendarHeart } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../lib/theme";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/candidates", label: "Hiring Pipeline", icon: UserCheck },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/org-chart", label: "Org Chart", icon: Network },
  { to: "/calendar", label: "Interview Calendar", icon: CalendarDays },
  { to: "/leave-requests", label: "Leave Requests", icon: Plane },
  { to: "/holidays", label: "Holidays", icon: CalendarHeart },
  { to: "/notes", label: "HR Notes", icon: StickyNote },
  { to: "/sheets", label: "Sheets", icon: Table },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useTheme();
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("hr_token");
    navigate("/login");
  }

  return (
    <div className="h-full flex">
      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed md:static z-30 h-full w-64 bg-card border-r border-border flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="px-5 py-5 border-b border-border">
          <div className="font-bold text-lg text-primary">HR Suite</div>
          <div className="text-xs text-muted-foreground">AI-powered HR platform</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setDark((d) => !d)}
            className="w-full flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-md hover:bg-accent transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive px-4 py-2 rounded-md hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-primary">HR Suite</span>
        </header>
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
