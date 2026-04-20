import { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { User, CreditCard, HelpCircle, LogOut, Camera, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const Perfil = () => {
  const { user, profile, subscription, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notifyLikes, setNotifyLikes] = useState<boolean>(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const { registerPush } = usePushNotifications();

  const handleEnablePush = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Seu navegador não suporta notificações");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error("Notificações bloqueadas. Habilite nas configurações do navegador.");
      return;
    }
    await registerPush();
    setPushPermission(Notification.permission);
    if (Notification.permission === "granted") {
      toast.success("Notificações ativadas! 🦁");
    }
  };

  useEffect(() => {
    if (user) {
      loadAvatar();
      loadNotifyPref();
    }
  }, [user]);

  const loadNotifyPref = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("notify_likes")
      .eq("id", user.id)
      .single();
    if (data) setNotifyLikes(data.notify_likes !== false);
  };

  const toggleNotifyLikes = async (value: boolean) => {
    if (!user) return;
    setNotifyLikes(value);
    const { error } = await supabase
      .from("profiles")
      .update({ notify_likes: value })
      .eq("id", user.id);
    if (error) {
      setNotifyLikes(!value);
      toast.error("Erro ao salvar preferência");
    }
  };

  const loadAvatar = async () => {
    if (!user) return;
    const { data } = await supabase.storage
      .from("avatars")
      .list(user.id, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

    if (data && data.length > 0) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(`${user.id}/${data[0].name}`);
      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`);
      toast.success("Foto atualizada! 📸");
    } catch (err: any) {
      toast.error("Erro ao enviar foto");
    }
    setUploading(false);
  };

  const handleCancelSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir portal");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getStatusLabel = () => {
    if (!subscription) return { label: "Carregando...", color: "bg-muted text-muted-foreground" };
    if (subscription.status === "trialing") return { label: "Trial Ativo", color: "bg-primary/15 text-primary" };
    if (subscription.subscribed) return { label: "Assinante Ativa", color: "bg-green-100 text-green-600" };
    return { label: "Inativa", color: "bg-destructive/15 text-destructive" };
  };

  const status = getStatusLabel();

  return (
    <AppLayout>
      <h1 className="text-3xl text-foreground mb-6 uppercase">Meu Perfil</h1>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative w-20 h-20 rounded-full flex-shrink-0 group"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Foto de perfil"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full pink-gradient flex items-center justify-center shadow-lg">
              <User size={32} className="text-primary-foreground" />
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-background group-hover:scale-110 transition-transform">
            <Camera size={14} className="text-primary-foreground" />
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <div>
          <p className="font-heading text-xl text-foreground">{profile?.full_name || "Leoa"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="soft-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-heading text-primary">Status da Assinatura</span>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${status.color}`}>{status.label}</span>
        </div>
        {subscription?.trial_end && (
          <p className="text-sm text-muted-foreground mb-3">
            Trial até: {new Date(subscription.trial_end).toLocaleDateString("pt-BR")}
          </p>
        )}
        <Button onClick={handleCancelSubscription} variant="outline"
          className="w-full border-destructive text-destructive hover:bg-destructive/10 h-12 text-base rounded-2xl font-bold">
          Gerenciar Assinatura
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { icon: User, label: "Editar dados do Quiz", desc: "Atualize suas informações", action: () => navigate("/onboarding/motivacao") },
          { icon: CreditCard, label: "Assinatura", desc: "Gerenciar plano e pagamento", action: handleCancelSubscription },
          { icon: HelpCircle, label: "Suporte", desc: "Fale com a Alcateia", action: () => {} },
        ].map((item) => (
          <button key={item.label} onClick={item.action} className="soft-card p-5 w-full flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <item.icon size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-base text-foreground font-bold">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="soft-card p-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <Bell size={18} className="text-primary" />
          </div>
          <p className="font-heading text-base text-foreground">Notificações</p>
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm font-bold text-foreground">Curtidas no meu post</p>
            <p className="text-xs text-muted-foreground">Avisar quando alguém curtir</p>
          </div>
          <Switch checked={notifyLikes} onCheckedChange={toggleNotifyLikes} />
        </label>
      </div>

      <Button onClick={handleSignOut}
        className="w-full mt-6 pink-gradient text-primary-foreground font-heading h-14 text-base rounded-2xl shadow-lg">
        <LogOut size={18} className="mr-2" /> Sair da Conta
      </Button>
    </AppLayout>
  );
};

export default Perfil;
