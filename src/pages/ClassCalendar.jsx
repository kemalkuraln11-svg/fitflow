import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const categoryEmojis = {
  hyrox: "🏃", crossfit: "🔥", fitness: "🏋️", other: "⭐",
};

export default function ClassCalendar() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes", dateStr],
    queryFn: () => base44.entities.ClassSchedule.filter({ date: dateStr }, "start_time"),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["classes", dateStr] });
  };

  return (
    <>
    <ExpiredMembershipModal />
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold tracking-tight mb-5">Takvim</h1>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="text-sm font-medium text-muted-foreground">
          {format(weekStart, "MMMM yyyy", { locale: tr })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Week strip */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex flex-col items-center flex-1 min-w-[44px] py-2.5 rounded-xl transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : isToday
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-foreground hover:bg-secondary"
              )}
            >
              <span className="text-[10px] font-medium opacity-70 uppercase">
                {format(day, "EEE", { locale: tr })}
              </span>
              <span className="text-lg font-bold mt-0.5">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Classes for selected date */}
      <h2 className="font-semibold mb-3">
        {format(selectedDate, "d MMMM EEEE", { locale: tr })}
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-sm">Bu tarihte ders bulunmuyor</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const isFull = (cls.current_count || 0) >= cls.capacity;
            return (
              <Link key={cls.id} to={`/class/${cls.id}`}>
                <Card className={cn(
                  "p-4 flex items-center gap-4 transition-all active:scale-[0.98]",
                  isFull ? "opacity-60" : "hover:shadow-md"
                )}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {categoryEmojis[cls.category] || "⭐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{cls.title}</p>
                      {isFull && (
                        <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full shrink-0">
                          DOLU
                        </span>
                      )}
                    </div>
                    {cls.instructor && (
                      <p className="text-xs text-muted-foreground mt-0.5">{cls.instructor}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {cls.start_time} - {cls.end_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {cls.current_count || 0}/{cls.capacity}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </PullToRefresh>
    </>
  );
}