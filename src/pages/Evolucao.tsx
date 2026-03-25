import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <h1 className="text-2xl text-foreground uppercase mb-1">Metamorfose 🦋</h1>
      <p className="text-sm text-muted-foreground mb-6">Acompanhe sua evolução</p>

      <div className="neu-card p-5 mb-6">
        <h3 className="section-title text-primary mb-4">Registrar Medidas</h3>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground font-semibold mb-1 block">{f.label}</label>
              <Input type="number" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="bg-input border-border text-foreground h-11 text-base font-bold text-center rounded-xl" placeholder="0" />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving}
          className="w-full gold-gradient text-primary-foreground font-heading mt-4 h-12 rounded-2xl text-base">
          {saving ? "Salvando..." : "Salvar Medidas"}
        </Button>
      </div>

      <div className="neu-card p-5">
        <h3 className="section-title text-primary mb-4">Evolução</h3>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 22%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(0 0% 65%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 65%)" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 14%)", border: "1px solid hsl(0 0% 22%)", borderRadius: "12px", fontSize: 13 }}
                  labelStyle={{ color: "hsl(46 80% 50%)" }} />
                <Line type="monotone" dataKey="peso" stroke="hsl(46 80% 50%)" strokeWidth={3} dot={{ fill: "hsl(46 80% 50%)", r: 4 }} />
                <Line type="monotone" dataKey="cintura" stroke="hsl(0 71% 86%)" strokeWidth={3} dot={{ fill: "hsl(0 71% 86%)", r: 4 }} />
                <Line type="monotone" dataKey="quadril" stroke="hsl(0 0% 70%)" strokeWidth={3} dot={{ fill: "hsl(0 0% 70%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
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
