import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Clock, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReservationsBottomSheet from "@/components/ReservationsBottomSheet";

const categoryEmojis = {
  hyrox: "🏃",
  crossfit: "🔥",
  fitness: "🏋️",
  other: "⭐",
};

export default function Home() {
  const { member } = useMemberAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayClasses = [] } = useQuery({
    queryKey: ["todayClasses", today],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: today }, "start_time"),
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["myReservations", member?.id],
    queryFn: async () => {
      const reservations = await base44.entities.Reservation.filter(
        { user_email: member.user_email, status: "confirmed" },
        "-class_date",
        20
      );
      // Dersi hâlâ var olan rezervasyonları filtrele ve sınıf verilerini birleştir
      const classIds = [...new Set(reservations.map((r) => r.class_id))];
      const classData = {};
      
      const classChecks = await Promise.all(
        classIds.map((cid) => base44.entities.ClassSchedule.filter({ id: cid }))
      );
      
      classChecks.forEach((classes) => {
        if (classes.length > 0) {
          classData[classes[0].id] = classes[0];
        }
      });
      
      const validClassIds = new Set(Object.keys(classData));
      return reservations
        .filter((r) => validClassIds.has(r.class_id))
        .map((r) => ({
          ...r,
          class_title: classData[r.class_id]?.title || r.class_title,
          class_time: classData[r.class_id]?.start_time || r.class_time,
        }))
        .slice(0, 5);
    },
    enabled: !!member?.user_email,
  });

  const { data: membership } = useQuery({
    queryKey: ["myMembership", member?.id],
    queryFn: () => base44.entities.Membership.filter({ username: member.username, status: "active" }),
    enabled: !!member?.username,
    select: (data) => data?.[0],
  });

  const daysLeft = membership
    ? Math.max(0, differenceInDays(parseISO(membership.end_date), new Date()))
    : 0;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  return (
    <>
    <ExpiredMembershipModal />
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-sm">Merhaba,</p>
          <h1 className="text-2xl font-bold tracking-tight">{member?.user_name
    ? member.user_name
        .split(" ")
        .map(
          w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join(" ")
    : "Hoş Geldin"}</h1>
        </div>

      </div>

      {/* Membership Card */}
      {membership && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 mb-6 text-primary-foreground">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
          <p className="text-sm opacity-80 font-medium">{membership.plan_name || "Üyelik"}</p>
          <p className="text-3xl font-bold mt-1">{daysLeft} gün</p>
          <p className="text-sm opacity-70 mt-0.5">kalan süre</p>
          <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
            <Calendar className="w-3.5 h-3.5" />
            <span>Bitiş: {format(parseISO(membership.end_date), "d MMMM yyyy", { locale: tr })}</span>
          </div>
        </div>
      )}

      {/* Today's Classes */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Bugünkü Dersler</h2>
          <Link to="/calendar" className="text-primary text-sm font-medium flex items-center gap-0.5">
            Tümü <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {todayClasses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Bugün ders bulunmuyor</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((cls) => (
              <Link key={cls.id} to={`/class/${cls.id}`}>
                <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    {categoryEmojis[cls.category] || "⭐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{cls.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {cls.start_time} - {cls.end_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {cls.current_count || 0}/{cls.capacity}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* My Upcoming Reservations - Bottom Sheet */}
      <div className="mb-6">
        <ReservationsBottomSheet reservations={myReservations} />
      </div>
    </div>
    </PullToRefresh>
    </>
  );
}