import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

function capitalizeName(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function TrialApplicationForm({ onBack }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    trial_class_id: "",
    trial_class_title: "",
    trial_class_date: today,
    trial_class_time: "",
  });
  const [success, setSuccess] = useState(false);
  const [blacklisted, setBlacklisted] = useState(false);
  const [step, setStep] = useState(1);

  const { data: classes = [] } = useQuery({
    queryKey: ["classSchedule", form.trial_class_date],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: form.trial_class_date }),
    enabled: !!form.trial_class_date,
  });

  const handleClassSelect = (classId) => {
    const selectedClass = classes.find((c) => c.id === classId);
    setForm({
      ...form,
      trial_class_id: classId,
      trial_class_title: selectedClass?.title || "",
      trial_class_time: selectedClass?.start_time || "",
    });
  };



  const mutation = useMutation({
    mutationFn: async (data) => {
      // Kontrolü: aynı ad+soyad+telefon kombinasyonu ile daha önce başvuru var mı?
      const existing = await base44.entities.TrialApplication.filter({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      });
      if (existing && existing.length > 0) {
        throw new Error("ALREADY_APPLIED");
      }
      return base44.entities.TrialApplication.create(data);
    },
    onSuccess: () => setSuccess(true),
    onError: (err) => {
      if (err.message === "ALREADY_APPLIED") {
        setBlacklisted(true);
      } else {
        toast.error("Başvuru gönderilemedi, tekrar deneyin.");
      }
    },
  });



  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      trial_class_id: form.trial_class_id,
      trial_class_title: form.trial_class_title,
      trial_class_date: form.trial_class_date,
      trial_class_time: form.trial_class_time,
      status: "pending",
    });
  };

  if (blacklisted) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Başvuru Kabul Edilemedi</h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Bu bilgilerle zaten bir başvurunuz var. Detaylı bilgi için lütfen salon yönetimiyle iletişime geçin.
        </p>
        <Button variant="ghost" onClick={onBack}>
          Geri Dön
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Başvurunuz Alındı!</h2>
        <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
          Başvurunuz salon yönetimine iletildi.
        </p>
        {form.trial_class_title && (
          <p className="text-sm font-medium text-primary mb-6">
            {capitalizeName(form.first_name + " " + form.last_name)} — {form.trial_class_title}, {format(new Date(form.trial_class_date), "d MMMM", { locale: tr })} {form.trial_class_time}
          </p>
        )}
        <Button variant="ghost" onClick={onBack}>
          Giriş Ekranına Dön
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
        <h1 className="text-lg font-bold">Üyelik Başvurusu</h1>
      </div>

      <Card className="w-full p-5">
        {step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">Kişisel bilgilerinizi girin.</p>
            <div>
              <Label className="text-xs">Ad</Label>
              <Input
                className="mt-0.5"
                style={{ fontSize: "16px" }}
                placeholder="Adınız"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Soyad</Label>
              <Input
                className="mt-0.5"
                style={{ fontSize: "16px" }}
                placeholder="Soyadınız"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input
                className="mt-0.5"
                style={{ fontSize: "16px" }}
                placeholder="+90 5xx xxx xx xx"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 font-semibold shadow-lg shadow-primary/25 mt-1"
              disabled={!form.first_name || !form.last_name || !form.phone}
            >
              Devam Et
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              Merhaba <span className="font-semibold text-foreground">{capitalizeName(form.first_name + " " + form.last_name)}</span>, deneme dersinizi seçin.
            </p>
            <div>
              <Label className="text-xs">Tarih</Label>
              <Input
                className="mt-0.5"
                type="date"
                min={today}
                max={format(addDays(new Date(), 14), "yyyy-MM-dd")}
                value={form.trial_class_date}
                onChange={(e) =>
                  setForm({ ...form, trial_class_date: e.target.value, trial_class_id: "", trial_class_title: "", trial_class_time: "" })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Ders Seç (opsiyonel)</Label>
              <Select value={form.trial_class_id} onValueChange={handleClassSelect}>
                <SelectTrigger className="mt-0.5">
                  <SelectValue placeholder={classes.length === 0 ? "O gün ders yok" : "Ders seçin"} />
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 font-semibold mt-1"
                onClick={() => setStep(1)}
              >
                Geri
              </Button>
              <Button
                type="submit"
                className="w-full h-10 font-semibold shadow-lg shadow-primary/25 mt-1"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Gönderiliyor..." : "Başvuruyu Gönder"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}