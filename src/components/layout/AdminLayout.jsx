import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarPlus, Users, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { path: "/admin", icon: LayoutDashboard, label: "Panel" },
  { path: "/admin/classes", icon: CalendarPlus, label: "Dersler" },
  { path: "/admin/members", icon: Users, label: "Üyeler" },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-lg">Admin Panel</h1>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="sticky top-14 z-40 bg-card/60 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {adminLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}