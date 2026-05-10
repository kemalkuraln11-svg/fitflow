import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, parseISO, parse, isBefore, addMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Users, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const categoryEmojis = {
  hyrox: "🏃", crossfit: "🔥", fitness: "🏋️", other: "⭐",
};

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { member: user } = useMemberAuth();
  const [conflictPopup, setConflictPopup] = useState(false);

  const { data: cls, isLoading } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const results = await base44.entities.ClassSchedule.filter({ id });
      return results[0];
    },
  });

  const { data: myReservation } = useQuery({
    queryKey: ["myReservation", id, user?.user_email],
    queryFn: async () => {
      const res = await base44.entities.Reservation.filter({
        class_id: id,
        user_email: user.user_email,
        status: "confirmed",
      });
      return res[0] || null;
    },
    enabled: !!user?.user_email,
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      // Aynı gün ve saatte başka bir rezervasyon var mı kontrol et
      const allMyReservations = await base44.entities.Reservation.filter({
        user_email: user.user_email,
        status: "confirmed",
      });
      const existing = allMyReservations.filter(
        (r) => r.class_date === cls.date && r.class_time === cls.start_time && r.class_id !== id
      );
      if (existing.length > 0) {
        // Çakışan dersin detaylarını getir
        const conflictClass = await base44.entities.ClassSchedule.filter({ id: existing[0].class_id });
        const cc = conflictClass[0] || {};
        setConflictPopup({
          title: existing[0].class_title,
          date: existing[0].class_date,
          time: existing[0].class_time,
          instructor: cc.instructor || null,
        });
        throw new Error("conflict");
      }

      await base44.entities.Reservation.create({
        class_id: id,
        class_title: cls.title,
        class_date: cls.date,
        class_time: cls.start_time,
        user_email: user.user_email,
        user_name: user.user_name,
        status: "confirmed",
      });
      await base44.entities.ClassSchedule.update(cls.id, {
        current_count: (cls.current_count || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservation", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayClasses"] });
      toast.success("Başarıyla kayıt yaptırdınız!", {
        description: cls?.title,
        position: "top-right",
        duration: 3000,
      });
      setTimeout(() => navigate("/"), 2000);
    },
    onError: (err) => {
      if (err.message !== "conflict") toast.error(err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Reservation.update(myReservation.id, { status: "cancelled" });
      await base44.entities.ClassSchedule.update(cls.id, {
        current_count: Math.max(0, (cls.current_count || 0) - 1),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservation", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayClasses"] });
      toast.error("Rezervasyon iptal edildi", {
        description: cls?.title,
        position: "top-right",
        duration: 3000,
      });
      setTimeout(() => navigate("/"), 2000);
    },
  });

  if (isLoading || !cls) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isFull = (cls.current_count || 0) >= cls.capacity;
  const hasReservation = !!myReservation;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const memberEndDate = user?.end_date ? new Date(user.end_date) : null;
  if (memberEndDate) memberEndDate.setHours(0, 0, 0, 0);
  const membershipExpired = memberEndDate ? memberEndDate < today : false;

  // Dersin başlama saati ile şimdiki saati karşılaştır
  const classDateTime = parse(`${cls.date} ${cls.start_time}`, "yyyy-MM-dd HH:mm", new Date());
  const cancellationDeadline = addMinutes(classDateTime, -(cls.cancellation_deadline_minutes || 30));
  const canCancelReservation = isBefore(new Date(), cancellationDeadline);
  const classStarted = isBefore(classDateTime, new Date());

  return (
    <>
    <ExpiredMembershipModal />

    {/* Conflict Popup */}
    {!!conflictPopup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
        <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-base font-bold mb-2">Aynı Saatte Aktif Rezervasyonunuz Var!</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Aynı gün aynı saatte başka bir derse rezervasyon yaptırdınız.
          </p>
          <div className="bg-muted rounded-xl px-4 py-3 mb-6 text-left space-y-1.5">
            <p className="font-bold text-foreground text-sm">{conflictPopup?.title}</p>
            {conflictPopup?.date && (
              <p className="text-xs text-muted-foreground">
                📅 {format(parseISO(conflictPopup.date), "d MMMM", { locale: tr })} · {conflictPopup?.time}
              </p>
            )}
            {conflictPopup?.instructor && (
              <p className="text-xs text-muted-foreground">👤 {conflictPopup.instructor}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-6">Diğer dersinizi iptal edip bu derse kayıt olabilirsiniz.</p>
          <Button className="w-full" onClick={() => setConflictPopup(null)}>
            Tamam
          </Button>
        </div>
      </div>
    )}
    <div className="px-4 pt-4 pb-24">
      {/* Hero */}
       <div className="text-center mb-6">
         <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-5xl mx-auto mb-4">
           {categoryEmojis[cls.category] || "⭐"}
         </div>
         <h1 className="text-3xl font-bold">{cls.title}</h1>
        {cls.instructor && (
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <User className="w-4 h-4" />
            {cls.instructor}
          </p>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-3 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1.5 text-primary" />
          <p className="font-semibold text-sm">{cls.start_time} - {cls.end_time}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(parseISO(cls.date), "d MMM", { locale: tr })}
          </p>
        </Card>
        <Card className="p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1.5 text-accent" />
          <p className="font-semibold text-sm">{cls.current_count || 0} / {cls.capacity}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Katılımcı</p>
        </Card>
      </div>

      {/* Description */}
      {cls.description && (
        <Card className="p-4 mb-6">
          <h3 className="font-bold text-base mb-2">Ders Hakkında</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{cls.description}</p>
        </Card>
      )}

      {/* Action Button */}
      {membershipExpired ? (
        <div className="w-full h-14 flex items-center justify-center rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-center px-4">
          Üyeliğinizin süresi dolmuştur. Lütfen üyeliğinizi yenileyin.
        </div>
      ) : hasReservation ? (
        canCancelReservation ? (
          <Button
            variant="outline"
            className="w-full h-14 text-base font-semibold border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "İptal ediliyor..." : "Rezervasyonu İptal Et"}
          </Button>
        ) : (
          <div className="w-full h-14 flex items-center justify-center rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-center px-4">
            Dersin başlangıcına {cls.cancellation_deadline_minutes || 30} dakikadan az kala iptal edilemez
          </div>
        )
        ) : classStarted ? (
        <div className="w-full h-14 flex items-center justify-center rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-center px-4">
          Ders başladı. Rezervasyon yapamazsınız.
        </div>
        ) : (
        <Button
          className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/25"
          onClick={() => reserveMutation.mutate()}
          disabled={isFull || reserveMutation.isPending}
        >
          {reserveMutation.isPending
            ? "Rezervasyon yapılıyor..."
            : isFull
            ? "Ders Dolu"
            : "Rezervasyon Yap"}
        </Button>
      )}
    </div>
    </>
  );
}