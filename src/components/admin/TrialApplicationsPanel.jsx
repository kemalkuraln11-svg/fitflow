import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { hashPassword } from "@/lib/crypto";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const APP_DOMAIN = window.location.hostname;

function capitalizeName(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function generateUsername(firstName, lastName) {
  const full = (firstName + lastName)
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  return full;
}

const paymentLabels = { nakit: "Nakit", kredi_karti: "Kredi Kartı", havale: "Havale / EFT" };

const planDurations = { "Aylık": 1, "3 Aylık": 3, "6 Aylık": 6, "Yıllık": 12 };

export default function TrialApplicationsPanel() {
  const queryClient = useQueryClient();
  const [approvingApp, setApprovingApp] = useState(null);
  const [plan, setPlan] = useState("Aylık");
  const [createdMember, setCreatedMember] = useState(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["trialApplications"],
    queryFn: () => base44.entities.TrialApplication.list("-created_date", 100),
  });

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  const approveMutation = useMutation({
    mutationFn: async ({ app, planName }) => {
      const username = generateUsername(app.first_name, app.last_name);
      const userEmail = `${username}@${APP_DOMAIN}`;
      const plainPassword = username; // default şifre = kullanıcı adı
      const hashedPassword = await hashPassword(plainPassword);
      const months = planDurations[planName] || 1;
      const startDate = format(new Date(), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(), months * 30 + 1), "yyyy-MM-dd");
      const fullName = capitalizeName(app.first_name + " " + app.last_name);

      // Üye oluştur
      const memberResult = await base44.functions.invoke("createMembership", {
        user_name: fullName,
        username,
        user_email: userEmail,
        password: hashedPassword,
        gender: "male",
        start_date: startDate,
        end_date: endDate,
        plan_name: planName,
        status: "active",
      });

      // Başvuruyu onayla
      await base44.entities.TrialApplication.update(app.id, { status: "approved" });

      return { memberResult: memberResult?.data || memberResult, username, plainPassword, fullName, planName };
    },
    onSuccess: ({ username, plainPassword, fullName, planName }) => {
      queryClient.invalidateQueries({ queryKey: ["trialApplications"] });
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      setApprovingApp(null);
      setCreatedMember({ username, plainPassword, fullName, planName });
      toast.success("Üye oluşturuldu!");
    },
    onError: (err) => toast.error("Hata: " + err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (app) => base44.entities.TrialApplication.update(app.id, { status: "rejected" }),
    onSuccess: (_, app) => {
      queryClient.invalidateQueries({ queryKey: ["trialApplications"] });
      // WhatsApp linki aç
      const message = `Merhaba ${capitalizeName(app.first_name + " " + app.last_name)}, üzgünüz başvurunuz reddedilmiştir. Salon yönetimiyle iletişime geçin.`;
      const whatsappUrl = `https://wa.me/${app.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      toast.success("Başvuru reddedildi, WhatsApp açılıyor.");
    },
    onError: (err) => toast.error("Hata: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrialApplication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trialApplications"] });
    },
  });

  return (
    <div>
      {/* Onay dialog */}
      <Dialog open={!!approvingApp} onOpenChange={(o) => { if (!o) setApprovingApp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Başvuruyu Onayla</DialogTitle>
          </DialogHeader>
          {approvingApp && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {capitalizeName(approvingApp.first_name + " " + approvingApp.last_name)}
                </span>{" "}
                için üyelik planını seçin.
              </p>
              <div>
                <Label>Üyelik Planı</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aylık">Aylık (30 gün)</SelectItem>
                    <SelectItem value="3 Aylık">3 Aylık (90 gün)</SelectItem>
                    <SelectItem value="6 Aylık">6 Aylık (180 gün)</SelectItem>
                    <SelectItem value="Yıllık">Yıllık (365 gün)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p>Kullanıcı adı: <span className="font-mono font-bold text-foreground">{generateUsername(approvingApp.first_name, approvingApp.last_name)}</span></p>
                <p>Varsayılan şifre: <span className="font-mono font-bold text-foreground">{generateUsername(approvingApp.first_name, approvingApp.last_name)}</span></p>
              </div>
              <Button
                className="w-full"
                onClick={() => approveMutation.mutate({ app: approvingApp, planName: plan })}
                disabled={approveMutation.isPending}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {approveMutation.isPending ? "Oluşturuluyor..." : "Üye Oluştur ve Onayla"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Oluşturulan üye bilgisi */}
      <Dialog open={!!createdMember} onOpenChange={() => setCreatedMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>✅ Üye Oluşturuldu</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">Bu bilgileri üyeye iletin:</p>
            <div className="bg-primary/10 rounded-xl p-4 space-y-2 border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground">Ad Soyad</p>
                <p className="font-bold text-foreground">{createdMember?.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kullanıcı Adı</p>
                <p className="font-mono font-bold text-foreground">{createdMember?.username}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Şifre</p>
                <p className="font-mono font-bold text-foreground">{createdMember?.plainPassword}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-bold text-foreground">{createdMember?.planName}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setCreatedMember(null)}>Tamam</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bekleyen başvurular */}
      <div className="mb-6">
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          Bekleyen Başvurular
          {pending.length > 0 && (
            <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 border text-xs">{pending.length}</Badge>
          )}
        </h3>
        {isLoading ? (
          <Card className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-1/2" /></Card>
        ) : pending.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">Bekleyen başvuru yok</Card>
        ) : (
          <div className="space-y-3">
            {pending.map((app) => (
              <Card key={app.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{capitalizeName(app.first_name + " " + app.last_name)}</p>
                    <p className="text-sm text-muted-foreground">{app.phone}</p>
                    {app.trial_class_title && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🎯 {app.trial_class_title} — {app.trial_class_date ? format(parseISO(app.trial_class_date), "d MMM", { locale: tr }) : ""} {app.trial_class_time}
                      </p>
                    )}
                    {app.payment_type && (
                      <p className="text-xs text-muted-foreground">💳 {paymentLabels[app.payment_type] || app.payment_type}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      📅 {format(parseISO(app.created_date), "d MMM yyyy HH:mm", { locale: tr })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => { setApprovingApp(app); setPlan("Aylık"); }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => rejectMutation.mutate(app)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reddet
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Geçmiş başvurular */}
      {reviewed.length > 0 && (
        <div>
          <h3 className="text-base font-bold mb-3 text-muted-foreground">Geçmiş Başvurular</h3>
          <div className="space-y-2">
            {reviewed.map((app) => (
              <Card key={app.id} className="p-3 opacity-70">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{capitalizeName(app.first_name + " " + app.last_name)}</p>
                    <p className="text-xs text-muted-foreground">{app.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        app.status === "approved"
                          ? "bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                          : "bg-destructive/10 text-destructive border-destructive/20 text-xs"
                      }
                    >
                      {app.status === "approved" ? "Onaylandı" : "Reddedildi"}
                    </Badge>
                    {app.status === "rejected" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => deleteMutation.mutate(app.id)}
                      >
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}