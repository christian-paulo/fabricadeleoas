import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PostCard, { FeedPost } from "@/components/PostCard";
import NewPostModal from "@/components/NewPostModal";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function Feed() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const focusPostId = params.get("post");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data: rawPosts, error } = await supabase
      .from("posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) {
      toast.error("Erro ao carregar feed");
      setLoading(false);
      return;
    }
    if (!rawPosts || rawPosts.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const profileIds = [...new Set(rawPosts.map((p) => p.profile_id))];
    const postIds = rawPosts.map((p) => p.id);

    const [{ data: profs }, { data: likes }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", profileIds),
      supabase.from("post_likes").select("post_id, profile_id").in("post_id", postIds),
    ]);

    // Avatars (best-effort, list each user's folder)
    const avatarMap = new Map<string, string>();
    await Promise.all(
      profileIds.map(async (pid) => {
        const { data } = await supabase.storage
          .from("avatars")
          .list(pid, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
        if (data && data[0]) {
          const { data: u } = supabase.storage
            .from("avatars")
            .getPublicUrl(`${pid}/${data[0].name}`);
          avatarMap.set(pid, u.publicUrl);
        }
      })
    );

    const profMap = new Map<string, { full_name: string | null }>();
    (profs || []).forEach((p) => profMap.set(p.id, { full_name: p.full_name }));

    const likeCounts = new Map<string, number>();
    const likedByMe = new Set<string>();
    (likes || []).forEach((l) => {
      likeCounts.set(l.post_id, (likeCounts.get(l.post_id) || 0) + 1);
      if (user && l.profile_id === user.id) likedByMe.add(l.post_id);
    });

    setPosts(
      rawPosts.map((p) => ({
        id: p.id,
        profile_id: p.profile_id,
        caption: p.caption || "",
        image_urls: p.image_urls || [],
        is_pinned: p.is_pinned,
        created_at: p.created_at,
        author: {
          id: p.profile_id,
          full_name: profMap.get(p.profile_id)?.full_name || "Leoa",
          avatar_url: avatarMap.get(p.profile_id) || null,
        },
        like_count: likeCounts.get(p.id) || 0,
        liked_by_me: likedByMe.has(p.id),
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Focus on shared post (deep link or hash)
  useEffect(() => {
    if (loading) return;
    const targetId =
      focusPostId ||
      (typeof window !== "undefined" && window.location.hash.startsWith("#post-")
        ? window.location.hash.replace("#post-", "")
        : null);
    if (!targetId) return;

    const exists = posts.some((p) => p.id === targetId);
    if (!exists) {
      toast("Esse post não está mais disponível");
      return;
    }
    setTimeout(() => {
      const el = document.getElementById(`post-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightId(targetId);
        setTimeout(() => setHighlightId(null), 2200);
      }
    }, 200);
  }, [loading, posts, focusPostId]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl text-foreground uppercase">Alcateia</h1>
          <p className="text-sm text-muted-foreground">Compartilhe seu treino 🦁</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl h-96 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-6xl mb-3">🦁</p>
          <p className="font-heading text-foreground text-lg mb-1">A alcateia está silenciosa</p>
          <p className="text-sm text-muted-foreground">
            Seja a primeira a compartilhar seu treino!
          </p>
        </div>
      ) : (
        <div className="space-y-5 pb-24">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              highlighted={highlightId === p.id}
              onChange={fetchPosts}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        aria-label="Novo post"
        className="fixed right-5 bottom-24 z-40 w-14 h-14 rounded-full pink-gradient shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Plus size={28} className="text-primary-foreground" />
      </button>

      <NewPostModal open={showModal} onOpenChange={setShowModal} onPosted={fetchPosts} />
    </AppLayout>
  );
}
