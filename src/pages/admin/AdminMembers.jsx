import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminMembers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    user_email: "", user_name: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    plan_name: "Aylık", status: "active",
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["allMembers"],
    queryFn: () => base44.entities.Membership.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Membership.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      setShowForm(false);
      setForm({
        user_email: "", user_name: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        plan_name: "Aylık", status: "active",
      });
      toast.success("Üyelik oluşturuldu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Membership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      toast.success("Üyelik silindi");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }) =>
      base44.entities.Membership.update(id, {
        status: currentStatus === "active" ? "suspended" : "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      toast.success("Durum güncellendi");
    },
  });

  const statusColors = {
    active: "bg-accent/10 text-accent border-accent/20",
    expired: "bg-destructive/10 text-destructive border-destructive/20",
    suspended: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Üyeler</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Üyelik
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Üyelik Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Ad Soyad</Label>
                <Input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} placeholder="Kullanıcı adı" />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input type="email" value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} placeholder="kullanici@email.com" />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={form.plan_name} onValueChange={(v) => setForm({ ...form, plan_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aylık">Aylık</SelectItem>
                    <SelectItem value="3 Aylık">3 Aylık</SelectItem>
                    <SelectItem value="6 Aylık">6 Aylık</SelectItem>
                    <SelectItem value="Yıllık">Yıllık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Başlangıç</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Bitiş</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.user_email || !form.user_name || createMutation.isPending}
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Üyelik Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Henüz üye eklenmemiş
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const daysLeft = Math.max(0, differenceInDays(parseISO(member.end_date), new Date()));
            return (
              <Card key={member.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{member.user_name}</p>
                      <Badge variant="outline" className={statusColors[member.status]}>
                        {member.status === "active" ? "Aktif" : member.status === "expired" ? "Süresi Doldu" : "Askıda"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{member.user_email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.plan_name} • {daysLeft} gün kaldı • Bitiş: {format(parseISO(member.end_date), "d MMM yyyy", { locale: tr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleStatusMutation.mutate({ id: member.id, currentStatus: member.status })}
                    >
                      {member.status === "active" ? (
                        <UserX className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-accent" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}