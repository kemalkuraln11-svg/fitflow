import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInDays, parse, isBefore } from "date-fns";
import { tr } from "date-fns/locale";
import { Users, Calendar, LogOut, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import ReservationsBottomSheet from "@/components/ReservationsBottomSheet";


export default function Profile() {
  const { member, logout } = useMemberAuth();
  const { data: membership } = useQuery({
    queryKey: ["myMembership", member?.id],
    queryFn: () => base44.entities.Membership.filter({ username: member.username, status: "active" }),
    enabled: !!member?.username,
    select: (data) => data?.[0],
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["myAllReservations", member?.id],
    queryFn: async () => {
      const reservations = await base44.entities.Reservation.filter(
        { user_email: member.user_email, status: "confirmed" },
        "-class_date"
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
      });
    },
    enabled: !!member?.user_email,
  });

  const totalDays = membership
    ? differenceInDays(parseISO(membership.end_date), parseISO(membership.start_date))
    : 0;
  const daysLeft = membership
    ? Math.max(0, differenceInDays(parseISO(membership.end_date), new Date()))
    : 0;
  const progress = totalDays > 0 ? ((totalDays - daysLeft) / totalDays) * 100 : 0;



  return (
    <>
    <ExpiredMembershipModal />
    <div className="px-6 pt-6 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Profil</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-6">
          {/* User Info */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                {member?.gender === "female" ? "👩" : "👨"}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base truncate">
                  {member?.user_name
                    ? member.user_name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                    : "Kullanıcı"}
                </h2>
                <p className="text-xs text-muted-foreground truncate">@{member?.username}</p>
              </div>
            </div>
          </Card>

          {/* Membership Status */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-sm">Üyelik Durumu</h3>
            </div>

            {membership ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Plan</span>
                  <span className="font-medium">{membership.plan_name || "Standart"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Başlangıç</span>
                  <span className="font-medium text-xs">{format(parseISO(membership.start_date), "d MMM yyyy", { locale: tr })}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Bitiş</span>
                  <span className="font-medium text-xs">{format(parseISO(membership.end_date), "d MMM yyyy", { locale: tr })}</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Kalan süre</span>
                    <span className="font-bold text-primary">{daysLeft} gün</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>
            ) : (
              <div className="text-center py-3 text-muted-foreground">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Aktif üyelik yok</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="md:col-span-3 space-y-6">
          {/* Stats */}
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-4">İstatistikler</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <p className="text-3xl font-bold text-primary">{reservations.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Aktif Rezervasyon</p>
              </div>
              <div className="text-center p-4 bg-accent/10 rounded-lg">
                <p className="text-3xl font-bold text-accent">{daysLeft}</p>
                <p className="text-xs text-muted-foreground mt-1">Kalan Gün</p>
              </div>
            </div>
            <ReservationsBottomSheet reservations={reservations} />
          </Card>

          {/* Actions */}
          <Button
            variant="outline"
            className="w-full justify-center gap-2 h-11 text-destructive hover:text-destructive hover:bg-destructive/5"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Çıkış Yap</span>
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}