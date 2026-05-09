import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarPlus, Users, Dumbbell, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const adminLinks = [
  { path: "/admin", icon: LayoutDashboard, label: "Genel Bakış" },
  { path: "/admin/classes", icon: CalendarPlus, label: "Dersler" },
  { path: "/admin/members", icon: Users, label: "Üyeler" },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Admin Panel</p>
              <p className="text-xs text-muted-foreground mt-0.5">Yönetim</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold">Admin Panel</span>
        </div>
        {/* Mobile tab bar */}
        <div className="flex border-t border-border overflow-x-auto">
          {adminLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                )}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 mt-24 md:mt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}