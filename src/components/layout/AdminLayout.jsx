import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, LogOut, UserCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { to: "/admin", label: "Genel Bakış", icon: LayoutDashboard, end: true },
  { to: "/admin/classes", label: "Dersler", icon: Calendar },
  { to: "/admin/members", label: "Üyeler", icon: Users },
  { to: "/admin/daily-visits", label: "Günlük Girişler", icon: UserCheck },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { isLoadingAuth } = useAuth();

  const handleLogout = async () => {
    await base44.auth.logout("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">F</div>
          <span className="font-bold text-base">FitKafa-Kratos</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white font-bold">F</div>
            <span className="font-bold">FitKafa-Kratos</span>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-md hover:bg-muted">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}