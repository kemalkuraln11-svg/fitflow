import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Calendar, BookOpen, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: members = [] } = useQuery({
    queryKey: ["allMembers"],
    queryFn: () => base44.entities.Membership.list("-created_date"),
  });

  const { data: todayClasses = [] } = useQuery({
    queryKey: ["adminTodayClasses", today],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: today }),
  });

  const { data: todayReservations = [] } = useQuery({
    queryKey: ["adminTodayRes", today],
    queryFn: () => base44.entities.Reservation.filter({ class_date: today, status: "confirmed" }),
  });

  const { data: todayVisits = [] } = useQuery({
    queryKey: ["adminTodayVisits", today],
    queryFn: () => base44.entities.DailyVisit.filter({ visit_date: today }),
  });

  const activeMembers = members.filter((m) => m.status === "active").length;
  const totalTodayAttendees = todayReservations.length + todayVisits.length;

  const stats = [
    { label: "Toplam Üye", value: members.length, icon: Users, color: "text-primary bg-primary/10", href: "/admin/members" },
    { label: "Aktif Üye", value: activeMembers, icon: TrendingUp, color: "text-accent bg-accent/10", href: "/admin/members" },
    { label: "Bugün Ders", value: todayClasses.length, icon: Calendar, color: "text-chart-3 bg-chart-3/10", href: "/admin/classes" },
    { label: "Bugün Rez.", value: totalTodayAttendees, icon: BookOpen, color: "text-chart-4 bg-chart-4/10", href: "/admin/daily-visits" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-6">Genel Bakış</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="p-5 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => navigate(stat.href)}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Today's Classes with attendance */}
      <div>
        <h3 className="font-semibold text-lg mb-4">Bugünkü Dersler</h3>
        {todayClasses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            Bugün ders yok
          </Card>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((cls) => (
              <Card key={cls.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{cls.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {cls.start_time} - {cls.end_time}
                    {cls.instructor && ` • ${cls.instructor}`}
                  </p>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  {(() => {
                    const rezCount = todayReservations.filter(r => r.class_id === cls.id).length;
                    const visitCount = todayVisits.filter(v => v.class_id === cls.id).length;
                    const total = rezCount + visitCount;
                    const parts = [];
                    if (rezCount > 0) parts.push(`${rezCount} rez.`);
                    if (visitCount > 0) parts.push(`${visitCount} günlük`);
                    return (
                      <>
                        <p className="font-bold text-primary">{total}/{cls.capacity}</p>
                        <p className="text-xs text-muted-foreground">
                          {parts.length > 0 ? parts.join(" + ") : "kişi yok"}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}