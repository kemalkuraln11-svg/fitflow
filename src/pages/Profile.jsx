import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { hashPassword } from "@/lib/crypto";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInDays, parse, isBefore, isPast } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, LogOut, Clock, CheckCircle2, History, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import ReservationsBottomSheet from "@/components/ReservationsBottomSheet";


export default function Profile() {
  const { member, logout } = useMemberAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const changePwMutation = useMutation({
    mutationFn: async ({ next }) => {
      const hashed = await hashPassword(next);
      await base44.entities.Membership.update(member.id, { password: hashed, password_plain: next });
    },
    onSuccess: () => {
      setPwForm({ current: "", next: "", confirm: "" });
      setPwError("");
      toast.success("Şifreniz başarıyla güncellendi!");
    },
    onError: () => toast.error("Şifre güncellenemedi, tekrar deneyin."),
  });

  const handleChangePw = async (e) => {
    e.preventDefault();
    setPwError("");
    // Fetch the actual membership record to get the stored hash
    const records = await base44.entities.Membership.filter({ id: member.id });
    const storedHash = records?.[0]?.password;
    const currentHashed = await hashPassword(pwForm.current);
    if (currentHashed !== storedHash) { setPwError("Mevcut şifreniz yanlış."); return; }
    if (pwForm.next.length < 4) { setPwError("Yeni şifre en az 4 karakter olmalı."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Şifreler eşleşmiyor."); return; }
    changePwMutation.mutate({ next: pwForm.next });
  };
  const membership = (member?.status === "active" && member?.end_date) ? member : null;

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

  const planType = member?.plan_type || 'unlimited';
  const now2 = new Date();
  const monthStart = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonthDate = new Date(now2.getFullYear(), now2.getMonth() + 1, 1);
  const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const thisMonthReservations = reservations.filter(
    (r) => r.class_date >= monthStart && r.class_date < monthEnd
  );
  const sessionLimit = planType === '4' ? 4 : planType === '8' ? 8 : null;
  const sessionsUsed = thisMonthReservations.length;
  const sessionsLeft = sessionLimit !== null ? Math.max(0, sessionLimit - sessionsUsed) : null;

  const now = new Date();
  const pastReservations = reservations.filter((r) => {
    const dt = parse(`${r.class_date} ${r.class_time}`, "yyyy-MM-dd HH:mm", new Date());
    return isPast(dt);
  });
  const upcomingReservations = reservations.filter((r) => {
    const dt = parse(`${r.class_date} ${r.class_time}`, "yyyy-MM-dd HH:mm", new Date());
    return !isPast(dt);
  });



  return (
    <>
    <ExpiredMembershipModal />
    <div className="px-4 pt-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Profil</h1>

      <div className="space-y-6">
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
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Plan</span>
                  <span className="font-medium">{membership.plan_name || "Standart"}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {planType === '4' ? "4'lü Paket" : planType === '8' ? "8'li Paket" : "Sınırsız"}
                </Badge>
              </div>
              {sessionLimit !== null && (
                <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">Bu ay kalan ders hakkı</span>
                    <span className="text-sm font-bold text-primary">{sessionsLeft} / {sessionLimit}</span>
                  </div>
                  <Progress value={(sessionsUsed / sessionLimit) * 100} className="h-1.5" />
                </div>
              )}
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

        {/* Stats */}
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">İstatistikler</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <p className="text-3xl font-bold text-primary">{upcomingReservations.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Yaklaşan Ders</p>
            </div>
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <p className="text-3xl font-bold text-accent">{pastReservations.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Katıldığım Ders</p>
            </div>
          </div>
          <ReservationsBottomSheet reservations={reservations} />
        </Card>

        {/* Geçmiş Ders Kayıtları */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-sm">Geçmiş Derslerim</h3>
            <Badge variant="secondary" className="ml-auto text-xs">{pastReservations.length} ders</Badge>
          </div>

          {pastReservations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Henüz tamamlanan ders yok</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...pastReservations].reverse().map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{r.class_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(r.class_date), "d MMM yyyy", { locale: tr })}
                      {r.class_time ? ` · ${r.class_time}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Change Password */}
        <Card className="p-5">
          <button
            type="button"
            className="w-full flex items-center gap-2"
            onClick={() => { setPwOpen(o => !o); setPwError(""); setPwForm({ current: "", next: "", confirm: "" }); }}
          >
            <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-sm flex-1 text-left">Şifre Değiştir</h3>
            <span className="text-muted-foreground text-xs">{pwOpen ? "▲" : "▼"}</span>
          </button>
          {pwOpen && (
          <form onSubmit={handleChangePw} className="space-y-3 mt-4">
            <input
              type="password"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Mevcut şifre"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              style={{ fontSize: "16px" }}
            />
            <input
              type="password"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Yeni şifre"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              style={{ fontSize: "16px" }}
            />
            <input
              type="password"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Yeni şifre (tekrar)"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              style={{ fontSize: "16px" }}
            />
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <Button
              type="submit"
              className="w-full h-9"
              disabled={!pwForm.current || !pwForm.next || !pwForm.confirm || changePwMutation.isPending}
            >
              {changePwMutation.isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
          </form>
          )}
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
    </>
  );
}