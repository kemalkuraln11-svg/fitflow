import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInDays, addDays, addMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Trash2, Eye, EyeOff, Copy, Pencil, Snowflake, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

function generateUsername(fullName) {
  return fullName
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const APP_DOMAIN = window.location.hostname;

const statusColors = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-muted text-muted-foreground border-border",
  frozen: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const statusLabels = {
  active: "Aktif",
  expired: "Süresi Doldu",
  suspended: "Askıda",
  frozen: "Donduruldu",
};

const getPlanDuration = (planName) => {
  switch (planName) {
    case "Aylık": return 1;
    case "3 Aylık": return 3;
    case "6 Aylık": return 6;
    case "Yıllık": return 12;
    default: return 1;
  }
};

export default function AdminMembers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPasswordFor, setShowPasswordFor] = useState(null);
  const [createdMember, setCreatedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  const emptyForm = {
    user_name: "", password: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    plan_name: "Aylık", status: "active",
  };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(null);

  const autoUsername = generateUsername(form.user_name);
  const autoEmail = autoUsername ? `${autoUsername}@${APP_DOMAIN}` : "";

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["allMembers"],
    queryFn: () => base44.entities.Membership.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Membership.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      setShowForm(false);
      setCreatedMember(result);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Membership.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      setEditingMember(null);
      toast.success("Üye bilgileri güncellendi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Membership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allMembers"] });
      toast.success("Üyelik silindi");
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      ...form,
      username: autoUsername,
      user_email: autoEmail,
    });
  };

  const openEdit = (member) => {
    setEditForm({
      user_name: member.user_name,
      username: member.username,
      password: member.password,
      start_date: member.start_date,
      end_date: member.end_date,
      plan_name: member.plan_name || "Aylık",
      status: member.status,
    });
    setEditingMember(member);
  };

  const handleUpdate = () => {
    updateMutation.mutate({ id: editingMember.id, data: editForm });
  };

  const handleFreeze = (member) => {
    if (member.status === "frozen") {
      // Çöz: dondurulduğundan bugüne kadar geçen günü bitiş tarihine ekle
      const frozenAt = parseISO(member.frozen_at);
      const daysFrozen = differenceInDays(new Date(), frozenAt);
      const newEndDate = format(addDays(parseISO(member.end_date), daysFrozen), "yyyy-MM-dd");
      updateMutation.mutate({
        id: member.id,
        data: { status: "active", frozen_at: null, end_date: newEndDate },
      });
      toast.success(`Üyelik çözüldü. Bitiş tarihi ${daysFrozen} gün uzatıldı.`);
    } else {
      // Dondur
      updateMutation.mutate({
        id: member.id,
        data: { status: "frozen", frozen_at: format(new Date(), "yyyy-MM-dd") },
      });
      toast.success("Üyelik donduruldu");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Üyeler</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Üye
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Üye Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Ad Soyad</Label>
                <Input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} placeholder="Ahmet Yılmaz" />
              </div>
              {autoUsername && (
                <div className="bg-secondary/60 rounded-xl p-3 text-sm space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Otomatik oluşturulan kullanıcı adı:</p>
                  <p className="font-bold text-primary text-base">{autoUsername}</p>
                </div>
              )}
              <div>
                <Label>Şifre</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Şifre belirleyin" />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={form.plan_name} onValueChange={(v) => {
                  const months = getPlanDuration(v);
                  const startDate = new Date();
                  const endDate = addMonths(startDate, months);
                  setForm({
                    ...form,
                    plan_name: v,
                    start_date: format(startDate, "yyyy-MM-dd"),
                    end_date: format(endDate, "yyyy-MM-dd"),
                  });
                }}>
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
              <Button className="w-full" onClick={handleCreate} disabled={!form.user_name || !form.password || createMutation.isPending}>
                {createMutation.isPending ? "Oluşturuluyor..." : "Üye Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Created member credentials dialog */}
      <Dialog open={!!createdMember} onOpenChange={() => setCreatedMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>✅ Üye Oluşturuldu</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">Bu bilgileri kullanıcıya verin:</p>
            <div className="bg-primary/10 rounded-xl p-4 space-y-3 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Kullanıcı Adı</p>
                  <p className="font-bold text-lg text-foreground">{createdMember?.username}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdMember?.username)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="border-t border-primary/20 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Şifre</p>
                  <p className="font-bold text-lg text-foreground">{createdMember?.password}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdMember?.password)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => setCreatedMember(null)}>Tamam</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit member dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Üye Düzenle</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Ad Soyad</Label>
                <Input value={editForm.user_name} onChange={(e) => setEditForm({ ...editForm, user_name: e.target.value })} />
              </div>
              <div>
                <Label>Kullanıcı Adı</Label>
                <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
              </div>
              <div>
                <Label>Şifre</Label>
                <Input type="text" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={editForm.plan_name} onValueChange={(v) => setEditForm({ ...editForm, plan_name: v })}>
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
                  <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Bitiş</Label>
                  <Input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        <Card className="p-8 text-center text-muted-foreground text-sm">Henüz üye eklenmemiş</Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const daysLeft = Math.max(0, differenceInDays(parseISO(member.end_date), new Date()));
            const isShowingPassword = showPasswordFor === member.id;
            const isFrozen = member.status === "frozen";
            return (
              <Card key={member.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{member.user_name}</p>
                      <Badge variant="outline" className={statusColors[member.status]}>
                        {isFrozen && <Snowflake className="w-3 h-3 mr-1" />}
                        {statusLabels[member.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>👤 {member.username}</span>
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => setShowPasswordFor(isShowingPassword ? null : member.id)}
                      >
                        {isShowingPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {isShowingPassword ? member.password : "••••••"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.plan_name} •{" "}
                      {isFrozen
                        ? `Donduruldu: ${format(parseISO(member.frozen_at), "d MMM yyyy", { locale: tr })}`
                        : `${daysLeft} gün kaldı • ${format(parseISO(member.end_date), "d MMM yyyy", { locale: tr })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      title="Düzenle"
                      onClick={() => openEdit(member)}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      title={isFrozen ? "Üyeliği Çöz" : "Üyeliği Dondur"}
                      onClick={() => handleFreeze(member)}
                    >
                      {isFrozen
                        ? <Sun className="w-4 h-4 text-orange-500" />
                        : <Snowflake className="w-4 h-4 text-blue-500" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
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