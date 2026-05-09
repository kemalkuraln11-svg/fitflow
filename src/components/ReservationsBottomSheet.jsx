import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronUp, X, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

export default function ReservationsBottomSheet({ reservations = [] }) {
  const [open, setOpen] = useState(false);
  const [classesData, setClassesData] = useState({});

  useEffect(() => {
    if (reservations.length === 0) return;
    
    const fetchClasses = async () => {
      const classIds = [...new Set(reservations.map((r) => r.class_id))];
      const data = {};
      
      for (const id of classIds) {
        try {
          const classes = await base44.entities.ClassSchedule.filter({ id });
          if (classes.length > 0) {
            data[id] = classes[0];
          }
        } catch (err) {
          console.error(`Failed to fetch class ${id}:`, err);
        }
      }
      
      setClassesData(data);
    };
    
    fetchClasses();
  }, [reservations]);

  if (reservations.length === 0) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-2xl hover:bg-muted/50 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Rezervasyonlarım</span>
          <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {reservations.length}
          </span>
        </div>
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
<div
  className={`fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl transition-transform duration-300 ${
    open ? "translate-y-0" : "translate-y-full"
  }`}
  style={{ height: "75vh", maxHeight: "75vh" }}
>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-bold text-base">Rezervasyonlarım</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto px-4 py-4 space-y-2" style={{ maxHeight: "calc(60vh - 100px)" }}>
          {reservations.map((res) => {
            const classData = classesData[res.class_id];
            const displayTime = classData?.start_time || res.class_time;
            const dateLabel = isToday(parseISO(res.class_date))
              ? "Bugün"
              : isTomorrow(parseISO(res.class_date))
              ? "Yarın"
              : format(parseISO(res.class_date), "d MMM", { locale: tr });

            return (
              <Link key={res.id} to={`/class/${res.class_id}`} onClick={() => setOpen(false)} className="flex justify-center">
                <Card className="p-3.5 flex items-center gap-3 hover:shadow-sm transition-all active:scale-[0.98] w-4/5">
                  <Badge variant="secondary" className="text-xs font-medium shrink-0">
                    {dateLabel}
                  </Badge>
                  <p className="text-sm font-medium truncate flex-1">{res.class_title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{displayTime}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}