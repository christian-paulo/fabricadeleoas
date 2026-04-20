import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  alt?: string;
}

export default function ImageCarousel({ images, alt = "Post" }: Props) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) return null;

  const prev = () => setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="relative w-full aspect-square bg-secondary overflow-hidden">
      <img
        src={images[idx]}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center shadow"
          >
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <button
            onClick={next}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center shadow"
          >
            <ChevronRight size={20} className="text-foreground" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-primary" : "w-1.5 bg-background/70"
                }`}
              />
            ))}
          </div>
          <span className="absolute top-3 right-3 text-xs font-bold bg-background/80 text-foreground px-2 py-0.5 rounded-full">
            {idx + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}
