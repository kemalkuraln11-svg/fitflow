import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { User, Calendar, LogOut, Clock } from "lucide-react";
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
      return reservations
        .filter((r) => validClassIds.has(r.class_id))
        .map((r) => ({
          ...r,
          class_title: classData[r.class_id]?.title || r.class_title,
          class_time: classData[r.class_id]?.start_time || r.class_time,
        }));
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
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Profil</h1>

      {/* User Info */}
      <Card className="p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">
              {member?.user_name
                ? member.user_name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                : "Kullanıcı"}
            </h2>
            <p className="text-sm text-muted-foreground">@{member?.username}</p>
          </div>
        </div>
      </Card>

      {/* Membership Status */}
      <Card className="p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Üyelik Durumu</h3>
        </div>

        {membership ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-medium">{membership.plan_name || "Standart"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Başlangıç</span>
              <span className="font-medium">
                {format(parseISO(membership.start_date), "d MMMM yyyy", { locale: tr })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bitiş</span>
              <span className="font-medium">
                {format(parseISO(membership.end_date), "d MMMM yyyy", { locale: tr })}
              </span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Kalan süre</span>
                <span className="font-bold text-primary">{daysLeft} gün</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aktif üyelik bulunamadı</p>
          </div>
        )}
      </Card>

      {/* Stats */}
      <Card className="p-5 mb-5">
        <h3 className="font-semibold mb-3">İstatistikler</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-primary/5 rounded-xl">
            <p className="text-2xl font-bold text-primary">{reservations.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Aktif Rezervasyon</p>
          </div>
          <div className="text-center p-3 bg-accent/10 rounded-xl">
            <p className="text-2xl font-bold text-accent">{daysLeft}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kalan Gün</p>
          </div>
        </div>
        <ReservationsBottomSheet reservations={reservations} />
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          Çıkış Yap
        </Button>
      </div>
    </div>
    </>
  );
}