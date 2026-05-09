import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, isToday, isTomorrow, parseISO, differenceInDays, parse, isBefore } from "date-fns";
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
      const withUpdatedData = reservations
        .filter((r) => validClassIds.has(r.class_id))
        .map((r) => ({
          ...r,
          class_title: classData[r.class_id]?.title || r.class_title,
          class_time: classData[r.class_id]?.start_time || r.class_time,
        }));
      
      // Tarihi ve saati en yakındakı uzağa doğru sırala
      return withUpdatedData.sort((a, b) => {
        const aDateTime = parse(`${a.class_date} ${a.class_time}`, "yyyy-MM-dd HH:mm", new Date());
        const bDateTime = parse(`${b.class_date} ${b.class_time}`, "yyyy-MM-dd HH:mm", new Date());
        return isBefore(aDateTime, bDateTime) ? -1 : 1;
      }).slice(0, 5);
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
    <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-24">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold">Hoş geldiniz, {member?.user_name
    ? member.user_name
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Üye"}</h1>
        <p className="text-muted-foreground mt-2">Bugünün derslerine ve rezervasyonlarına hızlı erişim</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Membership Card - Left Sidebar */}
        {membership && (
          <div className="xl:col-span-1">
            <div className="sticky top-32 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-8 text-primary-foreground h-fit">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
              <div className="relative z-10">
                <p className="text-xs opacity-80 font-medium">{membership.plan_name || "Üyelik"}</p>
                <p className="text-4xl font-bold mt-4">{daysLeft}</p>
                <p className="text-sm opacity-70 mt-1">gün kalan</p>
                <div className="mt-5 pt-4 border-t border-white/20 flex items-center gap-2 text-xs opacity-70">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{format(parseISO(membership.end_date), "d MMM", { locale: tr })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classes & Reservations - Right Content */}
        <div className={membership ? "xl:col-span-3 space-y-8" : "xl:col-span-4 space-y-8"}>
          {/* Today's Classes */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Bugünkü Dersler</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayClasses.map((cls) => (
              <Link key={cls.id} to={`/class/${cls.id}`}>
                <Card className="p-5 flex flex-col gap-3 hover:shadow-lg transition-all active:scale-[0.98]">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                      {categoryEmojis[cls.category] || "⭐"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold leading-snug">{cls.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      {cls.start_time} - {cls.end_time}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      {cls.current_count || 0}/{cls.capacity} kişi
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
            )}
          </div>

          {/* My Upcoming Reservations */}
          <div>
            <ReservationsBottomSheet reservations={myReservations} />
          </div>
        </div>
      </div>
    </div>
    </PullToRefresh>
    </>
  );
}