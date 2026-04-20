import { useState } from "react";
import { Share2, Link as LinkIcon, MessageCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface Props {
  postId: string;
  caption?: string;
}

const SHARE_BASE = "https://fabricadeleoas.online/feed";

export default function ShareButton({ postId, caption = "" }: Props) {
  const [open, setOpen] = useState(false);
  const url = `${SHARE_BASE}?post=${postId}`;
  const text =
    (caption.slice(0, 80) + (caption.length > 80 ? "…" : "")) +
    " — veja no app Fábrica de Leoas 🦁";

  const handleClick = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Fábrica de Leoas 🦁",
          text,
          url,
        });
        return;
      } catch {
        // user cancelled or failed; fall through to popover
      }
    }
    setOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
    setOpen(false);
  };

  const shareWhats = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      "_blank"
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleClick}
          aria-label="Compartilhar post"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 size={22} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <button
          onClick={shareWhats}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm"
        >
          <MessageCircle size={16} className="text-primary" /> WhatsApp
        </button>
        <button
          onClick={copyLink}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm"
        >
          <LinkIcon size={16} className="text-primary" /> Copiar link
        </button>
      </PopoverContent>
    </Popover>
  );
}
