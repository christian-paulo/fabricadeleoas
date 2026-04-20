import { useState } from "react";
import { Heart, MoreHorizontal, Pin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ImageCarousel from "@/components/feed/ImageCarousel";
import ShareButton from "@/components/feed/ShareButton";

export interface PostAuthor {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

export interface FeedPost {
  id: string;
  profile_id: string;
  caption: string;
  image_urls: string[];
  is_pinned: boolean;
  created_at: string;
  author: PostAuthor;
  like_count: number;
  liked_by_me: boolean;
}

interface Props {
  post: FeedPost;
  highlighted?: boolean;
  onChange: () => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function PostCard({ post, highlighted, onChange }: Props) {
  const { user, isAdmin } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.like_count);
  const [busyLike, setBusyLike] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isOwner = user?.id === post.profile_id;
  const canDelete = isOwner || isAdmin;
  const canPin = isAdmin;

  const truncated = post.caption.length > 120 && !expanded;
  const displayedCaption = truncated ? post.caption.slice(0, 120) + "…" : post.caption;

  const toggleLike = async () => {
    if (!user || busyLike) return;
    setBusyLike(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => c + (wasLiked ? -1 : 1));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("profile_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: post.id, profile_id: user.id });
        if (error) throw error;
        // Fire-and-forget push notification
        supabase.functions
          .invoke("notify-like", {
            body: { post_id: post.id, liker_profile_id: user.id },
          })
          .catch(() => {});
      }
    } catch (e: any) {
      // rollback
      setLiked(wasLiked);
      setCount((c) => c + (wasLiked ? 1 : -1));
      toast.error("Não foi possível curtir agora");
    } finally {
      setBusyLike(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    // Best-effort cleanup of images (only the owner; admin won't have storage perms outside admin)
    if (isOwner) {
      const paths = post.image_urls
        .map((u) => {
          const m = u.match(/post-images\/(.+)$/);
          return m ? m[1] : null;
        })
        .filter((p): p is string => !!p);
      if (paths.length) supabase.storage.from("post-images").remove(paths).catch(() => {});
    }
    toast.success("Post excluído");
    onChange();
  };

  const togglePin = async () => {
    if (!canPin) return;
    if (!post.is_pinned) {
      // Unpin all others first
      await supabase.from("posts").update({ is_pinned: false }).eq("is_pinned", true);
    }
    const { error } = await supabase
      .from("posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);
    if (error) {
      toast.error("Erro ao fixar");
      return;
    }
    toast.success(post.is_pinned ? "Post desafixado" : "Post fixado no topo");
    onChange();
  };

  return (
    <article
      id={`post-${post.id}`}
      className={`bg-card rounded-2xl shadow-sm overflow-hidden border transition-all ${
        highlighted ? "ring-2 ring-primary border-primary" : "border-border"
      }`}
    >
      <header className="flex items-center gap-3 p-4">
        {post.author.avatar_url ? (
          <img
            src={post.author.avatar_url}
            alt={post.author.full_name || ""}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full pink-gradient flex items-center justify-center text-primary-foreground font-bold">
            {(post.author.full_name || "L")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">
            {post.author.full_name || "Leoa"}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        {post.is_pinned && (
          <span className="text-xs font-bold bg-primary/15 text-primary px-2 py-1 rounded-full flex items-center gap-1">
            <Pin size={12} /> Fixado
          </span>
        )}
        {(canDelete || canPin) && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded-full hover:bg-secondary">
              <MoreHorizontal size={18} className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPin && (
                <DropdownMenuItem onClick={togglePin}>
                  <Pin size={14} className="mr-2" />
                  {post.is_pinned ? "Desafixar" : "Fixar no topo"}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 size={14} className="mr-2" /> Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {post.image_urls.length > 0 && <ImageCarousel images={post.image_urls} />}

      <div className="p-4 pt-3">
        <div className="flex items-center gap-5 mb-3">
          <button
            onClick={toggleLike}
            disabled={busyLike}
            aria-label={liked ? "Descurtir" : "Curtir"}
            className="flex items-center gap-1.5 transition-transform active:scale-90"
          >
            <Heart
              size={24}
              className={liked ? "text-primary fill-primary" : "text-muted-foreground"}
              strokeWidth={2}
            />
            <span className="text-sm font-bold text-foreground">{count}</span>
          </button>
          <ShareButton postId={post.id} caption={post.caption} />
        </div>
        {post.caption && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            <span className="font-bold mr-1">{post.author.full_name || "Leoa"}</span>
            {displayedCaption}
            {truncated && (
              <button
                onClick={() => setExpanded(true)}
                className="ml-1 text-muted-foreground"
              >
                ver mais
              </button>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
