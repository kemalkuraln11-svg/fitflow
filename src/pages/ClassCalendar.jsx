import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import UserHeader from "@/components/UserHeader";
import ExpiredMembershipModal from "@/components/ExpiredMembershipModal";
import { format, addDays, startOfWeek, isSameDay, parseISO, isSameWeek } from "date-fns";
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
    const newWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    setWeekStart(newWeekStart);
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
      if (diff > 0) {
        const newDate = addDays(selectedDate, 1);
        const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
        setWeekStart(newWeekStart);
        setSelectedDate(newDate);
      } else {
        const newDate = addDays(selectedDate, -1);
        const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
        setWeekStart(newWeekStart);
        setSelectedDate(newDate);
      }
    }
    setTouchStart(null);
  };

  return (
    <>
    <ExpiredMembershipModal />
    <UserHeader />
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-[1400px] mx-auto px-8 pt-8 pb-24">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Sınıf Takvimi</h1>

       {/* Week navigation */}
       <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            const newDate = addDays(selectedDate, -1);
            const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
            setWeekStart(newWeekStart);
            setSelectedDate(newDate);
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
            const newDate = addDays(selectedDate, 1);
            const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
            setWeekStart(newWeekStart);
            setSelectedDate(newDate);
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Week strip */}
      <div 
       className="flex gap-3 mb-10 overflow-x-auto pb-2"
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
               const newWeekStart = startOfWeek(day, { weekStartsOn: 1 });
               setWeekStart(newWeekStart);
             }}
              className={cn(
                 "flex flex-col items-center min-w-[64px] py-3.5 px-3 rounded-lg transition-all focus:outline-none focus:ring-0",
                isSelected
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 active:bg-orange-500"
                  : isToday
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-foreground hover:bg-muted"
              )}
            >
              <span className={cn(
                "text-[10px] font-medium uppercase",
                isSelected ? "" : "opacity-70"
              )}>
                {format(day, "EEE", { locale: tr })}
              </span>
              <span className="text-lg font-bold mt-0.5">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Classes for selected date */}
      <div className="sticky top-0 z-10 bg-background pb-6 mb-8 pt-3">
        <h2 className="text-2xl font-bold">
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
        <div className="space-y-6">
           {classes.map((cls, idx) => {
             const showMore = classes.length > 3 && idx === 2 && !expandedClasses;
            const isFull = (cls.current_count || 0) >= cls.capacity;

            if (classes.length > 3 && idx > 2 && !expandedClasses) return null;

            return (
              <>
              <Link key={cls.id} to={`/class/${cls.id}`}>
                <Card className={cn(
                    "p-6 flex items-center gap-5 transition-all active:scale-[0.98] hover:shadow-lg",
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
              {showMore && (
                <button
                  onClick={() => setExpandedClasses(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-all"
                >
                  <span>{classes.length - 3} daha göster</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
              </>
              );
              })}
              {expandedClasses && classes.length > 3 && (
                <button
                  onClick={() => setExpandedClasses(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-all"
                >
                  <span>Kapat</span>
                  <ChevronDown className="w-4 h-4 rotate-180" />
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
        <CalendarPicker minDate={new Date()} onDateSelect={handleDateSelect} />
      </DialogContent>
    </Dialog>
    </>
  );
}