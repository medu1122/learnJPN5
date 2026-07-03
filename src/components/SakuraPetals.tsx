import { useMemo } from 'react';

interface SakuraPetalsProps {
  count?: number;
}

export function SakuraPetals({ count = 25 }: SakuraPetalsProps) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 8 + Math.random() * 10,
        delay: Math.random() * 12,
        duration: 8 + Math.random() * 6,
        drift: -10 + Math.random() * 20,
        opacity: 0.4 + Math.random() * 0.5,
        rotate: Math.random() * 360,
      })),
    [count]
  );

  return (
    <div className="sakura-container" aria-hidden="true">
      {petals.map((p) => (
        <div
          key={p.id}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            opacity: p.opacity,
            transform: `rotate(${p.rotate}deg)`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
