import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Integrate with Supabase Auth
    setTimeout(() => {
      setLoading(false);
      navigate("/onboarding");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-heading text-primary mb-2">Fábrica de Leoas</h1>
        <p className="text-sm text-muted-foreground">Consultoria Fitness Feminina Premium</p>
      </div>

      {/* Form */}
      <div className="neu-card p-6 w-full">
        <h2 className="text-lg font-heading text-foreground mb-6 text-center">
          {isLogin ? "Entrar na Alcateia" : "Criar Conta"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="bg-input border-border text-foreground h-12 mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-input border-border text-foreground h-12 mt-1"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gold-gradient text-primary-foreground font-heading h-12 rounded-xl"
          >
            {loading ? "Carregando..." : isLogin ? "Entrar 🦁" : "Criar Conta"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
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
