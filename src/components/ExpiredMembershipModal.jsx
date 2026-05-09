import { useEffect, useState } from "react";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExpiredMembershipModal() {
  const { member, logout } = useMemberAuth();
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!member?.end_date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(member.end_date);
    end.setHours(0, 0, 0, 0);
    if (end < today || member.status === "expired" || member.status === "frozen") {
      setShow(true);
    }
  }, [member]);

  useEffect(() => {
    if (!show) return;
    if (countdown <= 0) {
      logout();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [show, countdown]);

  if (!show) return null;

  const message =
    member?.status === "frozen"
      ? "Üyeliğiniz dondurulmuştur."
      : "Üyeliğinizin süresi dolmuştur.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-bold mb-1">Erişim Engellendi</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {message} Lütfen yenileme için iletişime geçin.
        </p>
        <Button
          variant="destructive"
          className="w-full"
          onClick={logout}
        >
          Çıkış Yap ({countdown})
        </Button>
      </div>
    </div>
  );
}