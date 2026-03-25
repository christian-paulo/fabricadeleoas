import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockData = [
  { date: "01/03", peso: 68, cintura: 75, quadril: 100 },
  { date: "08/03", peso: 67.5, cintura: 74, quadril: 99.5 },
  { date: "15/03", peso: 67, cintura: 73.5, quadril: 99 },
  { date: "22/03", peso: 66.8, cintura: 73, quadril: 98.5 },
];

const Evolucao = () => {
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", thigh: "", arm: "" });

  const fields = [
    { key: "weight", label: "Peso (kg)" },
    { key: "waist", label: "Cintura (cm)" },
    { key: "hip", label: "Quadril (cm)" },
    { key: "thigh", label: "Coxa (cm)" },
    { key: "arm", label: "Braço (cm)" },
  ] as const;

  return (
    <AppLayout>
      <h1 className="text-2xl text-foreground mb-1">Metamorfose 🦋</h1>
      <p className="text-sm text-muted-foreground mb-6">Acompanhe sua evolução</p>

      {/* Form */}
      <div className="neu-card p-5 mb-6">
        <h3 className="text-sm font-heading text-primary mb-4">Registrar Medidas</h3>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input
                type="number"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="bg-input border-border text-foreground mt-1 h-10"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <Button className="w-full gold-gradient text-primary-foreground font-heading mt-4 h-10 rounded-xl">
          Salvar Medidas
        </Button>
      </div>

      {/* Chart */}
      <div className="neu-card p-5">
        <h3 className="text-sm font-heading text-primary mb-4">Evolução</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 55%)" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(0 0% 13%)", border: "1px solid hsl(0 0% 20%)", borderRadius: "12px", fontSize: 12 }}
              labelStyle={{ color: "hsl(46 65% 52%)" }}
            />
            <Line type="monotone" dataKey="peso" stroke="hsl(46 65% 52%)" strokeWidth={2} dot={{ fill: "hsl(46 65% 52%)" }} />
            <Line type="monotone" dataKey="cintura" stroke="hsl(0 71% 86%)" strokeWidth={2} dot={{ fill: "hsl(0 71% 86%)" }} />
            <Line type="monotone" dataKey="quadril" stroke="hsl(0 0% 70%)" strokeWidth={2} dot={{ fill: "hsl(0 0% 70%)" }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 justify-center">
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-1 rounded bg-primary inline-block" /> Peso</span>
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-1 rounded bg-accent inline-block" /> Cintura</span>
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-1 rounded bg-muted-foreground inline-block" /> Quadril</span>
        </div>
      </div>
    </AppLayout>
  );
};

export default Evolucao;
