import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Users, Dumbbell, BarChart3, Plus, Pencil, Trash2, Eye, LogOut, Menu,
  ChevronLeft, ChevronRight, Search, LayoutDashboard, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

type Exercise = {
  id?: string;
  name: string;
  muscle_group: string;
  equipment: string;
  internal_level: string;
  target_aesthetic_tag: string;
  therapeutic_focus: string;
  exercise_type: string;
  video_url: string;
};

const emptyExercise: Exercise = {
  name: "", muscle_group: "", equipment: "", internal_level: "",
  target_aesthetic_tag: "", therapeutic_focus: "", exercise_type: "", video_url: "",
};

const ITEMS_PER_PAGE = 10;

type Section = "overview" | "students" | "exercises";

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
  const [activeSection, setActiveSection] = useState<Section>("overview");

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [studentPage, setStudentPage] = useState(1);

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all");
  const [exerciseEquipFilter, setExerciseEquipFilter] = useState("all");
  const [exercisePage, setExercisePage] = useState(1);

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

  const getStatus = (p: any) => {
    if (p.is_subscriber && isInTrial(p)) return "trial";
    if (p.is_subscriber) return "ativa";
    return "inativa";
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

  // Filtered & paginated students
  const filteredStudents = useMemo(() => {
    let list = profiles;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      list = list.filter((p) => (p.full_name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q));
    }
    if (studentStatusFilter !== "all") {
      list = list.filter((p) => getStatus(p) === studentStatusFilter);
    }
    return list;
  }, [profiles, studentSearch, studentStatusFilter]);

  const studentTotalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const paginatedStudents = filteredStudents.slice((studentPage - 1) * ITEMS_PER_PAGE, studentPage * ITEMS_PER_PAGE);

  // Filtered & paginated exercises
  const muscleGroups = useMemo(() => [...new Set(exercises.map((e: any) => e.muscle_group).filter(Boolean))], [exercises]);
  const equipmentTypes = useMemo(() => [...new Set(exercises.map((e: any) => e.equipment).filter(Boolean))], [exercises]);

  const filteredExercises = useMemo(() => {
    let list = exercises;
    if (exerciseSearch) {
      const q = exerciseSearch.toLowerCase();
      list = list.filter((e: any) => e.name.toLowerCase().includes(q));
    }
    if (exerciseMuscleFilter !== "all") {
      list = list.filter((e: any) => e.muscle_group === exerciseMuscleFilter);
    }
    if (exerciseEquipFilter !== "all") {
      list = list.filter((e: any) => e.equipment === exerciseEquipFilter);
    }
    return list;
  }, [exercises, exerciseSearch, exerciseMuscleFilter, exerciseEquipFilter]);

  const exerciseTotalPages = Math.max(1, Math.ceil(filteredExercises.length / ITEMS_PER_PAGE));
  const paginatedExercises = filteredExercises.slice((exercisePage - 1) * ITEMS_PER_PAGE, exercisePage * ITEMS_PER_PAGE);

  // Reset pages on filter change
  useEffect(() => { setStudentPage(1); }, [studentSearch, studentStatusFilter]);
  useEffect(() => { setExercisePage(1); }, [exerciseSearch, exerciseMuscleFilter, exerciseEquipFilter]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  const sidebarItems = [
    { title: "Visão Geral", section: "overview" as Section, icon: LayoutDashboard },
    { title: "Alunas", section: "students" as Section, icon: Users },
    { title: "Exercícios", section: "exercises" as Section, icon: Dumbbell },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarContent className="bg-card pt-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary font-heading text-xs tracking-widest uppercase">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.section}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.section)}
                        isActive={activeSection === item.section}
                        className={`${activeSection === item.section ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Voltar ao App</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={async () => { await signOut(); navigate("/auth"); }} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <h1 className="text-lg font-heading text-primary">
              {activeSection === "overview" && "Visão Geral"}
              {activeSection === "students" && "Gestão de Alunas"}
              {activeSection === "exercises" && "Biblioteca de Exercícios"}
            </h1>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {/* ===== OVERVIEW ===== */}
            {activeSection === "overview" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Total de Alunas", value: stats.total, icon: Users, color: "text-primary" },
                    { label: "Alunas Ativas (Pagas)", value: stats.active, icon: BarChart3, color: "text-green-400" },
                    { label: "Alunas em Trial", value: stats.trial, icon: BarChart3, color: "text-accent" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="neu-card p-6 flex items-center gap-4 cursor-pointer hover:gold-glow transition-shadow"
                      onClick={() => setActiveSection("students")}>
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                        <kpi.icon size={24} className={kpi.color} />
                      </div>
                      <div>
                        <p className="text-3xl font-heading text-foreground">{kpi.value}</p>
                        <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="neu-card p-6 cursor-pointer hover:gold-glow transition-shadow" onClick={() => setActiveSection("students")}>
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="text-primary" size={20} />
                      <h3 className="font-heading text-foreground text-lg">Alunas</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Gerencie alunas, veja status e acompanhe medidas.</p>
                  </div>
                  <div className="neu-card p-6 cursor-pointer hover:gold-glow transition-shadow" onClick={() => setActiveSection("exercises")}>
                    <div className="flex items-center gap-3 mb-2">
                      <Dumbbell className="text-primary" size={20} />
                      <h3 className="font-heading text-foreground text-lg">Exercícios</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{exercises.length} exercícios cadastrados na biblioteca.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STUDENTS ===== */}
            {activeSection === "students" && (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input placeholder="Buscar por nome ou email..." value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 bg-input border-border text-foreground h-10" />
                  </div>
                  <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                    <SelectTrigger className="w-40 bg-input border-border text-foreground h-10">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      {paginatedStudents.map((p) => {
                        const status = getStatus(p);
                        return (
                          <TableRow key={p.id} className="border-border">
                            <TableCell className="text-foreground font-medium">{p.full_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                status === "trial" ? "bg-primary/20 text-primary" :
                                status === "ativa" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                              }`}>
                                {status === "trial" ? "Trial" : status === "ativa" ? "Ativa" : "Inativa"}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{p.goal || "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => viewStudentHistory(p)}>
                                <Eye size={16} className="text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedStudents.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma aluna encontrada
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredStudents.length} aluna{filteredStudents.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={studentPage <= 1}
                      onClick={() => setStudentPage(studentPage - 1)} className="border-border text-foreground h-8 w-8 p-0">
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm text-muted-foreground">{studentPage} / {studentTotalPages}</span>
                    <Button variant="outline" size="sm" disabled={studentPage >= studentTotalPages}
                      onClick={() => setStudentPage(studentPage + 1)} className="border-border text-foreground h-8 w-8 p-0">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== EXERCISES ===== */}
            {activeSection === "exercises" && (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input placeholder="Buscar exercício..." value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      className="pl-9 bg-input border-border text-foreground h-10" />
                  </div>
                  <Select value={exerciseMuscleFilter} onValueChange={setExerciseMuscleFilter}>
                    <SelectTrigger className="w-44 bg-input border-border text-foreground h-10">
                      <SelectValue placeholder="Músculo" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos Músculos</SelectItem>
                      {muscleGroups.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={exerciseEquipFilter} onValueChange={setExerciseEquipFilter}>
                    <SelectTrigger className="w-44 bg-input border-border text-foreground h-10">
                      <SelectValue placeholder="Equipamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos Equip.</SelectItem>
                      {equipmentTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { setExerciseForm(emptyExercise); setEditingId(null); setShowExerciseModal(true); }}
                    className="gold-gradient text-primary-foreground font-heading h-10">
                    <Plus size={16} className="mr-2" /> Novo Exercício
                  </Button>
                </div>

                <div className="neu-card overflow-x-auto">
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
                      {paginatedExercises.map((ex: any) => (
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
                      {paginatedExercises.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum exercício encontrado
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredExercises.length} exercício{filteredExercises.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={exercisePage <= 1}
                      onClick={() => setExercisePage(exercisePage - 1)} className="border-border text-foreground h-8 w-8 p-0">
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm text-muted-foreground">{exercisePage} / {exerciseTotalPages}</span>
                    <Button variant="outline" size="sm" disabled={exercisePage >= exerciseTotalPages}
                      onClick={() => setExercisePage(exercisePage + 1)} className="border-border text-foreground h-8 w-8 p-0">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

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
              { key: "exercise_type", label: "Tipo de Exercício" },
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
    </SidebarProvider>
  );
};

export default Admin;