import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPosted: () => void;
}

const MAX_IMAGES = 4;
const MAX_DIM = 1080;

async function compressImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas error");
  ctx.drawImage(img, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress fail"))), "image/jpeg", 0.85)
  );
}

export default function NewPostModal({ open, onOpenChange, onPosted }: Props) {
  const { user, isAdmin } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [caption, setCaption] = useState("");
  const [pinOnTop, setPinOnTop] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setCaption("");
    setPinOnTop(false);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    const remaining = MAX_IMAGES - files.length;
    const accepted = list.slice(0, remaining);
    if (list.length > remaining) {
      toast.error(`Máximo ${MAX_IMAGES} fotos`);
    }
    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async () => {
    if (!user) return;
    if (!caption.trim() && files.length === 0) {
      toast.error("Adicione uma foto ou legenda");
      return;
    }
    setSubmitting(true);
    try {
      const urls: string[] = [];
      for (const { file } of files) {
        const blob = await compressImage(file);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("post-images")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }

      const { data: inserted, error } = await supabase
        .from("posts")
        .insert({
          profile_id: user.id,
          caption: caption.trim().slice(0, 500),
          image_urls: urls,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Admin pin: unpin others, then pin this one
      if (isAdmin && pinOnTop && inserted) {
        await supabase.from("posts").update({ is_pinned: false }).eq("is_pinned", true);
        await supabase.from("posts").update({ is_pinned: true }).eq("id", inserted.id);
      }

      toast.success("Post publicado! 🦁");
      reset();
      onOpenChange(false);
      onPosted();
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary font-heading">Novo post</DialogTitle>
        </DialogHeader>

        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 500))}
          placeholder="Compartilhe seu treino, conquista, sentimento... 🦁"
          className="min-h-[100px] resize-none"
        />
        <p className="text-xs text-muted-foreground -mt-2 text-right">
          {caption.length}/500
        </p>

        {files.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/90 flex items-center justify-center shadow"
                  aria-label="Remover foto"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length < MAX_IMAGES && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <ImagePlus size={20} />
            <span className="text-sm font-semibold">
              Adicionar fotos ({files.length}/{MAX_IMAGES})
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />

        {isAdmin && (
          <div className="flex items-center justify-between bg-secondary rounded-xl p-3">
            <Label htmlFor="pin-top" className="text-sm font-bold cursor-pointer">
              📌 Fixar no topo do feed
            </Label>
            <Switch id="pin-top" checked={pinOnTop} onCheckedChange={setPinOnTop} />
          </div>
        )}

        <Button
          onClick={submit}
          disabled={submitting}
          className="w-full pink-gradient text-primary-foreground font-heading h-12 rounded-2xl"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} /> Publicando...
            </>
          ) : (
            "Publicar"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
