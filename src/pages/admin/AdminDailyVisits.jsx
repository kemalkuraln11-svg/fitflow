import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { User2, Phone, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminDailyVisits() {
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["dailyVisits", dateFilter],
    queryFn: () =>
      dateFilter
        ? base44.entities.DailyVisit.filter({ visit_date: dateFilter }, "-created_date")
        : base44.entities.DailyVisit.list("-created_date", 100),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-bold">Günlük Girişler</h2>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-auto text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </Card>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          {dateFilter ? "Bu tarihte günlük giriş yok" : "Henüz günlük giriş yok"}
        </Card>
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{v.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {v.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {v.class_title ? (
                    <Badge variant="secondary" className="text-xs">{v.class_title} {v.class_time && `· ${v.class_time}`}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Ders seçilmedi</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(v.visit_date + "T00:00:00"), "d MMM yyyy", { locale: tr })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-1">{visits.length} kayıt</p>
        </div>
      )}
    </div>
  );
}