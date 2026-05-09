import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountDeleteDialog({ onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const user = await base44.auth.me();
      if (user) {
        // Delete associated membership records
        const memberships = await base44.entities.Membership.filter({
          user_email: user.email,
        });
        for (const membership of memberships) {
          await base44.entities.Membership.delete(membership.id);
        }

        // Delete associated reservations
        const reservations = await base44.entities.Reservation.filter({
          user_email: user.email,
        });
        for (const reservation of reservations) {
          await base44.entities.Reservation.delete(reservation.id);
        }

        // Logout and clear session
        await base44.auth.logout();
        onDeleted?.();
      }
    } catch (error) {
      console.error("Hesap silme hatası:", error);
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="w-5 h-5" />
          <span className="font-medium">Hesabı Sil</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Tüm verileriniz ve rezervasyonlarınız silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Devam etmek istediğinizden emin misiniz?
          </p>
        </div>
        <div className="flex gap-3">
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}