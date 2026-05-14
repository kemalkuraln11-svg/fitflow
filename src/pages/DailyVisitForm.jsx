import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isSameMonth, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight, AlertCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function DailyVisitForm({ onBack }) {
  const todayDate = new Date();
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [form, setForm] = useState({ full_name: "", phone: "", class_id: "", class_title: "", class_time: "" });
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Tüm dersleri çek (takvim işaretleme için)
  const { data: allSchedules = [] } = useQuery({
    queryKey: ["allSchedules"],
    queryFn: () => base44.entities.ClassSchedule.list(),
  });

  // O güne ait dersleri çek
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["dailyVisitClasses", dateStr],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: dateStr }),
    enabled: !!dateStr,
  });

  const classDates = new Set(allSchedules.map((s) => s.date));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.DailyVisit.create(data),
    onSuccess: (result) => {
      const qrData = `DAILY|${form.full_name.trim().toUpperCase()}|${form.phone.trim()}`;
      setSuccessData({ ...result, qrData });
      setSuccess(true);
    },
    onError: () => toast.error("Kayıt başarısız, tekrar deneyin."),
  });

  const handleClassSelect = (cls) => {
    setForm({ ...form, class_id: cls.id, class_title: cls.title, class_time: cls.start_time });
  };

  const handleDateChange = (newDate) => {
    const newStr = format(newDate, "yyyy-MM-dd");
    if (!classDates.has(newStr)) return; // ders yoksa geçme
    setSelectedDate(newDate);
    setForm({ ...form, class_id: "", class_title: "", class_time: "" });
    setCalendarOpen(false);
  };

  const handleArrow = (dir) => {
    let next = dir === "prev" ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    // ders olan güne atla
    let tries = 0;
    while (tries < 60) {
      const s = format(next, "yyyy-MM-dd");
      if (classDates.has(s)) {
        setSelectedDate(next);
        setForm({ ...form, class_id: "", class_title: "", class_time: "" });
        return;
      }
      next = dir === "prev" ? subDays(next, 1) : addDays(next, 1);
      tries++;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.class_id) return;
    mutation.mutate({ ...form, visit_date: dateStr });
  };

  const noClasses = !loadingClasses && classes.length === 0;
  const canSubmit = form.full_name && form.phone && form.class_id;

  // Takvim grid
  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let d = gridStart;
    while (d <= gridEnd) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }

    const weekDays = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

    return (
      <div className="absolute left-0 right-0 z-50 mt-2 bg-card border border-border rounded-xl shadow-xl p-4">
        {/* Ay navigasyon */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="p-1 rounded hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">
            {format(calendarMonth, "MMMM yyyy", { locale: tr })}
          </span>
          <button type="button" onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="p-1 rounded hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Haftanın günleri */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map(w => (
            <div key={w} className="text-center text-xs text-muted-foreground font-medium py-1">{w}</div>
          ))}
        </div>

        {/* Günler */}
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, i) => {
            const ds = format(day, "yyyy-MM-dd");
            const hasClass = classDates.has(ds);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, todayDate);
            const inMonth = isSameMonth(day, calendarMonth);

            return (
              <button
                key={i}
                type="button"
                disabled={!hasClass}
                onClick={() => handleDateChange(day)}
                className={[
                  "relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-sm transition-colors",
                  !inMonth ? "opacity-30" : "",
                  !hasClass ? "text-muted-foreground cursor-not-allowed opacity-40" : "cursor-pointer",
                  isSelected ? "bg-primary text-primary-foreground font-bold" : hasClass ? "hover:bg-muted font-medium" : "",
                  isToday && !isSelected ? "ring-1 ring-primary text-primary" : "",
                ].join(" ")}
              >
                {day.getDate()}
                {hasClass && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (success && successData) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-start px-6 pt-6 pb-10 max-w-md mx-auto overflow-y-auto">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-center">Kayıt Tamamlandı!</h2>
        <p className="text-muted-foreground text-sm mb-4 text-center">
          {form.class_title ? `${form.class_title} dersine günlük kaydınız alındı.` : "Günlük ziyaret kaydınız alındı."}
        </p>
        <Card className="w-full p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-3 text-center font-semibold">Giriş yaparken bu QR kodu taranacak:</p>
          <QRCodeDisplay data={successData.qrData} />
        </Card>
        <Button className="w-full mb-2" onClick={() => {
          setSuccess(false); setSuccessData(null);
          setForm({ full_name: "", phone: "", class_id: "", class_title: "", class_time: "" });
        }}>Yeni Kayıt</Button>
        <Button variant="ghost" onClick={onBack}>Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-start px-4 pt-6 pb-10 max-w-md mx-auto overflow-y-auto">
      <div className="w-full flex items-center gap-2 mb-5">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Günlük Giriş</h1>
      </div>

      <Card className="w-full p-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Ad Soyad */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Ad Soyad</Label>
            <Input className="mt-1" style={{ fontSize: "16px" }} placeholder="Adınız Soyadınız"
              value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>

          {/* Telefon */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Telefon</Label>
            <Input className="mt-1" style={{ fontSize: "16px" }} placeholder="05xx xxx xx xx" type="tel"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          {/* Tarih */}
          <div className="relative">
            <Label className="text-xs font-semibold text-muted-foreground">Tarih</Label>
            <div className="mt-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
              <button type="button" onClick={() => handleArrow("prev")} className="text-muted-foreground hover:text-foreground p-0.5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 text-sm font-medium"
                onClick={() => { setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); setCalendarOpen(o => !o); }}
              >
                <CalendarDays className="w-4 h-4 text-primary" />
                {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
              </button>
              <button type="button" onClick={() => handleArrow("next")} className="text-muted-foreground hover:text-foreground p-0.5">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {calendarOpen && renderCalendar()}
          </div>

          {/* Ders seçimi */}
          {calendarOpen ? null : loadingClasses ? (
            <div className="text-xs text-muted-foreground text-center py-2">Dersler yükleniyor...</div>
          ) : noClasses ? (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-3">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700">Bu tarihte ders bulunmuyor.</p>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Ders Seç</Label>
              <div className="mt-1 space-y-2">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleClassSelect(cls)}
                    className={[
                      "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                      form.class_id === cls.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted",
                    ].join(" ")}
                  >
                    <p className="font-semibold text-sm leading-tight">{cls.title}</p>
                    <p className={`text-xs mt-0.5 ${form.class_id === cls.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {cls.start_time} – {cls.end_time} · {cls.instructor}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 font-semibold shadow-lg shadow-primary/25 mt-1"
            disabled={!canSubmit || mutation.isPending || noClasses}
          >
            {mutation.isPending ? "Kaydediliyor..." : "Kaydı Tamamla"}
          </Button>
        </form>
      </Card>
    </div>
  );
}