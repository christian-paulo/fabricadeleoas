import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { captureUtms, getStoredUtms, clearStoredUtms } from "@/lib/utm";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => { captureUtms(); }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda de volta, Leoa! 🦁");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, whatsapp } },
        });
        if (error) throw error;

        if (data.user) {
          const utms = getStoredUtms();
          await supabase.from("profiles").update({
            full_name: fullName,
            whatsapp,
            ...utms,
          } as any).eq("id", data.user.id);
          clearStoredUtms();
        }

        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-heading text-primary mb-2">Fábrica de Leoas</h1>
        <p className="text-sm text-muted-foreground">Consultoria Fitness Feminina Premium</p>
      </div>

      <div className="soft-card p-6 w-full">
        <h2 className="text-lg font-heading text-foreground mb-6 text-center">
          {isLogin ? "Entrar na Alcateia" : "Criar Conta"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Nome completo</Label>
                <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                <Input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Senha</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="bg-background border-border text-foreground h-12 mt-1 pr-12 rounded-xl" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading}
            className="w-full pink-gradient text-primary-foreground font-heading h-12 rounded-2xl shadow-lg">
            {loading ? "Carregando..." : isLogin ? "Entrar 🦁" : "Criar Conta"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
            {isLogin ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-8 text-center">
        Ao criar conta, você concorda com nossos termos de uso.
      </p>
    </div>
  );
};

export default Auth;
