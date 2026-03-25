import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Evolucao = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", thigh: "", arm: "" });
  const [chartData, setChartData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const fields = [
    { key: "weight", label: "Peso (kg)" },
    { key: "waist", label: "Cintura (cm)" },
    { key: "hip", label: "Quadril (cm)" },
    { key: "thigh", label: "Coxa (cm)" },
    { key: "arm", label: "Braço (cm)" },
  ] as const;

  const fetchMeasurements = async () => {
    if (!user) return;
    const { data } = await supabase.from("measurements")
      .select("*").eq("profile_id", user.id).order("date", { ascending: true });
    if (data) {
      setChartData(data.map((m: any) => ({
        date: new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        peso: m.weight, cintura: m.waist, quadril: m.hip,
      })));
    }
  };

  useEffect(() => { fetchMeasurements(); }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("measurements").insert({
      profile_id: user.id,
      weight: form.weight ? parseFloat(form.weight) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      hip: form.hip ? parseFloat(form.hip) : null,
      thigh: form.thigh ? parseFloat(form.thigh) : null,
      arm: form.arm ? parseFloat(form.arm) : null,
    });
    if (error) toast.error("Erro ao salvar medidas");
    else {
      toast.success("Medidas salvas! 🦋");
      setForm({ weight: "", waist: "", hip: "", thigh: "", arm: "" });
      fetchMeasurements();
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <h1 className="text-3xl text-foreground mb-1 uppercase">Metamorfose 🦋</h1>
      <p className="text-base text-muted-foreground mb-6">Acompanhe sua evolução</p>

      <div className="neu-card p-6 mb-6">
        <h3 className="text-base font-heading text-primary mb-4 uppercase">Registrar Medidas</h3>
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-sm text-muted-foreground font-medium">{f.label}</Label>
              <Input type="number" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="bg-input border-border text-foreground mt-1 h-12 text-base" placeholder="0" />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving}
          className="w-full gold-gradient text-primary-foreground font-heading mt-5 h-12 rounded-xl text-base">
          {saving ? "Salvando..." : "Salvar Medidas"}
        </Button>
      </div>

      <div className="neu-card p-6">
        <h3 className="text-base font-heading text-primary mb-4 uppercase">Evolução</h3>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(0 0% 60%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(0 0% 60%)" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 22%)", borderRadius: "12px", fontSize: 14 }}
                  labelStyle={{ color: "hsl(46 85% 55%)" }} />
                <Line type="monotone" dataKey="peso" stroke="hsl(46 85% 55%)" strokeWidth={2.5} dot={{ fill: "hsl(46 85% 55%)", r: 4 }} />
                <Line type="monotone" dataKey="cintura" stroke="hsl(0 71% 86%)" strokeWidth={2.5} dot={{ fill: "hsl(0 71% 86%)", r: 4 }} />
                <Line type="monotone" dataKey="quadril" stroke="hsl(0 0% 70%)" strokeWidth={2.5} dot={{ fill: "hsl(0 0% 70%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-4 justify-center">
              <span className="flex items-center gap-2 text-sm font-medium"><span className="w-4 h-1.5 rounded bg-primary inline-block" /> Peso</span>
              <span className="flex items-center gap-2 text-sm font-medium"><span className="w-4 h-1.5 rounded bg-accent inline-block" /> Cintura</span>
              <span className="flex items-center gap-2 text-sm font-medium"><span className="w-4 h-1.5 rounded bg-muted-foreground inline-block" /> Quadril</span>
            </div>
          </>
        ) : (
          <p className="text-base text-muted-foreground text-center py-8">Adicione suas primeiras medidas acima</p>
        )}
      </div>
    </AppLayout>
  );
};

export default Evolucao;
