import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Calendar, BookOpen, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AdminDashboard() {
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

  const activeMembers = members.filter((m) => m.status === "active").length;

  const stats = [
    { label: "Toplam Üye", value: members.length, icon: Users, color: "text-primary bg-primary/10" },
    { label: "Aktif Üye", value: activeMembers, icon: TrendingUp, color: "text-accent bg-accent/10" },
    { label: "Bugün Ders", value: todayClasses.length, icon: Calendar, color: "text-chart-3 bg-chart-3/10" },
    { label: "Bugün Rez.", value: todayReservations.length, icon: BookOpen, color: "text-chart-4 bg-chart-4/10" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Genel Bakış</h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Today's Classes with attendance */}
      <h3 className="font-semibold mb-3">Bugünkü Dersler</h3>
      {todayClasses.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Bugün ders yok
        </Card>
      ) : (
        <div className="space-y-2">
          {todayClasses.map((cls) => (
            <Card key={cls.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{cls.title}</p>
                <p className="text-sm text-muted-foreground">
                  {cls.start_time} - {cls.end_time}
                  {cls.instructor && ` • ${cls.instructor}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{cls.current_count || 0}/{cls.capacity}</p>
                <p className="text-xs text-muted-foreground">kişi</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}