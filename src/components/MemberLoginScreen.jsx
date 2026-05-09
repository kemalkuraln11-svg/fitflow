import { useState } from "react";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MemberLoginScreen() {
  const { login } = useMemberAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
               className="h-10 mt-0.5 text-base"
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
                 className="h-10 pr-10 text-base"
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
    </div>
  );
}