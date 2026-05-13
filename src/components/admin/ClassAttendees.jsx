import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isPast, parse } from "date-fns";
import { toast } from "sonner";

export default function ClassAttendees({ classItem, onClose }) {
  const queryClient = useQueryClient();

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["attendees", classItem?.id],
    queryFn: () => base44.entities.Reservation.filter({ class_id: classItem.id, status: "confirmed" }),
    enabled: !!classItem?.id,
  });

  const markMutation = useMutation({
    mutationFn: ({ id, attended }) => base44.entities.Reservation.update(id, { attended }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendees", classItem?.id] });
    },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const isClassPast = classItem
    ? isPast(parse(`${classItem.date} ${classItem.end_time}`, "yyyy-MM-dd HH:mm", new Date()))
    : false;

  const attended = attendees.filter((a) => a.attended === true).length;
  const absent = attendees.filter((a) => a.attended === false).length;
  const unmarked = attendees.filter((a) => a.attended === null || a.attended === undefined).length;

  return (
    <Dialog open={!!classItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classItem?.title} - Katılımcılar</DialogTitle>
        </DialogHeader>

        {isClassPast && attendees.length > 0 && (
          <div className="flex gap-3 text-xs mb-2">
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {attended} geldi
            </span>
            <span className="flex items-center gap-1 text-destructive font-medium">
              <XCircle className="w-3.5 h-3.5" /> {absent} gelmedi
            </span>
            {unmarked > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground font-medium">
                <MinusCircle className="w-3.5 h-3.5" /> {unmarked} belirsiz
              </span>
            )}
          </div>
        )}

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
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  a.attended === true
                    ? "bg-green-50 border border-green-200"
                    : a.attended === false
                    ? "bg-red-50 border border-red-200"
                    : "bg-secondary/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.user_email}</p>
                </div>

                {isClassPast ? (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 ${a.attended === true ? "text-green-600 bg-green-100" : "text-muted-foreground"}`}
                      onClick={() => markMutation.mutate({ id: a.id, attended: a.attended === true ? null : true })}
                      title="Geldi"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 ${a.attended === false ? "text-destructive bg-red-100" : "text-muted-foreground"}`}
                      onClick={() => markMutation.mutate({ id: a.id, attended: a.attended === false ? null : false })}
                      title="Gelmedi"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary" className="text-xs shrink-0">{i + 1}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}