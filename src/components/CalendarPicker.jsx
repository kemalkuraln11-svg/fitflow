import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, isSameDay, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CalendarPicker({ minDate = new Date(), onDateSelect }) {
  const [displayMonth, setDisplayMonth] = useState(new Date());
  
  const monthDays = useMemo(() => {
    const start = startOfMonth(displayMonth);
    const end = endOfMonth(displayMonth);
    return eachDayOfInterval({ start, end });
  }, [displayMonth]);

  const firstDayOfWeek = useMemo(() => {
    return monthDays[0].getDay() === 0 ? 6 : monthDays[0].getDay() - 1;
  }, [monthDays]);

  const minDateNormalized = startOfDay(minDate);

  const canGoPrev = isBefore(startOfMonth(addMonths(displayMonth, -1)), startOfMonth(minDate));

  return (
    <div className="space-y-4">
      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={canGoPrev}
          onClick={() => setDisplayMonth(addMonths(displayMonth, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="font-semibold text-sm flex-1 text-center">
          {format(displayMonth, "MMMM yyyy", { locale: tr })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {["Ptz", "Salı", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Month days */}
          {monthDays.map((day) => {
            const isDisabled = isBefore(startOfDay(day), minDateNormalized);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isDisabled && onDateSelect(day)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square rounded-lg text-sm font-medium transition-all py-2",
                  isDisabled
                    ? "text-muted-foreground opacity-30 cursor-not-allowed"
                    : isToday
                    ? "bg-primary/10 text-primary font-bold"
                    : "bg-card hover:bg-muted text-foreground"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}