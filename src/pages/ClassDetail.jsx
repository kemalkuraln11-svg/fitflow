import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import QRCodeDisplay from "@/components/QRCodeDisplay";

const categoryEmojis = {
  hyrox: "🏃", crossfit: "🔥", fitness: "🏋️", other: "⭐",
};

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { member: user } = useMemberAuth();
  const [conflictPopup, setConflictPopup] = useState(false);
  const [done, setDone] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const { data: cls, isLoading } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const results = await base44.entities.ClassSchedule.filter({ id });
      return results[0];
    },
  });

  const { data: classReservations = [] } = useQuery({
    queryKey: ["classReservations", id],
    queryFn: () => base44.entities.Reservation.filter({ class_id: id, status: "confirmed" }),
  });

  const { data: classVisits = [] } = useQuery({
    queryKey: ["classVisits", id],
    queryFn: () => base44.entities.DailyVisit.filter({ class_id: id }),
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

  // Real-time: ClassSchedule veya Reservation değişince yeniden çek
  useEffect(() => {
    const unsubClass = base44.entities.ClassSchedule.subscribe((event) => {
      if (event.id === id) {
        queryClient.invalidateQueries({ queryKey: ["class", id] });
      }
    });

    const unsubRes = base44.entities.Reservation.subscribe((event) => {
      if (event.data?.class_id === id || event.id) {
        queryClient.invalidateQueries({ queryKey: ["classReservations", id] });
        queryClient.invalidateQueries({ queryKey: ["myReservation", id, user?.user_email] });
      }
    });

    return () => {
      unsubClass();
      unsubRes();
    };
  }, [id, queryClient, user?.user_email]);

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("makeReservation", {
        action: "create",
        classId: id,
        userEmail: user.user_email,
        userName: user.user_name,
      });
      const data = res?.data ?? res;
      if (data.conflict) {
        setConflictPopup({ title: data.title, date: data.date, time: data.time, instructor: data.instructor });
        throw new Error("conflict");
      }
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setSuccessData({ success: true });
      queryClient.invalidateQueries({ queryKey: ["class", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservation", id] });
      queryClient.invalidateQueries({ queryKey: ["classReservations", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayClasses"] });
      setDone(true);
      toast.success("Başarıyla kayıt yaptırdınız!", {
        position: "top-right",
        duration: 3000,
      });
    },
    onError: (err) => {
      if (err.message !== "conflict") toast.error(err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("makeReservation", {
        action: "cancel",
        classId: id,
        reservationId: myReservation.id,
      });
      const data = res?.data ?? res;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservation", id] });
      queryClient.invalidateQueries({ queryKey: ["classReservations", id] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["todayClasses"] });
      setDone(true);
      toast.error("Rezervasyon iptal edildi", {
        position: "top-right",
        duration: 2000,
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

  const totalCount = classReservations.length + classVisits.length;
  const isFull = totalCount >= cls.capacity;
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

  // Success screen with QR
  if (done && successData) {
    return (
      <>
      <ExpiredMembershipModal />
      <div className="px-4 pt-6 pb-10 min-h-[100dvh] flex flex-col items-center justify-start max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-xl font-bold mb-2 text-center">Rezervasyon Başarılı!</h2>
        <p className="text-muted-foreground text-sm mb-6 text-center">
          {cls.title} dersine kayıt yaptırdınız.
        </p>

        <Card className="w-full p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-3 text-center font-semibold">Derse girerken bu QR kodunuz taranacak:</p>
          <QRCodeDisplay data={`member:${user.username}:${cls.date}:${cls.start_time}`} />
        </Card>

        <Button className="w-full" onClick={() => navigate("/")}>
          Anasayfaya Dön
        </Button>
      </div>
      </>
    );
  }

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
          <p className="font-semibold text-sm">{totalCount} / {cls.capacity}</p>
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

      {/* QR Code for reservation */}
      {hasReservation && (
        <Card className="p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-3 text-center font-semibold">Derse girerken bu QR kodunuz taranacak:</p>
          <QRCodeDisplay data={`member:${user.username}:${cls.date}:${cls.start_time}`} />
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
            disabled={cancelMutation.isPending || done}
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
          disabled={isFull || reserveMutation.isPending || done}
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