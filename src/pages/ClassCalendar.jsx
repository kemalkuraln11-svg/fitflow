import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, addDays, startOfWeek, isSameDay, parseISO, isSameWeek, isPast, parse } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Users, ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CalendarPicker from "@/components/CalendarPicker.jsx";

const categoryEmojis = {
  hyrox: "🏃", crossfit: "🔥", fitness: "🏋️", other: "⭐",
};

export default function ClassCalendar() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  // Bugünü her zaman şeridin ortasında göster (3 gün önce, bugün, 3 gün sonra)
  const [weekStart, setWeekStart] = useState(() => today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [expandedClasses, setExpandedClasses] = useState(false);

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

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Seçilen tarihi şeridin başına al
    setWeekStart(date);
    setShowCalendar(false);
    setExpandedClasses(false);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      const direction = diff > 0 ? 5 : -5;
      const newWeekStart = addDays(weekStart, direction);
      // Seçili tarihi de aynı yönde kaydır
      const newDate = addDays(selectedDate, direction);
      setWeekStart(newWeekStart);
      setSelectedDate(newDate);
      setExpandedClasses(false);
    }
    setTouchStart(null);
  };

  return (
    <>
    <ExpiredMembershipModal />
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 pt-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-5">Sınıf Takvimi</h1>

       {/* Week navigation */}
       <div className="flex items-center justify-between mb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            const newWeekStart = addDays(weekStart, -5);
            setWeekStart(newWeekStart);
            setSelectedDate(addDays(selectedDate, -5));
            setExpandedClasses(false);
          }}
          >
          <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowCalendar(true)}
          >
            <Calendar className="w-4 h-4" />
            {format(weekStart, "MMMM yyyy", { locale: tr })}
          </Button>
          <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            const newWeekStart = addDays(weekStart, 5);
            setWeekStart(newWeekStart);
            setSelectedDate(addDays(selectedDate, 5));
            setExpandedClasses(false);
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Week strip */}
      <div 
       className="flex gap-1 mb-6"
       onTouchStart={handleTouchStart}
       onTouchEnd={handleTouchEnd}
      >
       {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                setSelectedDate(day);
              }}
               className={cn(
                  "flex flex-col items-center flex-1 py-2.5 px-1 rounded-lg transition-all focus:outline-none focus:ring-0",
                 isSelected
                   ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 active:bg-orange-500"
                   : isToday
                   ? "bg-primary/10 text-primary"
                   : "bg-card text-foreground hover:bg-muted"
               )}
             >
               <span className={cn(
                 "text-[9px] font-medium uppercase",
                 isSelected ? "" : "opacity-70"
               )}>
                 {format(day, "EEE", { locale: tr })}
               </span>
               <span className="text-base font-bold mt-0.5">{format(day, "d")}</span>
             </button>
           );
         })}
       </div>

      {/* Classes for selected date */}
      <div className="sticky top-0 z-10 bg-background pb-2 mb-2 pt-2">
        <h2 className="text-lg font-bold">
          {format(selectedDate, "d MMMM EEEE", { locale: tr })}
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-6">
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
           {classes.map((cls, idx) => {
             const showMore = classes.length > 3 && idx === 2 && !expandedClasses;
            const isFull = (cls.current_count || 0) >= cls.capacity;
            const classDateTime = parse(`${cls.date} ${cls.start_time}`, "yyyy-MM-dd HH:mm", new Date());
            const isPastClass = isPast(classDateTime);

            if (classes.length > 3 && idx > 2 && !expandedClasses) return null;

            return (
              <React.Fragment key={cls.id}>
              <Link to={isPastClass ? undefined : `/class/${cls.id}`} className={isPastClass ? "pointer-events-none" : ""}>
                <Card className={cn(
                    "p-4 flex items-center gap-3 transition-all",
                  isPastClass ? "opacity-40" : isFull ? "opacity-60 hover:shadow-md active:scale-[0.98]" : "hover:shadow-lg active:scale-[0.98]"
                )}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {categoryEmojis[cls.category] || "⭐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{cls.title}</p>
                      {isFull && (
                        <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full shrink-0">
                          DOLU
                        </span>
                      )}
                    </div>
                    {cls.instructor && (
                      <p className="text-xs text-muted-foreground mt-0.5">{cls.instructor}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {cls.start_time} - {cls.end_time}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {cls.current_count || 0}/{cls.capacity}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
              {showMore && (
                <button
                  onClick={() => setExpandedClasses(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-primary hover:bg-muted rounded-lg transition-all"
                >
                  <span>{classes.length - 3} daha göster</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
              </React.Fragment>
              );
              })}
              {expandedClasses && classes.length > 3 && (
                <button
                  onClick={() => setExpandedClasses(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-all"
                >
                  <span>Kapat</span>
                  <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                </button>
              )}
             </div>
              )}
              </div>
              </PullToRefresh>

    <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
      <DialogContent className="w-full">
        <DialogHeader>
          <DialogTitle>Tarih Seç</DialogTitle>
        </DialogHeader>
        <CalendarPicker onDateSelect={handleDateSelect} />
      </DialogContent>
    </Dialog>
    </>
  );
}