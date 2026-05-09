import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Trash2, Users, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import ClassAttendees from "@/components/admin/ClassAttendees";

const CATEGORIES = [
  { value: "hyrox", label: "Hyrox" },
  { value: "crossfit", label: "Crossfit" },
  { value: "fitness", label: "Fitness" },
  { value: "other", label: "Diğer" },
];

export default function AdminClasses() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [viewAttendeesFor, setViewAttendeesFor] = useState(null);
  const [form, setForm] = useState({
    title: "", instructor: "", date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00", end_time: "10:00", capacity: 20, description: "", category: "fitness",
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["adminClasses"],
    queryFn: () => base44.entities.ClassSchedule.list("-date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassSchedule.create({ ...data, current_count: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminClasses"] });
      setShowForm(false);
      setForm({ title: "", instructor: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "09:00", end_time: "10:00", capacity: 20, description: "", category: "fitness" });
      toast.success("Ders oluşturuldu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminClasses"] });
      toast.success("Ders silindi");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Dersler</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Ders
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Ders Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Ders Adı</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örn: Sabah Yogası" />
              </div>
              <div>
                <Label>Eğitmen</Label>
                <Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} placeholder="Eğitmen adı" />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tarih</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Başlangıç</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <Label>Bitiş</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Kapasite</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ders hakkında bilgi..." />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || createMutation.isPending}
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Ders Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendees Dialog */}
      <ClassAttendees classItem={viewAttendeesFor} onClose={() => setViewAttendeesFor(null)} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </Card>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Henüz ders eklenmemiş
        </Card>
      ) : (
        <div className="space-y-2">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{cls.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(cls.date + "T00:00:00"), "d MMM yyyy", { locale: tr })} • {cls.start_time} - {cls.end_time}
                  </p>
                  {cls.instructor && <p className="text-xs text-muted-foreground mt-0.5">{cls.instructor}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewAttendeesFor(cls)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground mx-1">
                    {cls.current_count || 0}/{cls.capacity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteMutation.mutate(cls.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}