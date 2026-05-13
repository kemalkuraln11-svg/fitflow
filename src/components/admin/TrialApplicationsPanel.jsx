import { useState, useEffect } from "react";
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
  const [creatingMember, setCreatingMember] = useState(null);
  const [plan, setPlan] = useState("Aylık");
  const [createdMember, setCreatedMember] = useState(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["trialApplications"],
    queryFn: () => base44.entities.TrialApplication.list("-created_date", 100),
  });

  const [classDetails, setClassDetails] = useState({});

  useEffect(() => {
    const fetchClassDetails = async () => {
      const classIds = [...new Set(applications.map(a => a.trial_class_id).filter(Boolean))];
      const details = {};
      
      for (const classId of classIds) {
        try {
          const allClasses = await base44.entities.ClassSchedule.list();
          const classData = allClasses.find(c => c.id === classId);
          if (classData) details[classId] = classData;
        } catch (err) {
          console.log("Sınıf detayları yüklenemedi:", err);
        }
      }
      setClassDetails(details);
    };
    
    if (applications.length > 0) {
      fetchClassDetails();
    }
  }, [applications]);

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  const approveMutation = useMutation({
     mutationFn: (app) => base44.entities.TrialApplication.update(app.id, { status: "approved" }),
     onSuccess: (_, app) => {
       queryClient.invalidateQueries({ queryKey: ["trialApplications"] });
       setApprovingApp(null);

       // WhatsApp linki aç
       const classInfo = app.trial_class_title ? ` ${app.trial_class_title} dersine` : "";
       const fullName = capitalizeName(app.first_name + " " + app.last_name);
       const approvalMessage = `Merhaba ${fullName},\n\nTebrikler! Başvurunuz onaylanmıştır. Deneme dersine${classInfo} gelmeyi unutmayın.\n\n⚠️ ÖNEMLİ BİLGİLER:\n\n1. Derse gelmezseniz deneme dersi hakkı bitecek ve tekrar başvuru oluşturamazsınız.\n2. Başvuru yapmanız için ilgili adrese gelmeniz gerekmektedir.\n3. Adrese gelmeden ÖNCE mutlaka spor salonu yönetimine bilgi vermeniz gerekmektedir.\n\n📍 KRATOS SPOR KULÜBÜ - AYVALIK\n\nSorularınız için salon yönetimiyle iletişime geçiniz.`;
       const whatsappUrl = `https://wa.me/${app.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(approvalMessage)}`;
       window.open(whatsappUrl, '_blank');
       toast.success("Deneme dersi onaylandı!");
     },
     onError: (err) => toast.error("Hata: " + err.message),
   });

  const createMemberMutation = useMutation({
     mutationFn: async ({ app, planName }) => {
       const username = generateUsername(app.first_name, app.last_name);
       const userEmail = `${username}@${APP_DOMAIN}`;
       const plainPassword = username;
       const hashedPassword = await hashPassword(plainPassword);
       const months = planDurations[planName] || 1;
       const startDate = format(new Date(), "yyyy-MM-dd");
       const endDate = format(addDays(new Date(), months * 30 + 1), "yyyy-MM-dd");
       const fullName = capitalizeName(app.first_name + " " + app.last_name);

       await base44.functions.invoke("createMembership", {
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

       return { username, plainPassword, fullName, planName };
     },
     onSuccess: ({ username, plainPassword, fullName, planName }) => {
       queryClient.invalidateQueries({ queryKey: ["trialApplications"] });
       queryClient.invalidateQueries({ queryKey: ["allMembers"] });
       setCreatingMember(null);
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
      {/* Deneme dersi onay dialog */}
        <Dialog open={!!approvingApp} onOpenChange={(o) => { if (!o) setApprovingApp(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deneme Dersini Onayla</DialogTitle>
            </DialogHeader>
            {approvingApp && (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {capitalizeName(approvingApp.first_name + " " + approvingApp.last_name)}
                  </span>{" "}
                  için deneme dersini onaylayacak mısınız?
                </p>
                {approvingApp.trial_class_title && (
                  <div className="bg-primary/10 rounded-lg p-3 text-sm border border-primary/20 space-y-1">
                    <p><span className="font-semibold">Ders:</span> {approvingApp.trial_class_title}</p>
                    <p><span className="font-semibold">Gün:</span> {approvingApp.trial_class_date ? format(parseISO(approvingApp.trial_class_date), "d MMMM yyyy", { locale: tr }) : "-"}</p>
                    <p><span className="font-semibold">Saat:</span> {approvingApp.trial_class_time || "-"}</p>
                  </div>
                )}
                <div className="bg-blue-500/10 rounded-lg p-3 text-xs text-muted-foreground border border-blue-500/20 space-y-1">
                  <p>Derse geldikten sonra kullanıcı isterse kayıt oluşturabilirsiniz.</p>
                  {classDetails[approvingApp.trial_class_id] && (
                    <>
                      {classDetails[approvingApp.trial_class_id].instructor && (
                        <p>👨‍🏫 Eğitmen: {classDetails[approvingApp.trial_class_id].instructor}</p>
                      )}
                      <p>👥 Kontenjan: {classDetails[approvingApp.trial_class_id].current_count || 0}/{classDetails[approvingApp.trial_class_id].capacity}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setApprovingApp(null)}
                  >
                    İptal
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => approveMutation.mutate(approvingApp)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

       {/* Üyelik oluştur dialog */}
       <Dialog open={!!creatingMember} onOpenChange={(o) => { if (!o) setCreatingMember(null); }}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Üyelik Oluştur</DialogTitle>
           </DialogHeader>
           {creatingMember && (
             <div className="space-y-4 mt-2">
               <p className="text-sm text-muted-foreground">
                 <span className="font-semibold text-foreground">
                   {capitalizeName(creatingMember.first_name + " " + creatingMember.last_name)}
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
                 <p>Kullanıcı adı: <span className="font-mono font-bold text-foreground">{generateUsername(creatingMember.first_name, creatingMember.last_name)}</span></p>
                 <p>Varsayılan şifre: <span className="font-mono font-bold text-foreground">{generateUsername(creatingMember.first_name, creatingMember.last_name)}</span></p>
               </div>
               <Button
                 className="w-full"
                 onClick={() => createMemberMutation.mutate({ app: creatingMember, planName: plan })}
                 disabled={createMemberMutation.isPending}
               >
                 <UserPlus className="w-4 h-4 mr-2" />
                 {createMemberMutation.isPending ? "Oluşturuluyor..." : "Üyelik Oluştur"}
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
                       <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                         <p>🎯 {app.trial_class_title} — {app.trial_class_date ? format(parseISO(app.trial_class_date), "d MMM", { locale: tr }) : ""} {app.trial_class_time}</p>
                         {classDetails[app.trial_class_id] && (
                           <>
                             {classDetails[app.trial_class_id].instructor && (
                               <p>👨‍🏫 {classDetails[app.trial_class_id].instructor}</p>
                             )}
                             <p>👥 {classDetails[app.trial_class_id].current_count || 0}/{classDetails[app.trial_class_id].capacity}</p>
                           </>
                         )}
                       </div>
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
                       onClick={() => { setApprovingApp(app); }}
                       disabled={approveMutation.isPending}
                     >
                       <CheckCircle className="w-3.5 h-3.5" />
                       Onayla
                     </Button>
                    {app.status === "approved" && (
                       <Button
                         size="sm"
                         className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700"
                         onClick={() => { setCreatingMember(app); setPlan("Aylık"); }}
                       >
                         <UserPlus className="w-3.5 h-3.5" />
                         Kayıt Oluştur
                       </Button>
                     )}
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

      {/* Onaylanmış ama üyelik oluşturulmamış başvurular */}
      {applications.filter(a => a.status === "approved").length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Onaylanmış Deneme Dersleri
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border text-xs">
              {applications.filter(a => a.status === "approved").length}
            </Badge>
          </h3>
          <div className="space-y-3">
            {applications.filter(a => a.status === "approved").map((app) => (
              <Card key={app.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{capitalizeName(app.first_name + " " + app.last_name)}</p>
                    <p className="text-sm text-muted-foreground">{app.phone}</p>
                    {app.trial_class_title && (
                       <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                         <p>🎯 {app.trial_class_title} — {app.trial_class_date ? format(parseISO(app.trial_class_date), "d MMM", { locale: tr }) : ""} {app.trial_class_time}</p>
                         {classDetails[app.trial_class_id] && (
                           <>
                             {classDetails[app.trial_class_id].instructor && (
                               <p>👨‍🏫 {classDetails[app.trial_class_id].instructor}</p>
                             )}
                             <p>👥 {classDetails[app.trial_class_id].current_count || 0}/{classDetails[app.trial_class_id].capacity}</p>
                           </>
                         )}
                       </div>
                     )}
                    </div>
                    <Button
                     size="sm"
                     className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 shrink-0"
                    onClick={() => { setCreatingMember(app); setPlan("Aylık"); }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Kayıt Oluştur
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reddedilen başvurular */}
      {applications.filter(a => a.status === "rejected").length > 0 && (
        <div>
          <h3 className="text-base font-bold mb-3 text-muted-foreground">Reddedilen Başvurular</h3>
          <div className="space-y-2">
            {applications.filter(a => a.status === "rejected").map((app) => (
              <Card key={app.id} className="p-3 opacity-70">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{capitalizeName(app.first_name + " " + app.last_name)}</p>
                    <p className="text-xs text-muted-foreground">{app.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                      Reddedildi
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => deleteMutation.mutate(app.id)}
                    >
                      <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
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