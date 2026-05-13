import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { User2, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminDailyVisits() {
  const [openDays, setOpenDays] = useState({});

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["dailyVisitsAll"],
    queryFn: () => base44.entities.DailyVisit.list("-visit_date", 500),
  });

  // Group by visit_date
  const grouped = visits.reduce((acc, v) => {
    const key = v.visit_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const toggleDay = (day) => {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold mb-5">Günlük Girişler</h2>

      {sortedDays.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Henüz günlük giriş yok
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedDays.map((day) => {
            const isOpen = !!openDays[day];
            const dayVisits = grouped[day];
            const label = format(new Date(day + "T00:00:00"), "d MMMM yyyy, EEEE", { locale: tr });

            return (
              <div key={day} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleDay(day)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{label}</span>
                    <Badge variant="secondary" className="text-xs">{dayVisits.length} kişi</Badge>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t divide-y">
                    {dayVisits.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User2 className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{v.full_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {v.phone}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {v.class_title ? (
                            <Badge variant="secondary" className="text-xs">
                              {v.class_title}{v.class_time && ` · ${v.class_time}`}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Ders seçilmedi</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}