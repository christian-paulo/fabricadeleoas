import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Dumbbell, BarChart3, Plus, Pencil, Trash2, Eye, LogOut } from "lucide-react";
import { toast } from "sonner";

type Exercise = {
  id?: string;
  name: string;
  muscle_group: string;
  equipment: string;
  internal_level: string;
  target_aesthetic_tag: string;
  therapeutic_focus: string;
  video_url: string;
};

const emptyExercise: Exercise = {
  name: "", muscle_group: "", equipment: "", internal_level: "",
  target_aesthetic_tag: "", therapeutic_focus: "", video_url: "",
};

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0 });
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyExercise);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentMeasurements, setStudentMeasurements] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/auth");
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
      fetchExercises();
    }
  }, [isAdmin]);

  const isInTrial = (p: any) => {
    if (!p.trial_start_date) return false;
    const trialEnd = new Date(p.trial_start_date);
    trialEnd.setDate(trialEnd.getDate() + 3);
    return new Date() < trialEnd;
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) {
      setProfiles(data);
      setStats({
        total: data.length,
        active: data.filter((p: any) => p.is_subscriber && !isInTrial(p)).length,
        trial: data.filter((p: any) => p.is_subscriber && isInTrial(p)).length,
      });
    }
  };

  const fetchExercises = async () => {
    const { data } = await supabase.from("exercises").select("*").order("name");
    if (data) setExercises(data);
  };

  const saveExercise = async () => {
    if (!exerciseForm.name) { toast.error("Nome é obrigatório"); return; }
    if (editingId) {
      const { error } = await supabase.from("exercises").update(exerciseForm).eq("id", editingId);
      if (error) toast.error("Erro ao atualizar");
      else toast.success("Exercício atualizado!");
    } else {
      const { error } = await supabase.from("exercises").insert(exerciseForm);
      if (error) toast.error("Erro ao criar");
      else toast.success("Exercício criado!");
    }
    setShowExerciseModal(false);
    setExerciseForm(emptyExercise);
    setEditingId(null);
    fetchExercises();
  };

  const deleteExercise = async (id: string) => {
    if (!confirm("Excluir este exercício?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Exercício excluído"); fetchExercises(); }
  };

  const viewStudentHistory = async (profile: any) => {
    setSelectedStudent(profile);
    const { data } = await supabase.from("measurements")
      .select("*").eq("profile_id", profile.id).order("date", { ascending: false });
    setStudentMeasurements(data || []);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-heading text-primary">Painel Admin 🦁</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="border-border text-foreground text-xs">
            Ir ao App
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total de Alunas", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Alunas Ativas (Pagas)", value: stats.active, icon: BarChart3, color: "text-green-400" },
            { label: "Alunas em Trial", value: stats.trial, icon: BarChart3, color: "text-accent" },
          ].map((kpi) => (
            <div key={kpi.label} className="neu-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <kpi.icon size={22} className={kpi.color} />
              </div>
              <div>
                <p className="text-2xl font-heading text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="students" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users size={16} className="mr-2" /> Alunas
            </TabsTrigger>
            <TabsTrigger value="exercises" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Dumbbell size={16} className="mr-2" /> Exercícios
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <div className="neu-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Objetivo</TableHead>
                    <TableHead className="text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="text-foreground font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.is_subscriber ? "bg-green-500/20 text-green-400" :
                          p.trial_start_date ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {p.is_subscriber ? "Ativa" : p.trial_start_date ? "Trial" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.goal || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => viewStudentHistory(p)}>
                          <Eye size={16} className="text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setExerciseForm(emptyExercise); setEditingId(null); setShowExerciseModal(true); }}
                className="gold-gradient text-primary-foreground font-heading">
                <Plus size={16} className="mr-2" /> Novo Exercício
              </Button>
            </div>
            <div className="neu-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Músculo</TableHead>
                    <TableHead className="text-muted-foreground">Equipamento</TableHead>
                    <TableHead className="text-muted-foreground">Nível</TableHead>
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">Foco Terapêutico</TableHead>
                    <TableHead className="text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises.map((ex: any) => (
                    <TableRow key={ex.id} className="border-border">
                      <TableCell className="text-foreground font-medium">{ex.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.muscle_group}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.equipment}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.internal_level}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.exercise_type || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.therapeutic_focus || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setExerciseForm(ex); setEditingId(ex.id); setShowExerciseModal(true);
                          }}>
                            <Pencil size={14} className="text-primary" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteExercise(ex.id)}>
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {exercises.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum exercício cadastrado
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Exercise Form Modal */}
      <Dialog open={showExerciseModal} onOpenChange={setShowExerciseModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingId ? "Editar Exercício" : "Novo Exercício"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { key: "name", label: "Nome *", span: 2 },
              { key: "muscle_group", label: "Músculo Alvo" },
              { key: "equipment", label: "Equipamento" },
              { key: "internal_level", label: "Nível Interno" },
              { key: "target_aesthetic_tag", label: "Tag Estética" },
              { key: "therapeutic_focus", label: "Foco Terapêutico" },
              { key: "video_url", label: "Link YouTube", span: 2 },
            ].map((f: any) => (
              <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input value={(exerciseForm as any)[f.key] || ""} onChange={(e) => setExerciseForm({ ...exerciseForm, [f.key]: e.target.value })}
                  className="bg-input border-border text-foreground mt-1 h-10" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowExerciseModal(false)} className="border-border text-foreground">
              Cancelar
            </Button>
            <Button onClick={saveExercise} className="gold-gradient text-primary-foreground font-heading">
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student History Modal */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">Evolução de {selectedStudent?.full_name || "Aluna"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-80 overflow-y-auto">
            {studentMeasurements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma medida registrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-muted-foreground">Peso</TableHead>
                    <TableHead className="text-muted-foreground">Cintura</TableHead>
                    <TableHead className="text-muted-foreground">Quadril</TableHead>
                    <TableHead className="text-muted-foreground">Coxa</TableHead>
                    <TableHead className="text-muted-foreground">Braço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentMeasurements.map((m: any) => (
                    <TableRow key={m.id} className="border-border">
                      <TableCell className="text-foreground">{new Date(m.date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-muted-foreground">{m.weight || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.waist || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.hip || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.thigh || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.arm || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
