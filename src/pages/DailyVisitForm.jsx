import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function DailyVisitForm({ onBack }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({ full_name: "", phone: "", visit_date: today, class_id: "", class_title: "", class_time: "" });
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["dailyVisitClasses", form.visit_date],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: form.visit_date }),
    enabled: !!form.visit_date,
  });

  const mutation = useMutation({
   mutationFn: (data) => base44.entities.DailyVisit.create(data),
   onSuccess: (result) => {
     const qrData = `daily:${form.full_name}:${form.phone}:${form.visit_date}:${form.class_time}`;
     setSuccessData({ ...result, qrData });
     setSuccess(true);
   },
   onError: () => toast.error("Kayıt başarısız, tekrar deneyin."),
  });

  const handleClassSelect = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    setForm({ ...form, class_id: classId, class_title: cls?.title || "", class_time: cls?.start_time || "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.visit_date) return;
    mutation.mutate(form);
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
          <p className="text-xs text-muted-foreground mb-3 text-center font-semibold">Giriş yapırken bu QR kodunuz taranacak:</p>
          <QRCodeDisplay data={successData.qrData} />
        </Card>

        <Button
          className="w-full mb-2"
          onClick={() => {
            setSuccess(false);
            setSuccessData(null);
            setForm({ full_name: "", phone: "", visit_date: today, class_id: "", class_title: "", class_time: "" });
          }}
        >
          Yeni Kayıt
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Geri Dön
        </Button>
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
          <div>
            <Label className="text-xs">Ad Soyad</Label>
            <Input
              className="mt-0.5"
              style={{ fontSize: "16px" }}
              placeholder="Adınız Soyadınız"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Telefon</Label>
            <Input
              className="mt-0.5"
              style={{ fontSize: "16px" }}
              placeholder="05xx xxx xx xx"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Tarih</Label>
            <Input
              className="mt-0.5"
              type="date"
              value={form.visit_date}
              onChange={(e) => setForm({ ...form, visit_date: e.target.value, class_id: "", class_title: "", class_time: "" })}
            />
          </div>
          {classes.length > 0 && (
            <div>
              <Label className="text-xs">Ders Seç (opsiyonel)</Label>
              <Select value={form.class_id} onValueChange={handleClassSelect}>
                <SelectTrigger className="mt-0.5">
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
            disabled={!form.full_name || !form.phone || mutation.isPending}
          >
            {mutation.isPending ? "Kaydediliyor..." : "Kaydı Tamamla"}
          </Button>
        </form>
      </Card>
    </div>
  );
}