import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ClassAttendees({ classItem, onClose }) {
  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["attendees", classItem?.id],
    queryFn: () => base44.entities.Reservation.filter({ class_id: classItem.id, status: "confirmed" }),
    enabled: !!classItem?.id,
  });

  return (
    <Dialog open={!!classItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classItem?.title} - Katılımcılar</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : attendees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Henüz katılımcı yok
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {attendees.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.user_email}</p>
                </div>
                <Badge variant="secondary" className="text-xs">{i + 1}</Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}