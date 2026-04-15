import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BADGE_DEFINITIONS } from "@/lib/badges";

interface BadgeCelebrationModalProps {
  badgeKey: string | null;
  open: boolean;
  onClose: () => void;
}

const BadgeCelebrationModal = ({ badgeKey, open, onClose }: BadgeCelebrationModalProps) => {
  const navigate = useNavigate();
  const badge = BADGE_DEFINITIONS.find(b => b.key === badgeKey);

  if (!badge) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center rounded-3xl border border-border bg-background p-8">
        <div className="animate-scale-in">
          <div className="text-6xl mb-4">{badge.emoji}</div>
          <h2 className="text-xl font-heading text-foreground mb-2">{badge.name}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {badge.message}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                navigate("/evolucao");
              }}
              className="flex-1 h-12 rounded-2xl text-sm font-semibold"
            >
              Ver conquistas
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl pink-gradient text-primary-foreground font-heading text-sm shadow-lg"
            >
              Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeCelebrationModal;
