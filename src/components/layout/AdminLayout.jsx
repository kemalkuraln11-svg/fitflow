import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarPlus, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const adminLinks = [
  { path: "/admin", icon: LayoutDashboard, label: "Genel Bakış" },
  { path: "/admin/classes", icon: CalendarPlus, label: "Dersler" },
  { path: "/admin/members", icon: Users, label: "Üyeler" },
];

function AdminGuard({ children }) {
  const { user, isLoadingAuth, isLoadingPublicSettings, navigateToLogin } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigateToLogin();
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erişim Reddedildi</h1>
          <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="w-64 flex-col border-r border-border bg-secondary flex sticky top-0 h-screen shrink-0">
          {/* Brand */}
          <div className="px-6 py-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <img
                src="https://media.base44.com/images/public/69ff298a8db8d1511d286b61/2bf5548a7_ChatGPTImage9May202623_29_58.png"
                alt="FitKafa"
                className="w-9 h-9 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-sm text-secondary-foreground leading-none">FitKafa Hyrox</p>
                <p className="text-xs text-secondary-foreground/50 mt-0.5">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-5 space-y-1">
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
                      : "text-secondary-foreground/60 hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-border/30">
            {user && (
              <div className="px-3 py-2 mb-2">
                <p className="text-xs font-medium text-secondary-foreground/80 truncate">{user.full_name}</p>
                <p className="text-xs text-secondary-foreground/40 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all w-full"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}