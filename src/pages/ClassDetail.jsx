import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, parseISO, differenceInDays, parse, isBefore, addMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, Clock, Users, MapPin, User } from "lucide-react";
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
      toast.success("Rezervasyon yapıldı!");
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
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayClasses"] });
      toast.success("Rezervasyon iptal edildi");
      navigate("/");
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
    <div className="max-w-3xl mx-auto px-8 pt-8 pb-24">
      {/* Hero */}
       <div className="text-center mb-10">
         <div className="w-28 h-28 rounded-2xl bg-primary/10 flex items-center justify-center text-6xl mx-auto mb-6">
           {categoryEmojis[cls.category] || "⭐"}
         </div>
         <h1 className="text-4xl font-bold">{cls.title}</h1>
        {cls.instructor && (
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <User className="w-4 h-4" />
            {cls.instructor}
          </p>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <Card className="p-5 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="font-semibold">{cls.start_time} - {cls.end_time}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {format(parseISO(cls.date), "d MMMM", { locale: tr })}
          </p>
        </Card>
        <Card className="p-5 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="font-semibold">{cls.current_count || 0} / {cls.capacity}</p>
          <p className="text-sm text-muted-foreground mt-1">Katılımcı</p>
        </Card>
      </div>

      {/* Description */}
      {cls.description && (
        <Card className="p-6 mb-10">
          <h3 className="font-bold text-lg mb-3">Ders Hakkında</h3>
          <p className="text-muted-foreground leading-relaxed">{cls.description}</p>
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