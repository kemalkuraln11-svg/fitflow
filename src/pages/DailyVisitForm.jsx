import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function DailyVisitForm({ onBack }) {
  const todayDate = new Date();
  const todayStr = format(todayDate, "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [form, setForm] = useState({ full_name: "", phone: "", class_id: "", class_title: "", class_time: "" });
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["dailyVisitClasses", dateStr],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: dateStr }),
    enabled: !!dateStr,
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.DailyVisit.create(data),
    onSuccess: (result) => {
      const qrData = `DAILY|${form.full_name.trim().toUpperCase()}|${form.phone.trim()}`;
      setSuccessData({ ...result, qrData });
      setSuccess(true);
    },
    onError: () => toast.error("Kayıt başarısız, tekrar deneyin."),
  });

  const handleClassSelect = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    setForm({ ...form, class_id: classId, class_title: cls?.title || "", class_time: cls?.start_time || "" });
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setForm({ ...form, class_id: "", class_title: "", class_time: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.class_id) return;
    mutation.mutate({ ...form, visit_date: dateStr });
  };

  const noClasses = !loadingClasses && classes.length === 0;
  const canSubmit = form.full_name && form.phone && form.class_id;

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
        <Button
          className="w-full mb-2"
          onClick={() => {
            setSuccess(false);
            setSuccessData(null);
            setForm({ full_name: "", phone: "", class_id: "", class_title: "", class_time: "" });
          }}
        >
          Yeni Kayıt
        </Button>
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
            <Input
              className="mt-1"
              style={{ fontSize: "16px" }}
              placeholder="Adınız Soyadınız"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          {/* Telefon */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Telefon</Label>
            <Input
              className="mt-1"
              style={{ fontSize: "16px" }}
              placeholder="05xx xxx xx xx"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {/* Tarih - özel picker */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Tarih</Label>
            <div className="mt-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
              <button
                type="button"
                onClick={() => handleDateChange(subDays(selectedDate, 1))}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium">
                {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
              </span>
              <button
                type="button"
                onClick={() => handleDateChange(addDays(selectedDate, 1))}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ders seçimi veya uyarı */}
          {loadingClasses ? (
            <div className="text-xs text-muted-foreground text-center py-2">Dersler yükleniyor...</div>
          ) : noClasses ? (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-3">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                Bu tarihte ders bulunmuyor. Kayıt yapabilmek için ders olan bir gün seçin.
              </p>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Ders Seç</Label>
              <Select value={form.class_id} onValueChange={handleClassSelect}>
                <SelectTrigger className="mt-1 h-10" style={{ fontSize: "16px" }}>
                  <SelectValue placeholder="Ders seçin" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.title} — {cls.start_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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