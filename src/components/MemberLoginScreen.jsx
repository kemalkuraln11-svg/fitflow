import { useState } from "react";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { Eye, EyeOff, LogIn, UserPlus, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DailyVisitForm from "@/pages/DailyVisitForm";
import TrialApplicationForm from "@/components/TrialApplicationForm";

export default function MemberLoginScreen() {
  const { login } = useMemberAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDailyVisit, setShowDailyVisit] = useState(false);
  const [showTrialApp, setShowTrialApp] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  if (showDailyVisit) {
    return <DailyVisitForm onBack={() => setShowDailyVisit(false)} />;
  }

  if (showTrialApp) {
    return <TrialApplicationForm onBack={() => setShowTrialApp(false)} />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 max-w-md mx-auto overflow-y-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6 mt-4">
        <img
          src="https://media.base44.com/images/public/69ff298a8db8d1511d286b61/2bf5548a7_ChatGPTImage9May202623_29_58.png"
          alt="FitKafa Hyrox"
          className="w-24 h-24 rounded-full object-cover mb-3 shadow-lg"
        />
        <h1 className="text-xl font-bold tracking-tight">Hoş Geldiniz</h1>
        <p className="text-muted-foreground text-xs mt-0.5">Hesabınıza giriş yapın</p>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-3 mb-4">
        <div>
             <Label className="text-xs">Kullanıcı Adı</Label>
             <Input
               className="h-10 mt-0.5 text-xs"
               style={{ fontSize: '16px' }}
               placeholder="kullanıcı adınız"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               autoCapitalize="none"
               autoCorrect="off"
             />
           </div>
           <div>
             <Label className="text-xs">Şifre</Label>
             <div className="relative mt-0.5">
               <Input
                 className="h-10 pr-10"
                 style={{ fontSize: '16px' }}
                 type={showPassword ? "text" : "password"}
                 placeholder="••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
             <button
               type="button"
               className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
               onClick={() => setShowPassword(!showPassword)}
             >
               {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             </button>
           </div>
         </div>

         {error && (
           <div className="bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2">
             {error}
           </div>
         )}

         <Button
           type="submit"
           className="w-full h-10 text-base font-semibold shadow-lg shadow-primary/25 mt-1"
           disabled={loading || !username || !password}
         >
           {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
         </Button>
      </form>

      <div className="w-full border-t pt-4 mt-2">
        <p className="text-xs text-muted-foreground text-center mb-3">Üye değil misiniz?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowDailyVisit(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-primary bg-primary/5 px-3 py-4 text-primary hover:bg-primary/10 transition-colors"
          >
            <LogIn className="w-6 h-6" />
            <span className="text-xs font-semibold leading-tight text-center">Günlük<br/>Giriş Yap</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTrialApp(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-border bg-muted/40 px-3 py-4 text-foreground hover:bg-muted transition-colors"
          >
            <UserPlus className="w-6 h-6" />
            <span className="text-xs font-semibold leading-tight text-center">Üyelik<br/>Başvurusu</span>
          </button>
        </div>
      </div>

      {/* Ders saatleri & ücret linki */}
      <button
        type="button"
        onClick={() => setShowInfo(true)}
        className="mt-4 flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 font-medium"
      >
        <Clock className="w-3.5 h-3.5" />
        Ders Saatleri & Ücret Listesi
      </button>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-md bg-card rounded-t-2xl p-5 pb-8 overflow-y-auto max-h-[85dvh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Ders Saatleri & Ücretler</h2>
              <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ders Saatleri */}
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Ders Saatleri</p>
            <div className="rounded-xl border overflow-hidden mb-5">
              <div className="grid grid-cols-3 bg-secondary text-secondary-foreground text-xs font-bold">
                <div className="px-3 py-2">Gün</div>
                <div className="px-3 py-2 text-center">Başlangıç</div>
                <div className="px-3 py-2 text-center">Bitiş</div>
              </div>
              {[
                { gun: "Pazartesi", bas: "—", bit: "—", off: true },
                { gun: "Salı",      bas: "18:30", bit: "19:30" },
                { gun: "Çarşamba",  bas: "18:30", bit: "19:30" },
                { gun: "Perşembe",  bas: "07:30", bit: "08:30" },
                { gun: "Cuma",      bas: "18:30", bit: "19:30" },
                { gun: "Cumartesi", bas: "10:00", bit: "11:00" },
                { gun: "Pazar",     bas: "10:00", bit: "11:00" },
              ].map((r, i) => (
                <div key={i} className={`grid grid-cols-3 text-xs border-t ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
                  <div className="px-3 py-2.5 font-semibold">{r.gun}</div>
                  <div className={`px-3 py-2.5 text-center font-bold ${r.off ? "text-muted-foreground" : "text-primary"}`}>{r.bas}</div>
                  <div className={`px-3 py-2.5 text-center font-bold ${r.off ? "text-muted-foreground" : "text-primary"}`}>{r.bit}</div>
                </div>
              ))}
            </div>

            {/* Fiyat Listesi */}
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Fiyat Listesi</p>
            <div className="rounded-xl border overflow-hidden mb-4">
              {[
                { plan: "Günlük Giriş", fiyat: "850 TL" },
                { plan: "4'lü Paket",   fiyat: "3.000 TL" },
                { plan: "8'li Paket",   fiyat: "5.000 TL" },
                { plan: "Sınırsız",     fiyat: "6.000 TL" },
              ].map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 text-sm border-t first:border-t-0 ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
                  <span className="font-semibold">{r.plan}</span>
                  <span className="font-bold text-primary">{r.fiyat}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
              <span className="text-orange-500 text-base">💵</span>
              <p className="text-xs text-orange-800 font-medium">Tüm ödemeler <strong>nakit</strong> olarak alınmaktadır.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}