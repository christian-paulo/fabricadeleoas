import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  Users, Dumbbell, Plus, Pencil, Trash2, Eye, LogOut,
  ChevronLeft, ChevronRight, Search, LayoutDashboard, ArrowLeft,
  DollarSign, TrendingDown, TrendingUp, UserPlus, AlertTriangle,
  Activity, Target, Globe, ClipboardList, Download, MessageSquare, Pin,
} from "lucide-react";
import { toast } from "sonner";
import NewPostModal from "@/components/NewPostModal";

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

// Preços reais dos planos (valor cobrado por ciclo)
const PLAN_PRICES = {
  monthly: { total: 39.90, months: 1 },
  semestral: { total: 119.90, months: 6 },
  annual: { total: 197.00, months: 12 },
} as const;

// Detecta o plano a partir do campo subscription_plan (texto livre vindo do Stripe/checkout)
const detectPlan = (raw?: string | null): keyof typeof PLAN_PRICES => {
  const s = (raw || "").toLowerCase();
  if (s.includes("anual") || s.includes("annual") || s.includes("ano")) return "annual";
  if (s.includes("mensal") || s.includes("monthly") || s.includes("mês") || s.includes("mes")) return "monthly";
  return "semestral"; // default (plano mais usado)
};

// MRR contribution = valor total do ciclo / nº meses do ciclo
const mrrOf = (raw?: string | null) => {
  const p = PLAN_PRICES[detectPlan(raw)];
  return p.total / p.months;
};

// Valor total pago por ciclo (usado para LTV)
const cycleValueOf = (raw?: string | null) => PLAN_PRICES[detectPlan(raw)].total;

type Section = "overview" | "students" | "exercises" | "quiz" | "feed";

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyExercise);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("overview");

  // CRM Drawer
  const [drawerStudent, setDrawerStudent] = useState<any>(null);
  const [drawerMeasurements, setDrawerMeasurements] = useState<any[]>([]);
  const [drawerWorkouts, setDrawerWorkouts] = useState<any[]>([]);

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [studentPage, setStudentPage] = useState(1);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all");
  const [exerciseEquipFilter, setExerciseEquipFilter] = useState("all");
  const [exercisePage, setExercisePage] = useState(1);

  // Quiz responses
  const [quizResponses, setQuizResponses] = useState<any[]>([]);
  const [quizSearch, setQuizSearch] = useState("");
  const [quizGoalFilter, setQuizGoalFilter] = useState("all");
  const [quizPage, setQuizPage] = useState(1);

  // Feed
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (isAdmin) { fetchProfiles(); fetchExercises(); fetchQuizResponses(); fetchFeed(); }
  }, [isAdmin]);

  const fetchFeed = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (!data) return;
    const ids = [...new Set(data.map((p: any) => p.profile_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const pmap: Record<string, any> = {};
    (profs || []).forEach((p: any) => { pmap[p.id] = p; });
    const postIds = data.map((p: any) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);
    const likeMap: Record<string, number> = {};
    (likes || []).forEach((l: any) => { likeMap[l.post_id] = (likeMap[l.post_id] || 0) + 1; });
    setFeedPosts(data.map((p: any) => ({ ...p, author: pmap[p.profile_id], like_count: likeMap[p.id] || 0 })));
  };

  const adminTogglePin = async (post: any) => {
    if (!post.is_pinned) {
      await supabase.from("posts").update({ is_pinned: false }).eq("is_pinned", true);
    }
    const { error } = await supabase
      .from("posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);
    if (error) toast.error("Erro ao fixar");
    else { toast.success(post.is_pinned ? "Desafixado" : "Fixado no topo"); fetchFeed(); }
  };

  const adminDeletePost = async (post: any) => {
    if (!confirm("Excluir este post da Alcateia?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Post excluído"); fetchFeed(); }
  };

  // ─── Helpers ───
  const isInTrial = (p: any) => {
    if (!p.trial_start_date) return false;
    const trialEnd = new Date(p.trial_start_date);
    trialEnd.setDate(trialEnd.getDate() + 7);
    return new Date() < trialEnd;
  };

  const getStatus = (p: any): "trial" | "ativa" | "cancelada" | "inativa" => {
    if (p.canceled_at) return "cancelada";
    if (p.is_subscriber && isInTrial(p)) return "trial";
    if (p.is_subscriber) return "ativa";
    return "inativa";
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    trial: { label: "Trial", color: "bg-primary/20 text-primary" },
    ativa: { label: "Ativa", color: "bg-green-500/20 text-green-400" },
    cancelada: { label: "Cancelada", color: "bg-destructive/20 text-destructive" },
    inativa: { label: "Inativa", color: "bg-muted text-muted-foreground" },
  };

  // ─── Data fetching ───
  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setProfiles(data);
  };

  const fetchQuizResponses = async () => {
    // Combine THREE sources so every lead/aluna that interacted with the funnel
    // appears, regardless of where they dropped off:
    //  1) quiz_leads          → first click on the quiz (may have no profile yet)
    //  2) onboarding_responses → completed the quiz (always has profile_id)
    //  3) profiles            → created account (may have skipped the quiz)
    const [leadsRes, respsRes, profsRes] = await Promise.all([
      supabase.from("quiz_leads" as any).select("*"),
      supabase.from("onboarding_responses").select("*"),
      supabase
        .from("profiles")
        .select("id, full_name, email, goal, target_area, equipment, training_experience, workout_days, workout_duration, onboarding_completed, is_subscriber, subscription_plan, trial_start_date, trial_end_date, canceled_at, created_at"),
    ]);

    const leads = (leadsRes.data as any[]) || [];
    const resps = (respsRes.data as any[]) || [];
    const profs = (profsRes.data as any[]) || [];

    const profById: Record<string, any> = {};
    const profByEmail: Record<string, any> = {};
    profs.forEach((p) => {
      profById[p.id] = p;
      if (p.email) profByEmail[p.email.toLowerCase()] = p;
    });
    const respByProfile: Record<string, any> = {};
    resps.forEach((r) => { respByProfile[r.profile_id] = r; });

    // Build a unified entity keyed by profileId OR by email OR by lead session_id
    type Row = {
      key: string;
      first_click_at?: string | null;
      lead_email?: string | null;
      variant?: string | null;
      profile?: any;
      resp?: any;
    };
    const rowsByKey = new Map<string, Row>();

    const upsert = (key: string, patch: Partial<Row>) => {
      const cur = rowsByKey.get(key) || { key };
      // keep the OLDEST first_click_at if multiple records contribute
      if (patch.first_click_at) {
        if (!cur.first_click_at || new Date(patch.first_click_at) < new Date(cur.first_click_at)) {
          cur.first_click_at = patch.first_click_at;
        }
      }
      if (patch.lead_email && !cur.lead_email) cur.lead_email = patch.lead_email;
      if (patch.variant && !cur.variant) cur.variant = patch.variant;
      if (patch.profile && !cur.profile) cur.profile = patch.profile;
      if (patch.resp && !cur.resp) cur.resp = patch.resp;
      rowsByKey.set(key, cur);
    };

    // Resolve a stable key for any record
    const keyFor = (profileId?: string | null, email?: string | null, fallback?: string) => {
      if (profileId) return `p:${profileId}`;
      if (email) return `e:${email.toLowerCase()}`;
      return `s:${fallback}`;
    };

    // 1) quiz_leads
    leads.forEach((l) => {
      const profile =
        (l.profile_id && profById[l.profile_id]) ||
        (l.email && profByEmail[String(l.email).toLowerCase()]) ||
        null;
      const k = keyFor(profile?.id || l.profile_id, profile?.email || l.email, l.session_id);
      upsert(k, {
        first_click_at: l.first_click_at,
        lead_email: l.email || null,
        variant: l.variant || null,
        profile: profile || undefined,
        resp: profile?.id ? respByProfile[profile.id] : undefined,
      });
    });

    // 2) onboarding_responses (catches alunas with NO quiz_leads row)
    resps.forEach((r) => {
      const profile = profById[r.profile_id];
      const k = keyFor(r.profile_id, profile?.email);
      upsert(k, {
        first_click_at: r.created_at, // fallback timestamp
        profile: profile || { id: r.profile_id },
        resp: r,
      });
    });

    // 3) profiles (catches signups that skipped the quiz entirely)
    profs.forEach((p) => {
      const k = keyFor(p.id, p.email);
      upsert(k, {
        first_click_at: p.created_at,
        profile: p,
        resp: respByProfile[p.id],
      });
    });

    // Determine the funnel stage for each row
    const stageOf = (row: Row): { key: string; label: string; tone: "lead" | "quiz" | "account" | "trial" | "active" | "canceled" } => {
      const p = row.profile || {};
      if (p.canceled_at) return { key: "canceled", label: "Cancelou", tone: "canceled" };
      if (p.is_subscriber && p.subscription_plan) return { key: "active", label: "Assinante", tone: "active" };
      if (p.trial_start_date) return { key: "trial", label: "Trial iniciado", tone: "trial" };
      if (row.resp && Object.keys(row.resp).length > 0) {
        return { key: "quiz_done", label: "Completou quiz (não pagou)", tone: "quiz" };
      }
      if (p.id) return { key: "signup", label: "Criou conta (sem quiz)", tone: "account" };
      return { key: "lead", label: "Apenas clicou", tone: "lead" };
    };

    const merged = Array.from(rowsByKey.values()).map((row) => {
      const stage = stageOf(row);
      return {
        id: row.key,
        first_click_at: row.first_click_at,
        lead_email: row.lead_email,
        variant: row.variant || null,
        profile: row.profile || {},
        stage_key: stage.key,
        stage_label: stage.label,
        stage_tone: stage.tone,
        ...(row.resp || {}),
      };
    });

    // newest first
    merged.sort((a, b) => {
      const ta = a.first_click_at ? new Date(a.first_click_at).getTime() : 0;
      const tb = b.first_click_at ? new Date(b.first_click_at).getTime() : 0;
      return tb - ta;
    });

    setQuizResponses(merged);
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

  // ─── CRM Drawer ───
  const openDrawer = async (profile: any) => {
    setDrawerStudent(profile);
    const [{ data: mData }, { data: wData }] = await Promise.all([
      supabase.from("measurements").select("*").eq("profile_id", profile.id).order("date", { ascending: true }),
      supabase.from("workouts").select("*").eq("profile_id", profile.id).order("date", { ascending: false }).limit(500),
    ]);
    setDrawerMeasurements(mData || []);
    setDrawerWorkouts(wData || []);
  };

  // ─── KPI Calculations ───
  const kpis = useMemo(() => {
    const active = profiles.filter((p) => getStatus(p) === "ativa");
    const trial = profiles.filter((p) => getStatus(p) === "trial");
    const canceled = profiles.filter((p) => getStatus(p) === "cancelada");
    const mrr = active.reduce((sum, p) => sum + mrrOf(p.subscription_plan), 0);
    const avgMrrPerUser = active.length > 0 ? mrr / active.length : 0;
    const avgCycleValue = active.length > 0
      ? active.reduce((sum, p) => sum + cycleValueOf(p.subscription_plan), 0) / active.length
      : PLAN_PRICES.semestral.total;

    // Conversion: profiles that were in trial and became active
    const totalEverTrial = profiles.filter((p) => p.trial_start_date).length;
    const conversionRate = totalEverTrial > 0 ? ((active.length / totalEverTrial) * 100) : 0;

    // Churn: canceled in last 30 days / (active + canceled in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCanceled = canceled.filter((p) => p.canceled_at && new Date(p.canceled_at) > thirtyDaysAgo).length;
    const churnBase = active.length + recentCanceled;
    const churnRate = churnBase > 0 ? ((recentCanceled / churnBase) * 100) : 0;

    // LTV
    const avgMonths = churnRate > 0 ? (100 / churnRate) : 24;
    const ltv = avgMrrPerUser * avgMonths;

    return {
      total: profiles.length,
      active: active.length,
      trial: trial.length,
      canceled: canceled.length,
      inativa: profiles.filter((p) => getStatus(p) === "inativa").length,
      mrr,
      conversionRate,
      churnRate,
      ltv,
    };
  }, [profiles]);

  // ─── Plan distribution (active subscribers only) ───
  const planDistribution = useMemo(() => {
    const active = profiles.filter((p) => getStatus(p) === "ativa");
    const counts = { monthly: 0, semestral: 0, annual: 0 };
    const revenue = { monthly: 0, semestral: 0, annual: 0 };
    active.forEach((p) => {
      const key = detectPlan(p.subscription_plan);
      counts[key]++;
      revenue[key] += mrrOf(p.subscription_plan);
    });
    const total = active.length;
    return [
      { key: "semestral", label: "Semestral", price: "R$ 119,90 / 6 meses", count: counts.semestral, mrr: revenue.semestral, pct: total ? (counts.semestral / total) * 100 : 0, color: "hsl(46 85% 55%)" },
      { key: "annual", label: "Anual", price: "R$ 197,00 / ano", count: counts.annual, mrr: revenue.annual, pct: total ? (counts.annual / total) * 100 : 0, color: "hsl(142 70% 45%)" },
      { key: "monthly", label: "Mensal", price: "R$ 39,90 / mês", count: counts.monthly, mrr: revenue.monthly, pct: total ? (counts.monthly / total) * 100 : 0, color: "hsl(210 80% 60%)" },
    ];
  }, [profiles]);
  const signupChartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    profiles.forEach((p) => {
      if (p.created_at) {
        const day = p.created_at.split("T")[0];
        if (days[day] !== undefined) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      cadastros: count,
    }));
  }, [profiles]);

  const mrrChartData = useMemo(() => {
    // Simplified: show cumulative active subscribers over last 30 days
    const days: { date: string; mrr: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const activeAtDate = profiles.filter((p) => {
        const created = p.created_at?.split("T")[0];
        const canceled = p.canceled_at?.split("T")[0];
        return created && created <= dateStr && p.is_subscriber && (!canceled || canceled > dateStr);
      });
      const mrrAtDate = activeAtDate.reduce((sum, p) => sum + mrrOf(p.subscription_plan), 0);
      days.push({
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        mrr: Math.round(mrrAtDate * 100) / 100,
      });
    }
    return days;
  }, [profiles]);

  // ─── Filtered tables ───
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

  const muscleGroups = useMemo(() => [...new Set(exercises.map((e: any) => e.muscle_group).filter(Boolean))], [exercises]);
  const equipmentTypes = useMemo(() => [...new Set(exercises.map((e: any) => e.equipment).filter(Boolean))], [exercises]);

  const filteredExercises = useMemo(() => {
    let list = exercises;
    if (exerciseSearch) {
      const q = exerciseSearch.toLowerCase();
      list = list.filter((e: any) => e.name.toLowerCase().includes(q));
    }
    if (exerciseMuscleFilter !== "all") list = list.filter((e: any) => e.muscle_group === exerciseMuscleFilter);
    if (exerciseEquipFilter !== "all") list = list.filter((e: any) => e.equipment === exerciseEquipFilter);
    return list;
  }, [exercises, exerciseSearch, exerciseMuscleFilter, exerciseEquipFilter]);

  const exerciseTotalPages = Math.max(1, Math.ceil(filteredExercises.length / ITEMS_PER_PAGE));
  const paginatedExercises = filteredExercises.slice((exercisePage - 1) * ITEMS_PER_PAGE, exercisePage * ITEMS_PER_PAGE);

  useEffect(() => { setStudentPage(1); }, [studentSearch, studentStatusFilter]);
  useEffect(() => { setExercisePage(1); }, [exerciseSearch, exerciseMuscleFilter, exerciseEquipFilter]);
  useEffect(() => { setQuizPage(1); }, [quizSearch, quizGoalFilter]);

  // Quiz filtered
  const quizGoals = useMemo(() => [...new Set(quizResponses.map((r: any) => r.profile?.goal).filter(Boolean))], [quizResponses]);
  const filteredQuiz = useMemo(() => {
    let list = quizResponses;
    if (quizSearch) {
      const q = quizSearch.toLowerCase();
      list = list.filter((r: any) =>
        (r.profile?.full_name || "").toLowerCase().includes(q) ||
        (r.profile?.email || "").toLowerCase().includes(q) ||
        (r.lead_email || "").toLowerCase().includes(q)
      );
    }
    if (quizGoalFilter !== "all") list = list.filter((r: any) => r.profile?.goal === quizGoalFilter);
    return list;
  }, [quizResponses, quizSearch, quizGoalFilter]);
  const quizTotalPages = Math.max(1, Math.ceil(filteredQuiz.length / ITEMS_PER_PAGE));
  const paginatedQuiz = filteredQuiz.slice((quizPage - 1) * ITEMS_PER_PAGE, quizPage * ITEMS_PER_PAGE);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  const sidebarItems = [
    { title: "Visão Geral", section: "overview" as Section, icon: LayoutDashboard },
    { title: "Alunas", section: "students" as Section, icon: Users },
    { title: "Respostas Quiz", section: "quiz" as Section, icon: ClipboardList },
    { title: "Exercícios", section: "exercises" as Section, icon: Dumbbell },
    { title: "Feed Alcateia", section: "feed" as Section, icon: MessageSquare },
  ];

  // Drawer helpers
  const drawerStatus = drawerStudent ? getStatus(drawerStudent) : "inativa";
  const drawerChartData = drawerMeasurements.map((m: any) => ({
    date: new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    peso: m.weight, cintura: m.waist, quadril: m.hip,
  }));
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekWorkouts = drawerWorkouts.filter((w) => new Date(w.date) >= weekAgo);
  const weekCompleted = weekWorkouts.filter((w) => w.completed).length;
  const weekGenerated = weekWorkouts.length;
  const totalCompleted = drawerWorkouts.filter((w) => w.completed).length;
  const totalGenerated = drawerWorkouts.length;
  const completedWorkouts = drawerWorkouts.filter((w) => w.completed);
  const daysInApp = drawerStudent?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(drawerStudent.created_at).getTime()) / 86400000))
    : 0;
  const trialStart = drawerStudent?.trial_start_date ? new Date(drawerStudent.trial_start_date) : null;
  const trialEnd = drawerStudent?.trial_end_date
    ? new Date(drawerStudent.trial_end_date)
    : (trialStart ? new Date(trialStart.getTime() + 7 * 86400000) : null);
  const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / 86400000) : null;
  const planLabel = (() => {
    const p = (drawerStudent?.subscription_plan || "").toLowerCase();
    if (p.includes("semestral") || p.includes("semi")) return "Semestral";
    if (p.includes("mensal") || p.includes("month")) return "Mensal";
    if (p.includes("anual") || p.includes("year")) return "Anual";
    return drawerStudent?.subscription_plan || (drawerStudent?.is_subscriber ? "Ativo" : "—");
  })();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarContent className="bg-card pt-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary font-heading text-xs tracking-widest uppercase">
                Centro de Comando
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.section}>
                      <SidebarMenuButton onClick={() => setActiveSection(item.section)}
                        isActive={activeSection === item.section}
                        className={activeSection === item.section ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}>
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
                      <ArrowLeft className="h-4 w-4" /><span>Voltar ao App</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={async () => { await signOut(); navigate("/auth"); }} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="h-4 w-4" /><span>Sair</span>
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
              {activeSection === "quiz" && "Respostas do Quiz"}
              {activeSection === "exercises" && "Biblioteca de Exercícios"}
              {activeSection === "feed" && "Feed Alcateia"}
            </h1>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {/* ===== OVERVIEW ===== */}
            {activeSection === "overview" && (
              <div className="space-y-6">
                {/* Financial KPIs */}
                <div>
                  <h2 className="text-sm font-heading text-muted-foreground uppercase tracking-widest mb-3">💰 Financeiro</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={DollarSign} label="MRR" value={`R$ ${kpis.mrr.toFixed(2).replace('.', ',')}`} color="text-primary" highlight />
                    <KpiCard icon={TrendingUp} label="Conversão Trial→Pago" value={`${kpis.conversionRate.toFixed(1)}%`} color="text-green-400" />
                    <KpiCard icon={TrendingDown} label="Churn Rate (30d)" value={`${kpis.churnRate.toFixed(1)}%`} color="text-destructive" />
                    <KpiCard icon={Target} label="LTV Estimado" value={`R$ ${kpis.ltv.toFixed(0)}`} color="text-accent" />
                  </div>
                </div>

                {/* Plan Distribution */}
                <div>
                  <h2 className="text-sm font-heading text-muted-foreground uppercase tracking-widest mb-3">📊 Planos Escolhidos (Ativas)</h2>
                  <div className="neu-card p-5">
                    {kpis.active === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma assinante ativa ainda.</p>
                    ) : (
                      <div className="space-y-4">
                        {planDistribution.map((p) => (
                          <div key={p.key}>
                            <div className="flex items-center justify-between mb-1.5 gap-3 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="font-heading text-sm text-foreground">{p.label}</span>
                                <span className="text-xs text-muted-foreground hidden sm:inline">· {p.price}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">
                                  <strong className="text-foreground font-heading text-sm">{p.count}</strong> aluna{p.count === 1 ? "" : "s"}
                                </span>
                                <span className="text-muted-foreground">
                                  MRR: <strong className="text-primary font-heading text-sm">R$ {p.mrr.toFixed(2).replace(".", ",")}</strong>
                                </span>
                                <span className="font-heading text-sm text-foreground tabular-nums w-12 text-right">
                                  {p.pct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>


                {/* User KPIs */}
                <div>
                  <h2 className="text-sm font-heading text-muted-foreground uppercase tracking-widest mb-3">🦁 A Alcateia</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <KpiCard icon={UserPlus} label="Total Cadastros" value={kpis.total} color="text-foreground" onClick={() => setActiveSection("students")} />
                    <KpiCard icon={Activity} label="Trial" value={kpis.trial} color="text-primary" onClick={() => { setStudentStatusFilter("trial"); setActiveSection("students"); }} />
                    <KpiCard icon={Users} label="Ativas (Pagas)" value={kpis.active} color="text-green-400" onClick={() => { setStudentStatusFilter("ativa"); setActiveSection("students"); }} />
                    <KpiCard icon={AlertTriangle} label="Canceladas" value={kpis.canceled} color="text-destructive" onClick={() => { setStudentStatusFilter("cancelada"); setActiveSection("students"); }} />
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="neu-card p-5">
                    <h3 className="text-sm font-heading text-primary mb-4 uppercase tracking-widest">MRR (30 dias)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={mrrChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 22%)", borderRadius: "8px", fontSize: 12 }}
                          formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "MRR"]} />
                        <Line type="monotone" dataKey="mrr" stroke="hsl(46 85% 55%)" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="neu-card p-5">
                    <h3 className="text-sm font-heading text-primary mb-4 uppercase tracking-widest">Novos Cadastros (30 dias)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={signupChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 22%)", borderRadius: "8px", fontSize: 12 }} />
                        <Bar dataKey="cadastros" fill="hsl(46 85% 55%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
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
                    <SelectTrigger className="w-44 bg-input border-border text-foreground h-10">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
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
                        <TableHead className="text-muted-foreground">Plano</TableHead>
                        <TableHead className="text-muted-foreground">Trial até</TableHead>
                        <TableHead className="text-muted-foreground">Objetivo</TableHead>
                        <TableHead className="text-muted-foreground">Origem</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.map((p) => {
                        const st = getStatus(p);
                        const cfg = statusConfig[st];
                        return (
                          <TableRow key={p.id} className="border-border">
                            <TableCell className="text-foreground font-medium">{p.full_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{p.subscription_plan || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {p.trial_end_date
                                ? new Date(p.trial_end_date).toLocaleDateString("pt-BR")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{p.goal || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{p.utm_source || "Orgânico"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => openDrawer(p)}>
                                <Eye size={16} className="text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedStudents.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma aluna encontrada</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Pagination current={studentPage} total={studentTotalPages} count={filteredStudents.length}
                  label="aluna" onPrev={() => setStudentPage(studentPage - 1)} onNext={() => setStudentPage(studentPage + 1)} />
              </div>
            )}

            {/* ===== QUIZ RESPONSES ===== */}
            {activeSection === "quiz" && (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input placeholder="Buscar por nome ou email..." value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      className="pl-9 bg-input border-border text-foreground h-10" />
                  </div>
                  <Select value={quizGoalFilter} onValueChange={setQuizGoalFilter}>
                    <SelectTrigger className="w-48 bg-input border-border text-foreground h-10">
                      <SelectValue placeholder="Objetivo" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos Objetivos</SelectItem>
                      {quizGoals.map((g: string) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="border-border text-foreground h-10" onClick={() => {
                    const headers = ["1º Clique", "Etapa", "Variação", "Nome", "Email", "Idade", "Altura", "Peso Atual", "Meta Peso", "Objetivo", "Área Alvo", "Motivação", "Corpo Atual", "Corpo Desejado", "Barriga", "Quadril", "Local Treino", "Dificuldade", "Rotina", "Flexibilidade", "Psicológico", "Celebração"];
                    const rows = filteredQuiz.map((r: any) => [
                      r.first_click_at ? new Date(r.first_click_at).toLocaleString("pt-BR") : "",
                      r.stage_label || "",
                      r.variant || "default",
                      r.profile?.full_name || "", r.profile?.email || r.lead_email || "", r.idade || "", r.altura || "", r.peso_atual || "", r.meta_peso || "",
                      r.profile?.goal || "", r.profile?.target_area || "", r.motivacao || "", r.corpo_atual || "", r.corpo_desejado || "",
                      r.biotipo || "", r.profile?.equipment || "", r.local_treino || "", r.dificuldade || "", r.rotina || "",
                      r.flexibilidade || "", (r.psicologico || []).join("; "), r.celebracao || "",
                    ]);
                    const csv = [headers.join(","), ...rows.map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "quiz_responses.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download size={16} className="mr-2" /> Exportar CSV
                  </Button>
                </div>

                <div className="neu-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground whitespace-nowrap">1º Clique</TableHead>
                        <TableHead className="text-muted-foreground">Etapa</TableHead>
                        <TableHead className="text-muted-foreground">Variação</TableHead>
                        <TableHead className="text-muted-foreground">Nome</TableHead>
                        <TableHead className="text-muted-foreground">E-mail</TableHead>
                        <TableHead className="text-muted-foreground">Idade</TableHead>
                        <TableHead className="text-muted-foreground">Objetivo</TableHead>
                        <TableHead className="text-muted-foreground">Motivação</TableHead>
                        <TableHead className="text-muted-foreground">Corpo Atual</TableHead>
                        <TableHead className="text-muted-foreground">Meta Peso</TableHead>
                        <TableHead className="text-muted-foreground">Local</TableHead>
                        <TableHead className="text-muted-foreground">Dificuldade</TableHead>
                        <TableHead className="text-muted-foreground">Psicológico</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuiz.map((r: any) => {
                        const dt = r.first_click_at ? new Date(r.first_click_at) : null;
                        const dateStr = dt ? dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
                        const email = r.profile?.email || r.lead_email || "—";
                        const stageColor: Record<string, string> = {
                          lead: "bg-muted text-muted-foreground",
                          quiz: "bg-amber-500/20 text-amber-400",
                          account: "bg-blue-500/20 text-blue-400",
                          trial: "bg-primary/20 text-primary",
                          active: "bg-green-500/20 text-green-400",
                          canceled: "bg-destructive/20 text-destructive",
                        };
                        return (
                          <TableRow key={r.id} className="border-border">
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{dateStr}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${stageColor[r.stage_tone] || "bg-muted text-muted-foreground"}`}>
                                {r.stage_label || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-secondary text-foreground/80 whitespace-nowrap">
                                {r.variant ? r.variant.toUpperCase() : "DEFAULT"}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground font-medium whitespace-nowrap">{r.profile?.full_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{email}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.idade || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.profile?.goal || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[120px] truncate">{r.motivacao || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.corpo_atual || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.meta_peso ? `${r.meta_peso} kg` : "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.local_treino || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.dificuldade || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[120px] truncate">{(r.psicologico || []).join(", ") || "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                const prof = profiles.find((p: any) => p.id === r.profile?.id);
                                if (prof) openDrawer(prof);
                              }}>
                                <Eye size={16} className="text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedQuiz.length === 0 && (
                        <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">Nenhuma resposta encontrada</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Pagination current={quizPage} total={quizTotalPages} count={filteredQuiz.length}
                  label="resposta" onPrev={() => setQuizPage(quizPage - 1)} onNext={() => setQuizPage(quizPage + 1)} />
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
                    <SelectTrigger className="w-44 bg-input border-border text-foreground h-10"><SelectValue placeholder="Músculo" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos Músculos</SelectItem>
                      {muscleGroups.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={exerciseEquipFilter} onValueChange={setExerciseEquipFilter}>
                    <SelectTrigger className="w-44 bg-input border-border text-foreground h-10"><SelectValue placeholder="Equipamento" /></SelectTrigger>
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
                              <Button variant="ghost" size="sm" onClick={() => { setExerciseForm(ex); setEditingId(ex.id); setShowExerciseModal(true); }}>
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
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum exercício encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Pagination current={exercisePage} total={exerciseTotalPages} count={filteredExercises.length}
                  label="exercício" onPrev={() => setExercisePage(exercisePage - 1)} onNext={() => setExercisePage(exercisePage + 1)} />
              </div>
            )}

            {/* ===== FEED ===== */}
            {activeSection === "feed" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{feedPosts.length} posts publicados</p>
                  <Button onClick={() => setShowNewPost(true)} className="gold-gradient text-primary-foreground font-heading h-10">
                    <Plus size={16} className="mr-2" /> Postar como Gilvan
                  </Button>
                </div>

                <div className="neu-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Autora</TableHead>
                        <TableHead className="text-muted-foreground">Legenda</TableHead>
                        <TableHead className="text-muted-foreground">Fotos</TableHead>
                        <TableHead className="text-muted-foreground">Curtidas</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Data</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedPosts.map((p: any) => (
                        <TableRow key={p.id} className="border-border">
                          <TableCell className="text-foreground font-medium whitespace-nowrap">
                            {p.author?.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[280px] truncate">
                            {p.caption || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(p.image_urls || []).length}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.like_count}</TableCell>
                          <TableCell>
                            {p.is_pinned ? (
                              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-primary/20 text-primary inline-flex items-center gap-1">
                                <Pin size={10} /> Fixado
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => adminTogglePin(p)} title={p.is_pinned ? "Desafixar" : "Fixar"}>
                                <Pin size={14} className={p.is_pinned ? "text-primary fill-primary" : "text-muted-foreground"} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => adminDeletePost(p)}>
                                <Trash2 size={14} className="text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {feedPosts.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum post ainda</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <NewPostModal open={showNewPost} onOpenChange={setShowNewPost} onPosted={fetchFeed} />


      {/* ===== EXERCISE MODAL ===== */}
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
            <Button variant="outline" onClick={() => setShowExerciseModal(false)} className="border-border text-foreground">Cancelar</Button>
            <Button onClick={saveExercise} className="gold-gradient text-primary-foreground font-heading">{editingId ? "Atualizar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CRM DRAWER ===== */}
      <Sheet open={!!drawerStudent} onOpenChange={() => setDrawerStudent(null)}>
        <SheetContent className="bg-card border-border w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-primary text-xl">Perfil da Aluna</SheetTitle>
          </SheetHeader>

          {drawerStudent && (
            <div className="mt-6 space-y-6">
              {/* Section 1: Overview & Financial */}
              <div className="space-y-3">
                <h3 className="text-xs font-heading text-muted-foreground uppercase tracking-widest">Visão Geral & Financeiro</h3>
                <div className="neu-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-heading text-foreground">{drawerStudent.full_name || "Sem nome"}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusConfig[drawerStatus].color}`}>
                      {statusConfig[drawerStatus].label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{drawerStudent.email}</p>
                  {drawerStudent.whatsapp && <p className="text-sm text-muted-foreground">📱 {drawerStudent.whatsapp}</p>}
                  <p className="text-sm text-muted-foreground">
                    Cadastro: {drawerStudent.created_at ? new Date(drawerStudent.created_at).toLocaleDateString("pt-BR") : "—"}
                    {daysInApp > 0 && <span className="ml-2 text-primary font-semibold">• {daysInApp} {daysInApp === 1 ? "dia" : "dias"} no app</span>}
                  </p>
                </div>

                {/* Assinatura & Trial */}
                <div className="neu-card p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-heading text-muted-foreground uppercase tracking-widest">💳 Assinatura</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Tag label="Plano" value={planLabel} />
                    <Tag label="Assinante" value={drawerStudent.is_subscriber ? "Sim" : "Não"} />
                    {drawerStudent.canceled_at && (
                      <Tag label="Cancelada em" value={new Date(drawerStudent.canceled_at).toLocaleDateString("pt-BR")} />
                    )}
                  </div>
                  {trialStart && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Tag label="Trial início" value={trialStart.toLocaleDateString("pt-BR")} />
                      {trialEnd && <Tag label="Trial fim" value={trialEnd.toLocaleDateString("pt-BR")} />}
                      {trialDaysLeft !== null && drawerStatus === "trial" && (
                        <Tag label="Dias restantes" value={Math.max(0, trialDaysLeft)} />
                      )}
                    </div>
                  )}
                </div>

                {/* UTM / Aquisição */}
                <div className="neu-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={14} className="text-primary" />
                    <span className="text-xs font-heading text-muted-foreground uppercase tracking-widest">Origem da Aquisição</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Tag label="Source" value={drawerStudent.utm_source || "Orgânico"} />
                    {drawerStudent.utm_medium && <Tag label="Medium" value={drawerStudent.utm_medium} />}
                    {drawerStudent.utm_campaign && <Tag label="Campaign" value={drawerStudent.utm_campaign} />}
                    {drawerStudent.utm_content && <Tag label="Content" value={drawerStudent.utm_content} />}
                  </div>
                </div>
              </div>

              {/* Section 2: DNA da Leoa */}
              <div className="space-y-3">
                <h3 className="text-xs font-heading text-muted-foreground uppercase tracking-widest">🧬 DNA da Leoa (Quiz)</h3>
                <div className="neu-card p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {drawerStudent.goal && <Tag label="Objetivo" value={drawerStudent.goal} />}
                    {drawerStudent.target_area && <Tag label="Área Alvo" value={drawerStudent.target_area} />}
                    {drawerStudent.training_experience && <Tag label="Experiência" value={drawerStudent.training_experience} />}
                    <Tag label="Dias/semana" value={drawerStudent.workout_days || "—"} />
                    <Tag label="Duração" value={drawerStudent.workout_duration ? `${drawerStudent.workout_duration} min` : "—"} />
                  </div>

                  {drawerStudent.has_pain && drawerStudent.pain_location && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-2">
                      <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle size={14} /> Dores: {drawerStudent.pain_location}
                      </p>
                    </div>
                  )}

                  {drawerStudent.uses_medication && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle size={14} /> Usa medicação
                      </p>
                      {drawerStudent.medication_feeling && (
                        <p className="text-xs text-muted-foreground mt-1">"{drawerStudent.medication_feeling}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Engagement */}
              <div className="space-y-3">
                <h3 className="text-xs font-heading text-muted-foreground uppercase tracking-widest">📊 Engajamento & Evolução</h3>
                <div className="neu-card p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-2xl font-heading text-primary">{totalGenerated}</p>
                      <p className="text-xs text-muted-foreground">Treinos gerados (total)</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-2xl font-heading text-green-400">{totalCompleted}</p>
                      <p className="text-xs text-muted-foreground">Treinos concluídos (total)</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-lg font-heading text-foreground">{weekGenerated}/{weekCompleted}</p>
                      <p className="text-xs text-muted-foreground">Gerados / Concluídos (7d)</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-lg font-heading text-foreground">
                        {totalGenerated > 0 ? Math.round((totalCompleted / totalGenerated) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
                    </div>
                  </div>

                  <h4 className="text-xs text-muted-foreground uppercase mb-2">Evolução de Medidas</h4>
                  {drawerChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={drawerChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 22%)", borderRadius: "8px", fontSize: 11 }} />
                        <Line type="monotone" dataKey="peso" stroke="hsl(46 85% 55%)" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="cintura" stroke="hsl(0 71% 86%)" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="quadril" stroke="hsl(0 0% 70%)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma medida registrada</p>
                  )}
                </div>
              </div>

              {/* Section 4: Histórico de Treinos */}
              <div className="space-y-3">
                <h3 className="text-xs font-heading text-muted-foreground uppercase tracking-widest">🏋️ Histórico de Treinos</h3>
                <div className="neu-card p-4 max-h-96 overflow-y-auto">
                  {completedWorkouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum treino concluído ainda</p>
                  ) : (
                    <ul className="space-y-2">
                      {completedWorkouts.slice(0, 50).map((w: any) => {
                        const wj = w.workout_json || {};
                        const ts = wj.tracking_summary || {};
                        const title = wj.title || wj.name || "Treino";
                        const realDuration = ts.real_duration_min || ts.duration_min;
                        const exercisesCount = Array.isArray(wj.exercises) ? wj.exercises.length : (ts.exercises_count || null);
                        return (
                          <li key={w.id} className="bg-secondary rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground truncate">{title}</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(w.date).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                              {exercisesCount && <span>{exercisesCount} exercícios</span>}
                              {realDuration && <span>⏱ {Math.round(realDuration)} min</span>}
                              {w.feedback_effort && <span>RPE: {w.feedback_effort}</span>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {completedWorkouts.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Mostrando 50 de {completedWorkouts.length} treinos
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
};

// ─── Sub-components ───

function KpiCard({ icon: Icon, label, value, color, highlight, onClick }: {
  icon: any; label: string; value: string | number; color: string; highlight?: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`neu-card p-5 flex items-center gap-4 transition-shadow ${onClick ? "cursor-pointer hover:gold-glow" : ""} ${highlight ? "border border-primary/30 gold-glow" : ""}`}>
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-2xl font-heading text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-lg px-2.5 py-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}

function Pagination({ current, total, count, label, onPrev, onNext }: {
  current: number; total: number; count: number; label: string; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">{count} {label}{count !== 1 ? "s" : ""}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={current <= 1} onClick={onPrev} className="border-border text-foreground h-8 w-8 p-0">
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm text-muted-foreground">{current} / {total}</span>
        <Button variant="outline" size="sm" disabled={current >= total} onClick={onNext} className="border-border text-foreground h-8 w-8 p-0">
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export default Admin;
