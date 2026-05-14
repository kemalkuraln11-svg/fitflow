import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isPast, parse } from "date-fns";
import { toast } from "sonner";

function AttendanceBadge({ attended }) {
  if (attended === true) return <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Geldi</span>;
  if (attended === false) return <span className="flex items-center gap-1 text-xs text-destructive font-medium"><XCircle className="w-3.5 h-3.5" /> Gelmedi</span>;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium"><MinusCircle className="w-3.5 h-3.5" /> Belirsiz</span>;
}

export default function ClassAttendees({ classItem, onClose }) {
  const queryClient = useQueryClient();

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["attendees", classItem?.id],
    queryFn: () => base44.entities.Reservation.filter({ class_id: classItem.id, status: "confirmed" }),
    enabled: !!classItem?.id,
  });

  const { data: dailyVisits = [], isLoading: isLoadingVisits } = useQuery({
    queryKey: ["classVisits", classItem?.id],
    queryFn: () => base44.entities.DailyVisit.filter({ class_id: classItem.id }),
    enabled: !!classItem?.id,
  });

  const markReservationMutation = useMutation({
    mutationFn: ({ id, attended }) => base44.entities.Reservation.update(id, { attended }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendees", classItem?.id] }),
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const markVisitMutation = useMutation({
    mutationFn: ({ id, attended }) => base44.entities.DailyVisit.update(id, { attended }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classVisits", classItem?.id] }),
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const isClassPast = classItem
    ? isPast(parse(`${classItem.date} ${classItem.end_time}`, "yyyy-MM-dd HH:mm", new Date()))
    : false;

  // Reservation stats
  const resAttended = attendees.filter((a) => a.attended === true).length;
  const resAbsent = attendees.filter((a) => a.attended === false).length;
  const resUnmarked = attendees.filter((a) => a.attended === null || a.attended === undefined).length;

  // Daily visit stats
  const visitAttended = dailyVisits.filter((v) => v.attended === true).length;
  const visitAbsent = dailyVisits.filter((v) => v.attended === false).length;
  const visitUnmarked = dailyVisits.filter((v) => v.attended === null || v.attended === undefined).length;

  const totalAttended = resAttended + visitAttended;
  const totalAbsent = resAbsent + visitAbsent;

  return (
    <Dialog open={!!classItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classItem?.title} - Katılımcılar</DialogTitle>
        </DialogHeader>

        {/* Genel özet */}
        <div className="flex flex-wrap gap-3 text-xs mb-1">
          <span className="text-muted-foreground font-medium">
            Toplam: {attendees.length + dailyVisits.length} kişi
            {dailyVisits.length > 0 && ` (${attendees.length} üye + ${dailyVisits.length} günlük)`}
          </span>
        </div>
        <div className="flex gap-3 text-xs mb-3">
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {totalAttended} geldi
          </span>
          <span className="flex items-center gap-1 text-destructive font-medium">
            <XCircle className="w-3.5 h-3.5" /> {totalAbsent} gelmedi
          </span>
          {(resUnmarked + visitUnmarked) > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground font-medium">
              <MinusCircle className="w-3.5 h-3.5" /> {resUnmarked + visitUnmarked} belirsiz
            </span>
          )}
        </div>

        {(isLoading || isLoadingVisits) ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">

            {/* Üye Rezervasyonları */}
            {attendees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Üye Rezervasyonları ({attendees.length})
                  </p>
                  <span className="text-xs text-muted-foreground">
                    · {resAttended} geldi · {resAbsent} gelmedi {resUnmarked > 0 ? `· ${resUnmarked} belirsiz` : ""}
                  </span>
                </div>
                <div className="space-y-2">
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
                      <div className="flex items-center gap-1 shrink-0">
                        <AttendanceBadge attended={a.attended} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${a.attended === true ? "text-green-600 bg-green-100" : "text-muted-foreground"}`}
                          onClick={() => markReservationMutation.mutate({ id: a.id, attended: a.attended === true ? null : true })}
                          title="Geldi"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${a.attended === false ? "text-destructive bg-red-100" : "text-muted-foreground"}`}
                          onClick={() => markReservationMutation.mutate({ id: a.id, attended: a.attended === false ? null : false })}
                          title="Gelmedi"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Günlük Ziyaretçiler */}
            {dailyVisits.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Günlük Girişler ({dailyVisits.length})
                  </p>
                  <span className="text-xs text-muted-foreground">
                    · {visitAttended} geldi · {visitAbsent} gelmedi {visitUnmarked > 0 ? `· ${visitUnmarked} belirsiz` : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {dailyVisits.map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        v.attended === true
                          ? "bg-green-50 border border-green-200"
                          : v.attended === false
                          ? "bg-red-50 border border-red-200"
                          : "bg-orange-50 border border-orange-200"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{v.phone}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <AttendanceBadge attended={v.attended} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${v.attended === true ? "text-green-600 bg-green-100" : "text-muted-foreground"}`}
                          onClick={() => markVisitMutation.mutate({ id: v.id, attended: v.attended === true ? null : true })}
                          title="Geldi"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${v.attended === false ? "text-destructive bg-red-100" : "text-muted-foreground"}`}
                          onClick={() => markVisitMutation.mutate({ id: v.id, attended: v.attended === false ? null : false })}
                          title="Gelmedi"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attendees.length === 0 && dailyVisits.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Henüz katılımcı yok
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}