import { useRef, useState, useCallback, useEffect } from "react";

interface RulerSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  majorEvery?: number;
}

const RulerSlider = ({ min, max, value, onChange, unit, step = 1, majorEvery = 10 }: RulerSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const totalSteps = Math.floor((max - min) / step);
  
  const getValueFromPosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return value;
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  }, [min, max, step, value]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onChange(getValueFromPosition(e.clientX));
  }, [getValueFromPosition, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    onChange(getValueFromPosition(e.clientX));
  }, [getValueFromPosition, onChange]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const valueRatio = (value - min) / (max - min);

  // Generate tick marks
  const ticks: { pos: number; isMajor: boolean; label?: number }[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const v = min + i * step;
    const isMajor = (v - min) % majorEvery === 0;
    ticks.push({
      pos: i / totalSteps,
      isMajor,
      label: isMajor ? v : undefined,
    });
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Value display */}
      <div className="flex items-baseline justify-center mb-8">
        <span className="text-6xl font-bold text-foreground">{value}</span>
        <span className="text-2xl text-muted-foreground ml-1">{unit}</span>
      </div>

      {/* Ruler */}
      <div
        ref={containerRef}
        className="relative w-full h-20 cursor-pointer touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Tick marks */}
        <div className="absolute inset-x-0 top-0 h-12 flex items-start">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${tick.pos * 100}%`, transform: "translateX(-50%)" }}
            >
              <div
                className={`w-px ${tick.isMajor ? "h-8 bg-muted-foreground/60" : "h-4 bg-muted-foreground/30"}`}
              />
            </div>
          ))}
        </div>

        {/* Labels below ticks */}
        <div className="absolute inset-x-0 top-14">
          {ticks.filter(t => t.label !== undefined).map((tick, i) => (
            <span
              key={i}
              className="absolute text-sm text-muted-foreground transform -translate-x-1/2"
              style={{ left: `${tick.pos * 100}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Indicator triangle */}
        <div
          className="absolute top-0 flex flex-col items-center z-10 pointer-events-none"
          style={{ left: `${valueRatio * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-0.5 h-10 bg-primary" />
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-primary mt-0" />
        </div>
      </div>

      {/* Drag hint line */}
      <div className="w-full h-px bg-primary/40 mt-2" />
      <p className="text-sm text-muted-foreground/60 mt-2">Arraste para ajustar</p>
    </div>
  );
};

export default RulerSlider;
