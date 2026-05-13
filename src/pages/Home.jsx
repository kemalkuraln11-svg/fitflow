import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, isToday, isTomorrow, parseISO, differenceInDays, parse, isBefore, isPast } from "date-fns";
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

  const { data: todayReservations = [] } = useQuery({
    queryKey: ["todayReservations", today],
    queryFn: () => base44.entities.Reservation.filter({ class_date: today, status: "confirmed" }),
  });

  const { data: todayVisits = [] } = useQuery({
    queryKey: ["todayVisits", today],
    queryFn: () => base44.entities.DailyVisit.filter({ visit_date: today }),
  });

  const getTodayCount = (classId) =>
    todayReservations.filter((r) => r.class_id === classId).length +
    todayVisits.filter((v) => v.class_id === classId).length;

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

  const membership = member?.status === "active" ? member : null;

  const daysLeft = membership
    ? Math.max(0, differenceInDays(parseISO(membership.end_date), new Date()))
    : 0;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["todayClasses"] }),
      queryClient.invalidateQueries({ queryKey: ["myReservations"] }),
      queryClient.invalidateQueries({ queryKey: ["myMembership"] }),
    ]);
  };

  return (
    <>
    <ExpiredMembershipModal />
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0"
          style={{ animation: "runningBob 0.5s ease-in-out infinite alternate" }}
        >
          {member?.gender === "female" ? "🏃‍♀️" : "🏃‍♂️"}
        </div>
        <div className="flex-1 pt-1">
          <p className="text-muted-foreground text-sm">Merhaba,</p>
          <h1 className="text-2xl font-bold">{member?.user_name
    ? member.user_name
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Üye"}</h1>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-8">
        {/* Membership Card */}
        {membership && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-2 -translate-x-2" />
            <div className="relative z-10">
              <p className="text-xs opacity-80 font-medium">{membership.plan_name || "Üyelik"}</p>
              <p className="text-4xl font-bold mt-2">{daysLeft}</p>
              <p className="text-xs opacity-70 mt-0.5">kalan süre</p>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs opacity-70">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{format(parseISO(membership.end_date), "d MMMM", { locale: tr })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Classes & Reservations */}
        <div className="space-y-6">
          {/* Today's Classes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Bugünkü Dersler</h2>
              <Link to="/calendar" className="text-primary text-xs font-medium flex items-center gap-0.5">
                Tümü <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayClasses.length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground">
                <Calendar className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-xs">Bugün ders bulunmuyor</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
            {todayClasses.map((cls) => {
              const classDateTime = parse(`${cls.date} ${cls.start_time}`, "yyyy-MM-dd HH:mm", new Date());
              const isPastClass = isPast(classDateTime);
              return (
              <Link key={cls.id} to={isPastClass ? undefined : `/class/${cls.id}`} className={isPastClass ? "pointer-events-none" : ""}>
                <Card className={`p-3 flex items-center gap-3 transition-all ${isPastClass ? "opacity-40" : "hover:shadow-lg active:scale-[0.98]"}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                    {categoryEmojis[cls.category] || "⭐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-snug">{cls.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {cls.start_time} - {cls.end_time}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        {getTodayCount(cls.id)}/{cls.capacity}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Card>
              </Link>
              );
            })}
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